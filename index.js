/**
 * index.js
 * Entry point and Message Router.
 */
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const config = require('./config');
const db = require('./database');
const miaLogic = require('./miaLogic');
const registrarLogic = require('./registrarLogic');

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const messengerService = require('./messengerService');

const BACKEND_URL = 'http://localhost:4000/api/system';

// --- Remote Logging Helper ---
const originalLog = console.log;
const originalError = console.error;

console.log = function(...args) {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    originalLog(...args);
    axios.post(`${BACKEND_URL}/logs`, { message, level: 'info', source: 'ENGINE' }).catch(() => {});
};

console.error = function(...args) {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    originalError(...args);
    axios.post(`${BACKEND_URL}/logs`, { message, level: 'error', source: 'ENGINE' }).catch(() => {});
};

// --- Bot Active Status & Channels State ---
let isBotActive = true;
let activeChannels = new Set(); // Stores IDs of active groups/pages

async function syncSystemState() {
    try {
        const [statusRes, channelsRes] = await Promise.all([
            axios.get(`${BACKEND_URL}/bot-status`),
            axios.get(`${BACKEND_URL}/channels`)
        ]);
        
        isBotActive = statusRes.data.active;
        
        const activeIds = channelsRes.data
            .filter(c => c.is_active)
            .map(c => c.id);
        
        // Fallback: If no channels are defined yet, use legacy behavior (process everything)
        // This protects the "heart" of the bot during its first run.
        if (channelsRes.data.length === 0) {
            activeChannels = null; // null means "active for everyone"
        } else {
            activeChannels = new Set(activeIds);
        }
        
    } catch (err) {
        // Fallback to active if backend is down - maintain core operation
        isBotActive = true;
        activeChannels = null; 
    }
}
setInterval(syncSystemState, 15000); // Check every 15s

async function detectAndSyncGroups() {
    try {
        originalLog('🔍 [DETECTOR] Iniciando escaneo de grupos...');
        const chats = await waClient.getChats();
        const keywords = ['MTY', 'GTO', 'CDMX', 'GDL'];
        const excludedIds = [
            '120363168691582285@g.us',
            '120363425153281297@g.us',
            '120363402554144326@g.us'
        ];
        
        const filteredGroups = chats
            .filter(chat => chat.isGroup)
            .filter(group => {
                const id = group.id._serialized;
                const name = group.name || '';
                return keywords.some(k => name.includes(k)) && !excludedIds.includes(id);
            })
            .map(group => ({
                id: group.id._serialized,
                name: group.name || 'Grupo sin nombre',
                platform: 'WHATSAPP'
            }));
        
        // Add Messenger manually
        filteredGroups.push({
            id: 'MESSENGER_PAGE',
            name: 'Tienda Messenger',
            platform: 'FACEBOOK'
        });

        originalLog(`📋 [DETECTOR] Escaneo completado. ${filteredGroups.length} canales relevantes encontrados.`);
        
        if (filteredGroups.length > 0) {
            filteredGroups.forEach(g => originalLog(`   - [DETECTOR] Canal: ${g.name} (${g.id})`));
            await axios.post(`${BACKEND_URL}/channels/sync`, { channels: filteredGroups }).catch(() => {});
            originalLog(`🔄 [SYNC] Canales filtrados sincronizados con el Dashboard.`);
        } else {
            originalLog('⚠️ [DETECTOR] No se encontraron grupos que coincidan con los criterios (MTY, GTO, CDMX, GDL).');
        }
    } catch (err) {
        originalError('❌ Error crítico en el detector de grupos:', err.message);
    }
}

// --- WhatsApp Client Configuration ---
const waClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

waClient.on('qr', qr => {
    console.log('⚠️ [WWS] Escanea el código QR para iniciar sesión:');
    qrcode.generate(qr, { small: true });
});

waClient.on('ready', () => {
    originalLog('✅ Bot Online y Listo (Mía + Registrador MTY)');
    originalLog(`🛠️ Modo: ${config.SIMULATION_MODE ? 'SIMULACIÓN (Sombra)' : 'PRODUCCIÓN (Real)'}`);
    originalLog(`📡 Escuchando WhatsApp Grupo MTY: ${config.MTY_GROUP_ID}`);
    
    // Initial Syncs
    detectAndSyncGroups();
    syncSystemState();
    
    // Periodic Syncs
    setInterval(detectAndSyncGroups, 120000); // Sync groups every 2 min
    setInterval(syncSystemState, 15000);      // Sync active/inactive every 15s
    
    // Heartbeat cada 2 minutos para confirmar que el proceso sigue vivo
    setInterval(() => {
        if (isBotActive) {
            originalLog(`💓 [HEARTBEAT] ${new Date().toLocaleTimeString('es-MX')} - Bot Activo`);
        } else {
            originalLog(`⏸️ [PAUSE] El bot está en pausa desde el dashboard.`);
        }
    }, 120000);
});

// --- Express Server for Messenger Webhooks ---
const app = express();
app.use(bodyParser.json());

// Webhook Verification (for Facebook)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === config.FB_VERIFY_TOKEN) {
            console.log('✅ [MESSENGER] Webhook Verificado');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// Ruta POST para recibir mensajes de Facebook Messenger
app.post('/webhook', async (req, res) => {
    if (!isBotActive) {
        return res.status(200).send('BOT_PAUSED');
    }
    const body = req.body;

    // Verificamos que el evento provenga de una página de Facebook
    if (body.object === 'page') {
        for (const entry of body.entry) {
            // Recibimos el evento de mensajería
            const webhook_event = entry.messaging[0];
            console.log('📡 [MESSENGER] Evento recibido:', webhook_event);

            // Obtenemos el ID del remitente (PSID) y el texto del mensaje
            const sender_psid = webhook_event.sender.id;

            if (webhook_event.message && webhook_event.message.text) {
                const text = webhook_event.message.text;
                console.log(`💬 [MESSENGER] Mensaje de ${sender_psid}: ${text}`);

                // --- CONEXIÓN CON LÓGICA DE REGISTRO ---
                const metadata = { 
                    chat_id: 'MESSENGER', 
                    author: sender_psid,
                    messageTimestamp: Math.floor(Date.now() / 1000)
                };

                // Procesar el mensaje con la misma lógica de MTY Registrar
                const response = await registrarLogic.handleGroupMessage(text, metadata);
                
                // Responder a través de la API de Graph de Meta
                if (response && !config.SIMULATION_MODE) {
                    await messengerService.sendMessage(sender_psid, response);
                }
            }
        }
        // Siempre responde con un 200 para que Facebook no piense que tu servidor falló
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

console.log(`🛰️  [SERVER] Intentando iniciar servidor en puerto ${config.PORT}...`);
const server = app.listen(config.PORT, () => {
    console.log(`🌐 [SERVER] Webhook escuchando en puerto ${config.PORT}`);
    console.log(`🔗 URL sugerida: http://localhost:${config.PORT}/webhook`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ [SERVER] Error: El puerto ${config.PORT} ya está ocupado por otro proceso.`);
    } else {
        console.error(`❌ [SERVER] Error al iniciar servidor: ${err.message}`);
    }
});

// --- common router logic (WhatsApp) ---
async function routeMessage(msg) {
    // Check if bot is active globally
    if (!isBotActive) return;

    // Check if this specific channel/group is active in dashboard
    const channelId = msg.from || msg.to;
    if (activeChannels !== null && !activeChannels.has(channelId)) {
        // Log once to avoid spam, or only for relevant groups
        const name = msg.from; // Simplified for logging
        originalLog(`⚠️ [ROUTER] Mensaje ignorado de ${name} (Canal INACTIVO en Dashboard)`);
        return; 
    }

    // CRITICAL: Ignore any message from the bot itself or status updates to avoid loops
    if (msg.isStatus || msg.fromMe === true) {
        return;
    }

    try {
        // Al enviar nosotros mismos un mensaje, el ID del grupo suele estar en msg.to
        const isMTY = msg.from === config.MTY_GROUP_ID || msg.to === config.MTY_GROUP_ID;

        if (isMTY) {
            console.log(`📦 [MTY] Mensaje detectado | De: ${msg.from} | Para: ${msg.to} | Propio: ${msg.fromMe}`);
            
            // Check if it's a query
            const queryResponse = await registrarLogic.handleQuery(msg.body);
            if (queryResponse) {
                return await msg.reply(queryResponse);
            }

            // Process order (Shadow mode handled inside registrarLogic)
            const metadata = { 
                chat_id: msg.from, 
                author: msg.author || msg.from,
                messageTimestamp: msg.timestamp 
            };
            const registrationResult = await registrarLogic.handleGroupMessage(msg.body, metadata);
            if (registrationResult && !config.SIMULATION_MODE) {
                await msg.reply(registrationResult);
            }
            return;
        }

    } catch (err) {
        console.error("❌ Error en Router WhatsApp:", err.message);
    }
}

// --- Message Router ---
waClient.on('message', routeMessage);

waClient.initialize();

