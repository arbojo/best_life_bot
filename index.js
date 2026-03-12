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
const sessionManager = require('./sessionManager');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

let botMode = 1; // 0 = Modo Aprendizaje (Silencio + Registro de tus ventas), 1 = Producción (Mia responde)
// --- Funciones de Base de Datos ---
async function getCatalogoSupabase() {
    try {
        const { data: productos, error: pError } = await supabase.from('new_products').select('*').eq('is_active', true);
        if (pError) throw pError;

        const { data: precios, error: prError } = await supabase.from('product_prices').select('*');
        if (prError) console.warn('⚠️ Error al cargar precios:', prError.message);

        const { data: variantes, error: vError } = await supabase.from('product_variants').select('*');
        if (vError) console.warn('⚠️ Error al cargar variantes:', vError.message);

        const { data: media, error: mError } = await supabase.from('product_media').select('*');
        if (mError) console.warn('⚠️ Error al cargar media:', mError.message);

        return productos.map(p => ({
            ...p,
            product_prices: precios ? precios.filter(pr => pr.product_id === p.id) : [],
            product_variants: variantes ? variantes.filter(v => v.product_id === p.id) : [],
            product_media: media ? media.filter(m => m.product_id === p.id) : []
        }));
    } catch (err) {
        console.error('❌ Error Supabase:', err.message);
        return [];
    }
}

async function guardarLogVenta(customer_phone, message, response) {
    try {
        await supabase.from('chat_logs').insert([{ customer_phone, message, response }]);
    } catch (err) {
        console.error('❌ Excepción al guardar log:', err.message);
    }
}

async function getContextoCliente(phone) {
    try {
        await supabase.from('customers').upsert({ phone }, { onConflict: 'phone' });
        const { data: customer } = await supabase.from('customers').select('*').eq('phone', phone).single();
        const { data: logs } = await supabase.from('chat_logs').select('message, response').eq('customer_phone', phone).order('created_at', { ascending: false }).limit(6);

        let contexto = "";
        if (customer && customer.full_name) contexto += `Nombre del cliente: ${customer.full_name}. `;
        if (customer && customer.purchases_count > 0) contexto += `Ya nos ha comprado ${customer.purchases_count} veces. `;
        
        if (logs && logs.length > 0) {
            contexto += "Últimas interacciones: " + logs.map(l => `C: ${l.message} | R: ${l.response}`).join(' // ');
        }
        return contexto || "Es un cliente nuevo.";
    } catch (err) { return "Error al cargar contexto."; }
}

async function registrarMemoria(telefono, gustos, objeciones) {
    if (!gustos && !objeciones) return;
    await supabase.from('memoria_ia').insert([{ cliente_tel: telefono, gustos, objeciones }]);
}

async function registrarPedido(phone, shipping_details, items_summary, total_amount) {
    try {
        await supabase.from('customers').upsert([{ phone, last_interaction_at: new Date().toISOString() }], { onConflict: 'phone' });
        const { error } = await supabase.from('new_orders').insert([{ 
            customer_phone: phone, shipping_details, items_summary, total_amount: parseFloat(total_amount) || 0, status: 'WAITING_PAYMENT'
        }]);
        if (error) throw error;
        return true;
    } catch (err) { return false; }
}

async function getBotConfig() {
    try {
        const { data } = await supabase.from('system_settings').select('*');
        const config = {};
        data?.forEach(item => { config[item.key] = item.value; });
        return config;
    } catch (err) { return {}; }
}

// --- Dashboard API ---
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'dashboard.html')));
app.get('/api/products', async (req, res) => {
    try {
        const { data: productos } = await supabase.from('new_products').select('*').order('created_at', { ascending: false });
        const { data: precios } = await supabase.from('product_prices').select('*');
        
        const merged = (productos || []).map(p => ({
            ...p,
            product_prices: (precios || []).filter(pr => pr.product_id === p.id)
        }));
        res.json(merged);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/products', async (req, res) => {
    const { data, error } = await supabase.from('new_products').insert([req.body]).select();
    if (error) {
        console.error('❌ Error al crear producto:', error.message);
        return res.status(400).json(error);
    }
    res.json(data[0]);
});

app.put('/api/products/:id', async (req, res) => {
    const { data, error } = await supabase.from('new_products').update(req.body).eq('id', req.params.id).select();
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
    const { data } = await supabase.from('new_orders').select('*').order('created_at', { ascending: false });
    res.json(data || []);
});

app.get('/api/interactions', async (req, res) => {
    const { tel } = req.query;
    let q = supabase.from('chat_logs').select('*').order('created_at', { ascending: false }).limit(50);
    if (tel) q = q.ilike('customer_phone', `%${tel}%`);
    const { data } = await q;
    res.json(data || []);
});

app.get('/api/bot/config', async (req, res) => res.json(await getBotConfig()));

app.post('/api/bot/config', async (req, res) => {
    try {
        const body = req.body;
        const promises = Object.entries(body).map(([key, value]) => 
            supabase.from('system_settings').upsert({ key, value }, { onConflict: 'key' })
        );
        await Promise.all(promises);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/clientes', async (req, res) => {
    const { data } = await supabase.from('customers').select('*').order('last_interaction_at', { ascending: false });
    res.json(data || []);
});

app.post('/api/products/:id/prices', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from('product_prices').insert([{ ...req.body, product_id: id }]);
    if (error) return res.status(400).json(error);
    res.json(data);
});

app.delete('/api/products/:id/prices', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('product_prices').delete().eq('product_id', id);
    if (error) return res.status(400).json(error);
    res.json({ success: true });
});

app.post('/api/products/:id/variants', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from('product_variants').insert([{ ...req.body, product_id: id }]);
    if (error) return res.status(400).json(error);
    res.json(data);
});

app.delete('/api/products/:id/variants', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('product_variants').delete().eq('product_id', id);
    if (error) return res.status(400).json(error);
    res.json({ success: true });
});

// --- Core Logic ---
async function procesarMensaje(mensaje, phone) {
    try {
        const { data: customerRecord } = await supabase.from('customers').select('tracking_status').eq('phone', phone).single();
        const appliesRecovery = customerRecord && customerRecord.tracking_status === 'RECUPERACION_ENVIADA';

        const catalogo = await getCatalogoSupabase();
        const contextoCliente = await getContextoCliente(phone);
        const config = await getBotConfig();
        const horaStr = new Date().toLocaleString('en-US', {timeZone: 'America/Mexico_City', hour: 'numeric', hour12: false});
        const ganchoEnvio = parseInt(horaStr) < 16 ? "HOY MISMO" : "MAÑANA";
        const listadoProductos = catalogo.map(p => {
            let preciosFiltrados = p.product_prices || [];
            if (!appliesRecovery) {
                preciosFiltrados = preciosFiltrados.filter(pr => !pr.label.toLowerCase().includes('recovery'));
            }
            const allPrices = preciosFiltrados.map(pr => `${pr.label}: $${pr.price} (mínimo ${pr.min_quantity} unidades)`).join('\n    - ');
            
            const mainImg = p.product_media?.find(m => m.is_main) || p.product_media?.[0];
            const imgPath = mainImg ? mainImg.image_url.split('/').pop() : "main.jpg";

            let pInfo = `[PRODUCTO: ${p.name.toUpperCase()}]
  - CATEGORÍA: ${p.category || 'aparato'}
  - PRECIOS DISPONIBLES:
    - ${allPrices}
  - PATH_FOTO: "${imgPath}"
  - BENEFICIO: ${p.main_benefit || ''}
  - USO: ${p.usage_instructions || ''}`;
            
            if (p.category === 'prenda' && p.product_variants && p.product_variants.length > 0) {
                const vars = p.product_variants.map(v => `${v.name} (${v.stock_quantity > 0 ? `${v.stock_quantity} en stock` : 'AGOTADO'})`).join(', ');
                pInfo += `\n  - VARIANTES: ${vars}`;
            }

            pInfo += `\n  - MANEJO DE OBJECIONES: ${p.objection_handling || ''}`;
            return pInfo;
        }).join('\n\n');
        
        console.log("--- DEBUG: CATALOGO PARA IA ---");
        console.log(listadoProductos);
        console.log("--------------------------------");

        const sistemaPrompt = `Eres Mía, agente de ventas estrella por WhatsApp. RESPONDERÁS SIEMPRE EN FORMATO JSON.

ESTA ES TU ÚNICA BASE DE DATOS OFICIAL (Usa estos PRECIOS y estos PATH_FOTO):
${listadoProductos}

REGLAS DE ORO:
1. Habla siempre breve, amable y como mujer (25-35 años). Usa emojis.
2. Si el cliente solo saluda, sugiere los productos y diles que hoy el envío es ${ganchoEnvio.toLowerCase()}.
3. Si no es recuperación/seguimiento, usa Precios Normales.
4. Si han pasado 12h o es seguimiento, usa Precios Recovery.
5. REGLAS DE PUBLICIDAD (Formato de Anuncio):
   - Nombre Producto
   - 🔥 PROMOCIÓN 🔥
   - LISTA DE PRECIOS: (Debes escribir aquí los precios exactos que aparecen arriba)
   - Beneficios cortos con viñetas (✨, ✅, 🏆)
   - Cierre con envío gratis y pago contra entrega.

ESTRUCTURA DE SALIDA (JSON OBLIGATORIO):
{
  "intent": "precio|pedido|duda",
  "reply_to_customer": "Texto para WhatsApp...",
  "structured_data": { 
    "producto": "Nombre exacto", 
    "cantidad": 0, 
    "total": 0, 
    "nombre_cliente": "...", 
    "calle_numero": "...",
    "colonia": "...",
    "ciudad": "...",
    "estado": "...",
    "codigo_postal": "...",
    "referencias": "...",
    "metodo_pago": "..."
  },
  "media": {
    "use_product_image": true,
    "image_path": "Usa exactamente el PATH_FOTO del producto"
  }
}

CONTEXTO CLIENTE:
${contextoCliente}
Entrega sugerida: ${ganchoEnvio}`;

        console.log("--- DEBUG: PROMPT FINAL PARA IA ---");
        console.log(sistemaPrompt);
        console.log("------------------------------------");

        const history = sessionManager.getOrCreateSession(phone, sistemaPrompt);
        sessionManager.addMessage(phone, 'user', mensaje);

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
        
        sessionManager.addMessage(phone, 'assistant', reply);

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
        sessionManager.resetSession(msg.from);
        await supabase.from('customers').update({ tracking_status: null }).eq('phone', msg.from);
        await supabase.from('chat_logs').delete().eq('customer_phone', msg.from);
        await supabase.from('new_orders').delete().eq('customer_phone', msg.from);
        await msg.reply("🔄 *Sistema y Memoria Histórica Reiniciados.*");
        return;
    }

    // Autorización humana desde el grupo "Ventas"
    if (msg.body.trim().toLowerCase().startsWith('enterado') && (msg.from.includes('@g.us') || msg.author)) {
        const partes = msg.body.trim().split(' ');
        if (partes.length >= 2) {
            const numeroTarget = partes[1].replace(/\D/g, ''); 
            try {
                const { data: pedido } = await supabase.from('new_orders')
                    .select('*')
                    .ilike('shipping_details', `%${numeroTarget}%`)
                    .match({ status: 'PENDING_CONFIRMATION' })
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (pedido) {
                    await supabase.from('new_orders').update({ status: 'WAITING_PAYMENT' }).eq('id', pedido.id);
                    await supabase.from('customers').update({ tracking_status: 'CLOSED' }).eq('phone', pedido.customer_phone);
                    const msjConfirmacion = `✅ *¡Tu pedido ha sido confirmado!* 🎉\n\n📦 *Producto:* ${pedido.items_summary}\n📍 *Envío a:* ${pedido.shipping_details.split(' | Pago:')[0]}\n🚚 *Entrega:* ${pedido.shipping_details.includes('Entrega:') ? pedido.shipping_details.split('Entrega:')[1].trim() : 'A coordinar'}\n💵 *Monto a pagar:* $${pedido.total_amount}\n💳 *Formas de pago:* Efectivo, Tarjeta en terminal o Transferencia\n\n¡Muchísimas gracias por tu compra!`;
                    await waClient.sendMessage(pedido.customer_phone, msjConfirmacion);
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

        // 1. Manejo de Media (Imagen de product_media)
        if (ai.media && ai.media.use_product_image && ai.media.image_path) {
            try {
                const catalogo = await getCatalogoSupabase();
                const cleanPath = ai.media.image_path.replace(/['"]+/g, '').trim();
                
                // Buscar producto por nombre (preferido) o por coincidencia en el path
                const prod = catalogo.find(p => ai.structured_data?.producto && p.name.toLowerCase().includes(ai.structured_data.producto.toLowerCase()))
                           || catalogo.find(p => p.product_media?.some(m => m.image_url.includes(cleanPath)));
                
                // Obtener el item de media exacto
                const mediaItem = prod?.product_media?.find(m => m.image_url.includes(cleanPath)) 
                               || prod?.product_media?.find(m => m.is_main)
                               || prod?.product_media?.[0];
                
                if (mediaItem) {
                    console.log(`📸 Intentando enviar foto de: ${prod.name} | URL: ${mediaItem.image_url}`);
                    const response = await fetch(mediaItem.image_url);
                    if (!response.ok) {
                        const errTxt = await response.text();
                        throw new Error(`HTTP ${response.status}: ${errTxt}`);
                    }
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const mimetype = response.headers.get('content-type') || 'image/jpeg';
                    const media = new MessageMedia(mimetype, buffer.toString('base64'), cleanPath);
                    await waClient.sendMessage(msg.from, media, { caption: ai.reply_to_customer });
                    imageSent = true;
                    console.log(`✅ Foto enviada: ${cleanPath}`);
                }
            } catch (e) { console.error("❌ Error resolviendo/enviando foto:", e.message); }
        }

        // 2. Enviar respuesta de texto (si no fue caption o si la foto falló)
        if (!imageSent && ai.reply_to_customer) {
            await msg.reply(ai.reply_to_customer);
        }
        
        // 3. Registro y Actualización de Cliente
        await guardarLogVenta(msg.from, msg.body, ai.reply_to_customer);
        const customerUpdate = { phone: msg.from, last_interaction_at: new Date().toISOString() };
        if (ai.intent === 'precio') customerUpdate.tracking_status = 'INTERESTED';
        await supabase.from('customers').upsert(customerUpdate, { onConflict: 'phone' });

        // 4. Manejo de Pedidos Estructurados (Validación Estricta de 12 campos)
        if (ai.intent === 'pedido' && ai.structured_data && ai.structured_data.producto && ai.structured_data.total > 0) {
            const d = ai.structured_data;
            
            // Campos Requeridos para Escalamiento (Regla QA)
            const requiredFields = ['nombre_cliente', 'producto', 'cantidad', 'total', 'calle_numero', 'colonia', 'ciudad', 'estado', 'codigo_postal', 'referencias', 'metodo_pago'];
            const missingFields = requiredFields.filter(f => !d[f] || String(d[f]).length < 2);
            
            const entrega = new Date().getHours() < 16 ? 'Hoy mismo' : 'Mañana';
            const shipping_details = `${d.nombre_cliente || 'Cliente'} | ${msg.from} | ${d.calle_numero || ''}, ${d.colonia || ''}, ${d.ciudad || ''}, ${d.estado || ''}, CP ${d.codigo_postal || ''} | Pago: ${d.metodo_pago || 'Pendiente'} | Entrega: ${entrega} | Ref: ${d.referencias || 'N/A'}`;
            const items_summary = `${d.cantidad || 1}x ${d.producto}`;

            const { data: newOrder } = await supabase.from('new_orders').insert([{ 
                customer_phone: msg.from, shipping_details, items_summary, total_amount: d.total, status: 'PENDING_CONFIRMATION'
            }]).select().single();

            if (newOrder) {
                await supabase.from('customers').update({ tracking_status: 'PENDING_CONFIRMATION' }).eq('phone', msg.from);
                
                // Cola para Google Sheets
                await supabase.from('sheets_sync_queue').insert([{
                    order_id: newOrder.id,
                    payload: { ...newOrder, customer_phone: msg.from, timestamp: new Date().toISOString() }
                }]);

                // Alerta al Grupo Ventas SOLO si el pedido está realmente LISTO (QA Rule)
                if (missingFields.length === 0) {
                    try {
                        const chats = await waClient.getChats();
                        const grupoVentas = chats.find(c => c.isGroup && c.name.toLowerCase() === 'ventas');
                        if (grupoVentas) {
                            const numLimpio = msg.from.replace(/\D/g, '');
                            const alerta = `🚨 *NUEVO PEDIDO PENDIENTE* 🚨\n🆔 *ID:* ${newOrder.id}\n👤 *Cliente:* ${d.nombre_cliente}\n📱 *Celular:* ${numLimpio}\n📦 *Producto:* ${items_summary}\n💰 *Total:* $${d.total}\n📍 *Ubicación:* ${d.ciudad}, ${d.estado}\n👉 *Autorizar:* responder 'enterado ${numLimpio}'`;
                            await grupoVentas.sendMessage(alerta);
                        }
                    } catch(e) { console.error("❌ Error notificar grupo:", e.message); }
                } else {
                    console.log(`⏳ Pedido registrado pero incompleto. Faltan: ${missingFields.join(', ')}`);
                }
            }
        }
    }

    // --- MODO APRENDIZAJE: Registrar tus respuestas manuales ---
    if (msg.fromMe && botMode === 0) {
        try {
            await supabase.from('chat_logs').insert([{ 
                customer_phone: msg.to.replace(/\D/g, ''), message: "[RESPUESTA MANUAL]", response: msg.body 
            }]);
        } catch (e) { console.error("❌ Error Aprendizaje:", e.message); }
    }
});

// --- Seguimiento Automático ---
async function ejecutarSeguimiento() {
    if (botMode === 0) return; 
    const config = await getBotConfig();
    if (String(config.bot_seguimiento_activo) !== 'true') return;
    
    const ahora = new Date();
    
    // 1. Seguimiento 6h (Interesado -> Recordatorio Enviado)
    const seisH = new Date(ahora - 6 * 60 * 60 * 1000).toISOString();
    const { data: r6 } = await supabase.from('customers')
        .select('*')
        .eq('tracking_status', 'INTERESTED')
        .is('last_followup_at', null)
        .lt('last_interaction_at', seisH);

    for (const c of r6 || []) {
        try {
            await waClient.sendMessage(c.phone, "¡Hola! 🌸 ¿Te quedó alguna duda sobre tu producto? ¡Quedo atenta para agendarte! 😊");
            await supabase.from('customers').update({ 
                tracking_status: 'FOLLOWUP_SENT', 
                last_followup_at: new Date().toISOString() 
            }).eq('phone', c.phone);
            console.log(`✅ Seguimiento 6h enviado a ${c.phone}`);
        } catch (err) { console.error(`❌ Error seguimiento 6h a ${c.phone}:`, err.message); }
    }

    // 2. Recovery 12h (Recordatorio Enviado -> Recuperación Enviada)
    const doceH = new Date(ahora - 12 * 60 * 60 * 1000).toISOString();
    const { data: r12 } = await supabase.from('customers')
        .select('*')
        .eq('tracking_status', 'FOLLOWUP_SENT')
        .is('last_recovery_at', null)
        .lt('last_followup_at', doceH);

    for (const c of r12 || []) {
        try {
            await waClient.sendMessage(c.phone, "¡Hola de nuevo! ✨ Me autorizaron un **10% de DESCUENTO** si pides ahorita. 💸 ¿Te animas? 🚀");
            await supabase.from('customers').update({ 
                tracking_status: 'RECOVERY_SENT', 
                last_recovery_at: new Date().toISOString() 
            }).eq('phone', c.phone);
            console.log(`✅ Recovery 12h enviado a ${c.phone}`);
        } catch (err) { console.error(`❌ Error recovery 12h a ${c.phone}:`, err.message); }
    }
}
setInterval(ejecutarSeguimiento, 10 * 60 * 1000);

app.listen(PORT, () => console.log(`🚀 Puerto ${PORT}`));
waClient.initialize();
