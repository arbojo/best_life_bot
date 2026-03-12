require('dotenv').config();
require('./autosave');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const express = require('express');
const path = require('path');
const fs = require('fs');

// --- Configuración ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

const userContexts = new Map();
let botMode = 1; // 0 = Modo Aprendizaje (Silencio + Registro de tus ventas), 1 = Producción (Mia responde)
// --- Funciones de Base de Datos ---
async function getCatalogoSupabase() {
    try {
        // Consultas separadas para evitar errores de relación
        const { data: productos, error: pError } = await supabase.from('productos').select('*').eq('active', true);
        if (pError) throw pError;

        const { data: precios, error: prError } = await supabase.from('productos_precios').select('*');
        if (prError) console.warn('⚠️ Error al cargar precios:', prError.message);

        const { data: variantes, error: vError } = await supabase.from('productos_variantes').select('*');
        if (vError) console.warn('⚠️ Error al cargar variantes:', vError.message);

        // Unión manual en JS
        return productos.map(p => ({
            ...p,
            productos_precios: precios ? precios.filter(pr => pr.producto_id === p.id) : [],
            productos_variantes: variantes ? variantes.filter(v => v.producto_id === p.id) : []
        }));
    } catch (err) {
        console.error('❌ Error Supabase:', err.message);
        return [];
    }
}

async function guardarLogVenta(cliente_tel, mensaje, respuesta) {
    try {
        await supabase.from('logs_ventas').insert([{ cliente_tel, mensaje, respuesta }]);
    } catch (err) {
        console.error('❌ Excepción al guardar log:', err.message);
    }
}

async function getContextoCliente(telefono) {
    try {
        await supabase.from('clientes').upsert({ telefono }, { onConflict: 'telefono' });
        const { data: cliente } = await supabase.from('clientes').select('*').eq('telefono', telefono).single();
        const { data: memoria } = await supabase.from('memoria_ia').select('*').eq('cliente_tel', telefono).order('timestamp', { ascending: false }).limit(3);
        const { data: logs } = await supabase.from('logs_ventas').select('mensaje, respuesta').eq('cliente_tel', telefono).order('timestamp', { ascending: false }).limit(3);

        let contexto = "";
        if (cliente && cliente.nombre) contexto += `Nombre del cliente: ${cliente.nombre}. `;
        if (cliente && cliente.compras_previas > 0) contexto += `Ya nos ha comprado ${cliente.compras_previas} veces. `;
        if (memoria && memoria.length > 0) {
            contexto += "Lo que sabemos: ";
            memoria.forEach(m => {
                if (m.gustos) contexto += `Le gusta: ${m.gustos}. `;
                if (m.objeciones) contexto += `Objeciones: ${m.objeciones}. `;
            });
        }
        if (logs && logs.length > 0) {
            contexto += "Últimas interacciones: " + logs.map(l => `C: ${l.mensaje} | R: ${l.respuesta}`).join(' // ');
        }
        return contexto || "Es un cliente nuevo.";
    } catch (err) { return "Error al cargar contexto."; }
}

async function registrarMemoria(telefono, gustos, objeciones) {
    if (!gustos && !objeciones) return;
    await supabase.from('memoria_ia').insert([{ cliente_tel: telefono, gustos, objeciones }]);
}

async function registrarPedido(telefono, envio, productos, total) {
    try {
        await supabase.from('clientes').upsert([{ telefono, ultima_consulta: new Date().toISOString() }], { onConflict: 'telefono' });
        const { error } = await supabase.from('pedidos').insert([{ 
            cliente_tel: telefono, detalles_envio: envio, productos, total: parseFloat(total) || 0, estado: 'ESPERANDO_PAGO'
        }]);
        if (error) throw error;
        return true;
    } catch (err) { return false; }
}

async function getBotConfig() {
    try {
        const { data } = await supabase.from('configuracion').select('*');
        const config = {};
        data?.forEach(item => { config[item.clave] = item.valor; });
        return config;
    } catch (err) { return {}; }
}

// --- Dashboard API ---
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'dashboard.html')));
app.get('/api/products', async (req, res) => {
    try {
        const { data: productos } = await supabase.from('productos').select('*').order('id', { ascending: false });
        const { data: precios } = await supabase.from('productos_precios').select('*');
        
        const merged = (productos || []).map(p => ({
            ...p,
            productos_precios: (precios || []).filter(pr => pr.producto_id === p.id)
        }));
        res.json(merged);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/products', async (req, res) => {
    const { data, error } = await supabase.from('productos').insert([req.body]).select();
    if (error) {
        console.error('❌ Error al crear producto:', error.message);
        return res.status(400).json(error);
    }
    res.json(data[0]);
});

app.put('/api/products/:id', async (req, res) => {
    const { data, error } = await supabase.from('productos').update(req.body).eq('id', req.params.id).select();
    if (error) {
        console.error('❌ Error al actualizar producto:', error.message);
        return res.status(400).json(error);
    }
    res.json(data[0]);
});
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        const fileName = `${Date.now()}-${req.file.originalname}`;
        await supabase.storage.from('productos').upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
        const { data } = supabase.storage.from('productos').getPublicUrl(fileName);
        res.json({ url: data.publicUrl });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// CRM Endpoints
app.get('/api/pedidos', async (req, res) => {
    const { data } = await supabase.from('pedidos').select('*').order('timestamp', { ascending: false });
    res.json(data || []);
});

app.get('/api/interactions', async (req, res) => {
    const { tel } = req.query;
    let q = supabase.from('logs_ventas').select('*').order('timestamp', { ascending: false }).limit(50);
    if (tel) q = q.ilike('cliente_tel', `%${tel}%`);
    const { data } = await q;
    res.json(data || []);
});

app.get('/api/bot/config', async (req, res) => res.json(await getBotConfig()));

app.post('/api/bot/config', async (req, res) => {
    try {
        const body = req.body;
        const promises = Object.entries(body).map(([clave, valor]) => 
            supabase.from('configuracion').upsert({ clave, valor: String(valor) }, { onConflict: 'clave' })
        );
        await Promise.all(promises);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/clientes', async (req, res) => {
    const { data } = await supabase.from('clientes').select('*, memoria_ia(*)').order('ultima_consulta', { ascending: false });
    res.json(data || []);
});

app.post('/api/products/:id/prices', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from('productos_precios').insert([{ ...req.body, producto_id: id }]);
    if (error) return res.status(400).json(error);
    res.json(data);
});

app.delete('/api/products/:id/prices', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('productos_precios').delete().eq('producto_id', id);
    if (error) return res.status(400).json(error);
    res.json({ success: true });
});

app.post('/api/products/:id/variants', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from('productos_variantes').insert([{ ...req.body, producto_id: id }]);
    if (error) return res.status(400).json(error);
    res.json(data);
});

app.delete('/api/products/:id/variants', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('productos_variantes').delete().eq('producto_id', id);
    if (error) return res.status(400).json(error);
    res.json({ success: true });
});

// --- Core Logic ---
async function procesarMensaje(mensaje, telefono) {
    try {
        // Obtenemos el registro para checar si ya pasaron las 12 horas
        const { data: clienteRecord } = await supabase.from('clientes').select('estado_seguimiento').eq('telefono', telefono).single();
        const appliesRecovery = clienteRecord && clienteRecord.estado_seguimiento === 'RECUPERACION_ENVIADA';

        const catalogo = await getCatalogoSupabase();
        const contextoCliente = await getContextoCliente(telefono);
        const config = await getBotConfig();
        const horaStr = new Date().toLocaleString('en-US', {timeZone: 'America/Mexico_City', hour: 'numeric', hour12: false});
        const ganchoEnvio = parseInt(horaStr) < 16 ? "HOY MISMO" : "MAÑANA";
        
        const listadoProductos = catalogo.map(p => {
            let preciosFiltrados = p.productos_precios || [];
            // Ocultamos a Mia los precios Recovery si no se ha enviado el seguimiento de 12 Hrs
            if (!appliesRecovery) {
                preciosFiltrados = preciosFiltrados.filter(pr => !pr.etiqueta.toLowerCase().includes('recovery'));
            }
            const allPrices = preciosFiltrados.map(pr => `${pr.etiqueta}: $${pr.precio} (min ${pr.min_unidades} pzas)`).join(', ');
            let pInfo = `*${p.nombre}* (${p.categoria || 'aparato'}):\n  - PRECIOS: ${allPrices}`;
            
            if (p.categoria === 'prenda' && p.productos_variantes && p.productos_variantes.length > 0) {
                const vars = p.productos_variantes.map(v => `${v.nombre} (${v.stock > 0 ? `${v.stock} disponibles` : 'AGOTADO'})`).join(', ');
                pInfo += `\n  - STOCK DETALLADO: ${vars}`;
            }

            if (p.beneficio_principal) pInfo += `\n  - Beneficio: ${p.beneficio_principal}`;
            if (p.modo_uso) pInfo += `\n  - Uso: ${p.modo_uso}`;
            if (p.manejo_objeciones) pInfo += `\n  - MANEJO DE OBJECIONES: ${p.manejo_objeciones}`;
            if (p.hacks_expertos) pInfo += `\n  - HACK DEL EXPERTO: ${p.hacks_expertos}`;
            if (p.variantes_disponibles) pInfo += `\n  - Guía Variantes: ${p.variantes_disponibles}`;
            if (p.reglas_especiales) pInfo += `\n  - REGLAS DE VENTA: ${p.reglas_especiales}`;
            return pInfo;
        }).join('\n\n');
        
        console.log("-----------------------------------------");
        console.log("PROMPT PRODUCTS LOG:");
        console.log(listadoProductos);
        console.log("-----------------------------------------");
        const sistemaPrompt = `Eres Mía, agente de ventas estrella por WhatsApp. RESPONDERÁS SIEMPRE EN FORMATO JSON.

BASE OFICIAL INQUEBRANTABLE (No inventar ni mezclar):

CLEAN NAILS 👣
- Normal: 1 x $449, 2 x $599
- Recovery (-10%): 1 x $404.10, 2 x $539.10
- Path: "clean-nails/main.jpg" | Beneficios: Elimina hongos día 5, Sin dolor, Garantizado.

NEUROFEET 🦵
- Normal: 3 x $449, 5 x $599
- Recovery (-10%): 3 x $404.10, 5 x $539.10
- Path: "neurofeet/main.jpg" | Beneficios: Alivio instantáneo, Mejora circulación, No transparenta.

CLOUD PET 🐾
- Normal: 1 x $349, 2 x $499
- Recovery (-10%): 1 x $314.10, 2 x $449.10
- Path: "cloud-pet/main.jpg" | Beneficios: Quita pelo muerto, Vapor frío relajante, Carga USB.

REGLAS DE ORO:
1. Habla siempre breve, amable y como mujer (25-35 años).
2. Si no es recuperación/seguimiento, usa Precios Normales.
3. Si han pasado 12h o es seguimiento, usa Precios Recovery.
4. Formato de respuesta: Menciona el precio PRIMERO, luego invita al pedido.
5. REGLAS DE PUBLICIDAD: Cuando des precios o información detallada, usa Formato de Anuncio:
   - Nombre Producto
   - 🔥 PROMOCIÓN 🔥
   - Precios oficiales
   - Beneficios cortos con viñetas (✨, ✅, 🏆)
   - Cierre con envío gratis, pago contra entrega y CTA.

ESTRUCTURA DE SALIDA (JSON OBLIGATORIO):
{
  "intent": "precio|pedido|duda",
  "reply_to_customer": "Tu mensaje de WhatsApp (caption si hay imagen)...",
  "structured_data": { "producto": "...", "cantidad": 0, "total": 0, "nombre_cliente": "...", "direccion": "..." },
  "media": {
    "use_product_image": true,
    "image_source": "supabase_bucket",
    "image_bucket": "productos",
    "image_path": "ruta/del/producto/main.jpg",
    "caption_format": "whatsapp_product_promo"
  }
}

CONTEXTO DINÁMICO:
${contextoCliente}
${ganchoEnvio} es la fecha de entrega sugerida.`;

        if (!userContexts.has(telefono)) {
            const { data: logs } = await supabase.from('logs_ventas')
                .select('mensaje, respuesta')
                .eq('cliente_tel', telefono)
                .order('timestamp', { ascending: false })
                .limit(5);

            const h = [{ role: 'system', content: sistemaPrompt }];
            if (logs && logs.length > 0) {
                logs.reverse().forEach(l => {
                    h.push({ role: 'user', content: l.mensaje });
                    h.push({ role: 'assistant', content: l.respuesta });
                });
            }
            userContexts.set(telefono, h);
        }
        
        let history = userContexts.get(telefono);
        history[0].content = sistemaPrompt;
        history.push({ role: 'user', content: mensaje });

        let messagesToSend;
        if (history.length > 20) {
            messagesToSend = [history[0], ...history.slice(-19)];
        } else {
            messagesToSend = history;
        }

        const response = await openai.chat.completions.create({ 
            model: 'gpt-4o', 
            messages: messagesToSend, 
            temperature: 0.5,
            response_format: { type: "json_object" }
        });
        const reply = response.choices[0].message.content;
        
        history.push({ role: 'assistant', content: reply });
        if (history.length > 20) history.splice(1, 2);

        return reply;
    } catch (err) { 
        console.error("Error en procesarMensaje:", err.message);
        return JSON.stringify({ reply_to_customer: "Dime, ¿en qué producto te gustaría información? 😊", media: { use_product_image: false } }); 
    }
}

// --- WhatsApp Client ---
const waClient = new Client({ authStrategy: new LocalAuth(), puppeteer: { headless: true, args: ['--no-sandbox'] } });
waClient.on('qr', qr => {
    console.log('⚠️ [WWS] Sesión no iniciada. Escanea el código QR:');
    qrcode.generate(qr, { small: true });
});

waClient.on('ready', () => {
    console.log('✅ Bot Online y Listo para WhatsApp');
});

waClient.on('auth_failure', msg => console.error('❌ [WWS] Error de Autenticación:', msg));
waClient.on('disconnected', reason => console.warn('⚠️ [WWS] Sesión Cerrada:', reason));
waClient.on('loading_screen', (percent, message) => console.log('⏳ [WWS] Cargando:', percent + '%', message));

waClient.on('message', async (msg) => {
    if (msg.isStatus) return;
    
    // Comando de Reinicio para Pruebas (Oculto)
    if (msg.body.trim().toUpperCase() === 'RESET') {
        userContexts.delete(msg.from);
        await supabase.from('clientes').update({ estado_seguimiento: null, ultima_interaccion_tipo: null }).eq('telefono', msg.from);
        await supabase.from('logs_ventas').delete().eq('cliente_tel', msg.from);
        await supabase.from('memoria_ia').delete().eq('cliente_tel', msg.from);
        await supabase.from('pedidos').delete().eq('cliente_tel', msg.from);
        await msg.reply("🔄 *Sistema y Memoria Histórica Reiniciados.*");
        return;
    }

    // Autorización humana desde el grupo "Ventas"
    if (msg.body.trim().toLowerCase().startsWith('enterado') && (msg.from.includes('@g.us') || msg.author)) {
        const partes = msg.body.trim().split(' ');
        if (partes.length >= 2) {
            const numeroTarget = partes[1].replace(/\D/g, ''); 
            try {
                const { data: pedido } = await supabase.from('pedidos')
                    .select('*')
                    .ilike('detalles_envio', `%${numeroTarget}%`)
                    .match({ estado: 'ESPERANDO_CONFIRMACION' })
                    .order('timestamp', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (pedido) {
                    await supabase.from('pedidos').update({ estado: 'ESPERANDO_PAGO' }).eq('id', pedido.id);
                    await supabase.from('clientes').update({ estado_seguimiento: 'CERRADO' }).eq('telefono', pedido.cliente_tel);
                    const msjConfirmacion = `✅ *¡Tu pedido ha sido confirmado!* 🎉\n\n📦 *Producto:* ${pedido.productos}\n📍 *Envío a:* ${pedido.detalles_envio.split(' | Pago:')[0]}\n🚚 *Entrega:* ${pedido.detalles_envio.includes('Entrega:') ? pedido.detalles_envio.split('Entrega:')[1].trim() : 'A coordinar'}\n💵 *Monto a pagar:* $${pedido.total}\n💳 *Formas de pago:* Efectivo, Tarjeta en terminal o Transferencia\n\n¡Muchísimas gracias por tu compra!`;
                    await waClient.sendMessage(pedido.cliente_tel, msjConfirmacion);
                    await msg.reply(`✅ Enterado. Confirmación enviada.`);
                }
            } catch (err) { console.error("Error en autorización:", err); }
        }
        return;
    }
    
    // Ignoramos todos los demás mensajes que sucedan en grupos
    if (msg.from.includes('@g.us')) return;

    // --- PROCESAMIENTO IA ---
    const replyRaw = await procesarMensaje(msg.body, msg.from);
    let ai;
    try {
        // Limpiamos Markdown si la IA lo mete por error
        const cleanJson = replyRaw.replace(/```json/g, '').replace(/```/g, '').trim();
        ai = JSON.parse(cleanJson);
    } catch (e) {
        console.error("❌ Error parseando JSON de IA:", e.message, "Raw:", replyRaw);
        ai = { reply_to_customer: replyRaw, media: { use_product_image: false } };
    }
    
    if (botMode === 1) {
        let imageSent = false;

        // 1. Manejo de Media (Imagen de Supabase)
        if (ai.media && ai.media.use_product_image && ai.media.image_path) {
            const catalogo = await getCatalogoSupabase();
            // Buscamos el producto que coincida con la ruta o el nombre
            const prod = catalogo.find(p => p.imagen_url && p.imagen_url.includes(ai.media.image_path.split('/').pop()));
            
            if (prod && prod.imagen_url) {
                try {
                    const media = await MessageMedia.fromUrl(prod.imagen_url);
                    await waClient.sendMessage(msg.from, media, { caption: ai.reply_to_customer });
                    imageSent = true;
                } catch (e) { console.error("❌ Error mandando foto:", e.message); }
            }
        }

        // 2. Enviar respuesta de texto (si no fue caption o si la foto falló)
        if (!imageSent && ai.reply_to_customer) {
            await msg.reply(ai.reply_to_customer);
        }
        
        // 3. Registro y Actualización de Cliente
        await guardarLogVenta(msg.from, msg.body, ai.reply_to_customer);
        await supabase.from('clientes').upsert({ telefono: msg.from, ultima_consulta: new Date().toISOString(), ultima_interaccion_tipo: 'BOT' }, { onConflict: 'telefono' });

        // 4. Manejo de Pedidos Estructurados
        if (ai.intent === 'pedido' && ai.structured_data && ai.structured_data.producto && ai.structured_data.total > 0) {
            const d = ai.structured_data;
            const entrega = new Date().getHours() < 16 ? 'Hoy mismo' : 'Mañana';
            const envioDetalle = `${d.nombre_cliente || 'Cliente'} | ${msg.from} | ${d.direccion || 'No especificada'} | Pago: Pendiente | Entrega: ${entrega}`;
            const productoDetalle = `${d.cantidad || 1}x ${d.producto}`;

            const { data: newOrder } = await supabase.from('pedidos').insert([{ 
                cliente_tel: msg.from, detalles_envio: envioDetalle, productos: productoDetalle, total: d.total, estado: 'ESPERANDO_CONFIRMACION'
            }]).select().single();

            if (newOrder) {
                await supabase.from('clientes').update({ estado_seguimiento: 'ESPERANDO_CONFIRMACION' }).eq('telefono', msg.from);
                
                // Alerta al Grupo Ventas
                try {
                    const chats = await waClient.getChats();
                    const grupoVentas = chats.find(c => c.isGroup && c.name.toLowerCase() === 'ventas');
                    if (grupoVentas) {
                        const numLimpio = msg.from.replace(/\D/g, '');
                        const alerta = `🚨 *NUEVO PEDIDO PENDIENTE* 🚨\n👤 *Cliente:* ${d.nombre_cliente || 'Desconocido'}\n📱 *Celular:* ${numLimpio}\n📦 *Producto:* ${productoDetalle}\n💰 *Total:* $${d.total}\n👉 *Autorizar:* responder 'enterado ${numLimpio}'`;
                        await grupoVentas.sendMessage(alerta);
                    }
                } catch(e) { console.error("❌ Error notificar grupo:", e.message); }
            }
        }
    }

    // --- MODO APRENDIZAJE: Registrar tus respuestas manuales ---
    if (msg.fromMe && botMode === 0) {
        try {
            await supabase.from('logs_ventas').insert([{ 
                cliente_tel: msg.to, mensaje: "[RESPUESTA MANUAL]", respuesta: msg.body 
            }]);
        } catch (e) { console.error("❌ Error Aprendizaje:", e.message); }
    }
});

// --- Seguimiento Automático ---
async function ejecutarSeguimiento() {
    if (botMode === 0) return; // Silencio total en modo aprendizaje
    const config = await getBotConfig();
    if (String(config.bot_seguimiento_activo) !== 'true') return;
    
    const ahora = new Date();
    const seisH = new Date(ahora - 6 * 60 * 60 * 1000).toISOString();
    const { data: r6 } = await supabase.from('clientes').select('*').eq('estado_seguimiento', 'INTERESADO').eq('ultima_interaccion_tipo', 'CLIENTE').lt('ultima_consulta', seisH);
    for (const c of r6 || []) {
        await waClient.sendMessage(c.telefono, "¡Hola! 🌸 ¿Te quedó alguna duda sobre tu producto? ¡Quedo atenta para agendarte! 😊");
        await supabase.from('clientes').update({ estado_seguimiento: 'RECORDATORIO_ENVIADO', ultima_consulta: new Date().toISOString(), ultima_interaccion_tipo: 'BOT' }).eq('telefono', c.telefono);
    }

    const doceH = new Date(ahora - 12 * 60 * 60 * 1000).toISOString();
    const { data: r12 } = await supabase.from('clientes').select('*').eq('estado_seguimiento', 'RECORDATORIO_ENVIADO').eq('ultima_interaccion_tipo', 'BOT').lt('ultima_consulta', doceH);
    for (const c of r12 || []) {
        await waClient.sendMessage(c.telefono, "¡Hola de nuevo! ✨ Me autorizaron un **10% de DESCUENTO** si pides ahorita. 💸 ¿Te animas? 🚀");
        await supabase.from('clientes').update({ estado_seguimiento: 'RECUPERACION_ENVIADA', ultima_consulta: new Date().toISOString(), ultima_interaccion_tipo: 'BOT' }).eq('telefono', c.telefono);
    }
}
setInterval(ejecutarSeguimiento, 10 * 60 * 1000);

app.listen(PORT, () => console.log(`🚀 Puerto ${PORT}`));
waClient.initialize();
