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
let botMode = 1; 

// --- Funciones de Base de Datos ---
async function getCatalogoSupabase() {
    try {
        const { data, error } = await supabase.from('productos').select('*, productos_precios(*), productos_variantes(*)').eq('active', true);
        if (error) throw error;
        return data;
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
    const { data } = await supabase.from('productos').select('*, productos_precios(*)').order('id', { ascending: false });
    res.json(data || []);
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

        const sistemaPrompt = `MISION BASE: ${config.bot_persona}
        
        ADEMÁS DE TU MISIÓN BASE, ADOPTA ESTA IDENTIDAD INQUEBRANTABLE:
        Te llamas Mia, eres una mujer real de entre 25 y 35 años trabajando en ventas. Eres cálida, empática y asertiva. Tu tono debe ser MUY SUTIL y NATURAL: no seas intensamente alegre, no abuses de los emojis, ni seas excesivamente confianzuda o pícara. Mantén una amabilidad profesional B2C. BAJO NINGUNA CIRCUNSTANCIA puedes decir o insinuar que eres una inteligencia artificial, un bot, un asistente virtual o un programa. Eres 100% humana.
        Eres una vendedora estrella enfocada EXCLUSIVAMENTE en el catálogo listado abajo. ESTÁ ESTRICTAMENTE PROHIBIDO actuar como un asistente de IA genérico (tipo ChatGPT). NUNCA menciones precios en dólares ni marcas externas.
        
        PERFIL EMPÁTICO DEL CLIENTE POR PRODUCTO (¡IMPORTANTE!):
        El secreto de tu éxito es cómo conectas con la situación del cliente antes de venderle:
        - Si preguntan por CLEAN NAILS (Tratamiento de hongos): El cliente siente vergüenza. Es probable que no pueda ir a la playa, usar sandalias o ir a la alberca libremente. Sé muy respetuosa, validante y ofréceles la confianza de que por fin podrán recuperar la libertad de mostrar sus pies sin esconderse.
        - Si preguntan por CLOUD PET (Cepillo para mascotas): El cliente ama a sus animales, para ellos son sus hijos. Usa un tono que demuestre que entiendes ese amor incondicional y que este producto es un regalo de bienestar y mimos para su "perrhijo" o "gatihijo".
        - Si preguntan por NEUROFEET (Calcetas de compresión): El cliente vive con dolor físico REAL y constante en su día a día. Sé extremadamente comprensiva, transmite alivio y esperanza de que podrán volver a caminar, trabajar o descansar sin ese sufrimiento agotador.
        
        RECUERDA TUS REGLAS DE ORO COMO VENDEDOR ESTRELLA: 
        1. SALUDOS Y PRIMER CONTACTO: ¡Nunca saludes como recepcionista aburrida o IA de ayuda genérica! SIN IMPORTAR si es un cliente nuevo o alguien que ya te había escrito antes, si el cliente solo dice "Hola", "Info" o retoma el chat de forma vaga, toma el control inmediatamente. Saluda con entusiasmo y menciona directamente tus productos (ej. "¡Hola de nuevo! Qué gusto saludarte. ¿En qué te ayudo hoy? ¿Buscas alivio para pies cansados con Neurofeet, cuidar a tu mascota con Cloud Pet o tratar tus uñas con Clean Nails?").
        2. EXCLUSIVIDAD DE CATÁLOGO (¡CRÍTICO!): Tu único universo es el catálogo de abajo. Si alguien te dice "precio de las uñas", "el aparato de los pies", o "el cepillo de perros", ASUME INMEDIATAMENTE que hablan de "Clean Nails", "Neurofeet" o "Cloud Pet". NO les des descripciones de internet, ofréceles TU producto y da tus precios.
        3. PRECIOS Y VENTAS EN VOLUMEN: Cuando te pregunten un precio, SIEMPRE da las dos opciones juntas: el precio por 1 unidad y el precio por el paquete promocional. Usa esto como técnica de anclaje (Ej. "El tratamiento individual te sale en $X, pero te recomiendo la promo de 2 por solo $Y, ¡te ahorras muchísimo!").
        4. DESCUENTOS (RECOVERY): Si notas que tu catálogo ahora incluye precios etiquetados como "Recovery" o "Recuperación", el cliente es elegible para un descuento especial de seguimiento de 12 hr!. Ofrécele el precio Recovery con entusiasmo para cerrar la venta. Si no ves etiquetas Recovery, NO INVENTES LOS DESCUENTOS. Solo apégate a los normales.
        5. PRODUCTOS TIPO PRENDA: Consulta el STOCK DETALLADO. Si una talla/color está AGOTADO, dilo amablemente y ofrece alternativas. Confirma talla/color antes de cerrar.
        6. OBJECIONES: Si el cliente duda, usa la sección de "MANEJO DE OBJECIONES" y el "HACK DEL EXPERTO" del producto.
        7. REGLAS DE VENTA: Respeta las reglas (ej: solo paquetes) siempre con amabilidad.
        8. ENVÍO DE FOTOS (¡MUY IMPORTANTE!): NUNCA mandes fotos en el saludo inicial ni cuando te pidan información "de todos" los productos o un resumen general. Solamente cuando la charla trate EXCLUSIVAMENTE de un solo producto y estés dando sus detalles, precio o beneficios, cierra tu mensaje con este comando exacto: [IMG:Nombre Exacto Del Producto]. Ejemplo: [IMG:Clean Nails]. NO LO USES si mencionas 2 o más productos en tu respuesta.
        
        PRODUCTOS:\n${listadoProductos}\n\nCONTEXTO:\n${contextoCliente}\n\nESTILO: ${config.bot_estilo}\n\nREGLAS CIERRE: ${config.bot_reglas_cierre}\n\nSi es de Leon: Ofrece entrega ${ganchoEnvio}.\nCierre: [PEDIDO|Direccion|Producto|Total]`;

        if (!userContexts.has(telefono)) {
            // Recuperar historial real de la DB para no empezar de cero
            const { data: logs } = await supabase.from('logs_ventas')
                .select('mensaje, respuesta')
                .eq('cliente_tel', telefono)
                .order('timestamp', { ascending: false })
                .limit(5); // Recuperamos las últimas 5 interacciones

            const h = [{ role: 'system', content: sistemaPrompt }];
            if (logs && logs.length > 0) {
                // Invertimos porque vienen del más reciente al más antiguo
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

        // Asegurar que el sistemaPrompt nunca se borre al hacer slice
        let messagesToSend;
        if (history.length > 20) {
            messagesToSend = [history[0], ...history.slice(-19)];
        } else {
            messagesToSend = history;
        }

        const response = await openai.chat.completions.create({ model: 'gpt-4o', messages: messagesToSend, temperature: 0.6 });
        const reply = response.choices[0].message.content;
        
        history.push({ role: 'assistant', content: reply });
        await guardarLogVenta(telefono, mensaje, reply);
        await supabase.from('clientes').upsert({ telefono, ultima_consulta: new Date().toISOString(), ultima_interaccion_tipo: 'CLIENTE', estado_seguimiento: 'INTERESADO' }, { onConflict: 'telefono' });

        return reply;
    } catch (err) { return "Dime, ¿en qué producto te gustaría información?"; }
}

// --- WhatsApp Client ---
const waClient = new Client({ authStrategy: new LocalAuth(), puppeteer: { headless: true, args: ['--no-sandbox'] } });
waClient.on('qr', qr => qrcode.generate(qr, { small: true }));
waClient.on('ready', () => console.log('✅ Bot Online'));

waClient.on('message', async (msg) => {
    if (msg.isStatus || botMode === 0) return;
    
    // Comando de Reinicio para Pruebas (Oculto)
    if (msg.body.trim().toUpperCase() === 'RESET') {
        userContexts.delete(msg.from);
        await supabase.from('clientes').update({ 
            estado_seguimiento: null, 
            ultima_interaccion_tipo: null 
        }).eq('telefono', msg.from);
        
        await msg.reply("🔄 *Sistema Reiniciado para este número.*\nMemoria y estado de seguimiento borrados. Ahora te trataré como un cliente 100% nuevo. ¡Di 'Hola' para probar!");
        return;
    }

    const reply = await procesarMensaje(msg.body, msg.from);
    if (botMode === 1) {
        // Limpiamos los comandos ocultos [PEDIDO|...] y [IMG:...] para que el cliente no los vea
        const safeReply = reply.replace(/\[PEDIDO\|[^\]]+\]/gi, '').replace(/\[IMG:[^\]]+\]/gi, '').trim();
        if (safeReply) await msg.reply(safeReply);
        
        // Alertas y Pedidos
        if (reply.includes('[PEDIDO|')) {
            await supabase.from('clientes').update({ estado_seguimiento: 'CERRADO' }).eq('telefono', msg.from);
        } else {
            await supabase.from('clientes').update({ ultima_consulta: new Date().toISOString(), ultima_interaccion_tipo: 'BOT' }).eq('telefono', msg.from);
        }

        // Enviar tarjetas de producto si la IA generó el tag [IMG:NombreProducto]
        const catalogo = await getCatalogoSupabase();
        
        // Extraer todos los tags [IMG:...] de la respuesta original de la IA
        const imgTags = [...reply.matchAll(/\[IMG:\s*([^\]]+?)\s*\]/gi)];
        
        if (imgTags.length > 0) {
            // Tomamos solo el primer tag que la IA haya generado
            const requestedProductName = imgTags[0][1].toLowerCase().trim();
            
            for (const prod of catalogo) {
                if (prod.nombre.toLowerCase() === requestedProductName && prod.imagen_url) {
                    try {
                        const media = await MessageMedia.fromUrl(prod.imagen_url);
                        // Armamos un mini resumen
                        let textFoto = `🔥 *${prod.nombre}*\n`;
                        if(prod.descripcion) textFoto += `${prod.descripcion}\n\n`;
                        if(prod.beneficio_principal) textFoto += `✅ ${prod.beneficio_principal}\n\n`;
                        textFoto += `🚚 ¡Envío GRATIS hasta hoy!`;

                        await waClient.sendMessage(msg.from, media, { caption: textFoto });
                    } catch (e) { console.error("Error mandando foto:", e); }
                    break; // Mandamos max 1 foto por mensaje
                }
            }
        }
    }
});

// --- Seguimiento Automático ---
async function ejecutarSeguimiento() {
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
