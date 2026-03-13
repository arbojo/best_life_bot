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
    console.log('✅ Bot Online y Listo (Mía + Registrador MTY)');
    console.log(`🛠️ Modo: ${config.SIMULATION_MODE ? 'SIMULACIÓN (Sombra)' : 'PRODUCCIÓN (Real)'}`);
    console.log(`📡 Escuchando WhatsApp Grupo MTY: ${config.MTY_GROUP_ID}`);
    
    // Heartbeat cada 2 minutos para confirmar que el proceso sigue vivo
    setInterval(() => {
        console.log(`💓 [HEARTBEAT] ${new Date().toLocaleTimeString('es-MX')} - Bot Activo`);
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

// Webhook handling messages
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'page') {
        for (const entry of body.entry) {
            const webhook_event = entry.messaging[0];
            const sender_id = webhook_event.sender.id;

            if (webhook_event.message && webhook_event.message.text) {
                const text = webhook_event.message.text;
                console.log(`💬 [MESSENGER] Mensaje de ${sender_id}: ${text}`);

                // Process via same Registrar Logic
                const metadata = { 
                    chat_id: 'MESSENGER', 
                    author: sender_id,
                    messageTimestamp: Math.floor(Date.now() / 1000)
                };

                const response = await registrarLogic.handleGroupMessage(text, metadata);
                if (response && !config.SIMULATION_MODE) {
                    await messengerService.sendMessage(sender_id, response);
                }
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

app.listen(config.PORT, () => {
    console.log(`🌐 [SERVER] Webhook escuchando en puerto ${config.PORT}`);
});

// --- common router logic (WhatsApp) ---
async function routeMessage(msg) {
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

