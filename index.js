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
    console.log(`📡 Escuchando Grupo MTY: ${config.MTY_GROUP_ID}`);
    
    // Heartbeat cada 2 minutos para confirmar que el proceso sigue vivo
    setInterval(() => {
        console.log(`💓 [HEARTBEAT] ${new Date().toLocaleTimeString('es-MX')} - Bot Activo`);
    }, 120000);
});

waClient.on('auth_failure', msg => {
    console.error('❌ [ERROR] Fallo de autenticación:', msg);
});

waClient.on('disconnected', (reason) => {
    console.log('⚠️ [WWS] Cliente desconectado:', reason);
});

// --- common router logic ---
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

        // 2. Logic for Private Chats (Mía Sales) - CONGELADA
        /* 
        if (!msg.from.includes('@g.us')) {
            console.log(`💬 [MÍA] Mensaje privado detectado (IGNORADO - Módulo Congelado)`);
            return;
        }
        */

    } catch (err) {
        console.error("❌ Error en Router:", err.message);
    }
}

// --- Message Router ---
waClient.on('message', routeMessage);

waClient.initialize();
