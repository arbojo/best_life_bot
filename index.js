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
});

// --- Message Router ---
waClient.on('message', async (msg) => {
    if (msg.isStatus) return;

    try {
        const isFromMTY = msg.from === config.MTY_GROUP_ID;

        // 1. Logic for MTY Group (Order Registrar) based on ID
        if (isFromMTY) {
            console.log(`📦 [MTY] Mensaje detectado en grupo ID ${msg.from}`);
            
            // Check if it's a query
            const queryResponse = await registrarLogic.handleQuery(msg.body);
            if (queryResponse) {
                return await msg.reply(queryResponse);
            }

            // Process order (Shadow mode handled inside registrarLogic)
            const metadata = { chat_id: msg.from, author: msg.author || msg.from };
            const registrationResult = await registrarLogic.handleGroupMessage(msg.body, metadata);
            if (registrationResult && !config.SIMULATION_MODE) {
                await msg.reply(registrationResult);
            }
            return;
        }

        // 2. Logic for Private Chats (Mía Sales)
        if (!msg.from.includes('@g.us')) {
            console.log(`💬 [MÍA] Mensaje privado de ${msg.from}`);
            
            const aiResponse = await miaLogic.handleMessage(msg.body, msg.from);
            
            // Media handling (Image)
            if (aiResponse.media?.show && aiResponse.media?.full_url) {
                try {
                    const response = await fetch(aiResponse.media.full_url);
                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);
                        const mimetype = response.headers.get('content-type') || 'image/jpeg';
                        const media = new MessageMedia(mimetype, buffer.toString('base64'), aiResponse.media.image);
                        await waClient.sendMessage(msg.from, media, { caption: aiResponse.reply });
                    } else {
                        await msg.reply(aiResponse.reply);
                    }
                } catch (e) {
                    console.error("❌ Error enviando media:", e.message);
                    await msg.reply(aiResponse.reply);
                }
            } else {
                await msg.reply(aiResponse.reply);
            }

            // Log interaction
            await db.logChat(msg.from, msg.body, aiResponse.reply);
            return;
        }

    } catch (err) {
        console.error("❌ Error en Router:", err.message);
    }
});

waClient.initialize();
