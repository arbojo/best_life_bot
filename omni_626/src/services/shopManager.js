const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const supabaseService = require('./supabaseService');

class ShopManager {
    constructor() {
        this.shops = new Map(); // Mapa de tienda_id -> cliente_whatsapp
    }

    async inicializarTienda(tiendaId, nombre) {
        if (this.shops.has(tiendaId)) return this.shops.get(tiendaId);

        console.log(`📡 Inicializando línea de WhatsApp para: ${nombre}...`);
        
        const client = new Client({
            authStrategy: new LocalAuth({
                clientId: `omni_shop_${tiendaId}`
            }),
            puppeteer: {
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });

        client.on('qr', (qr) => {
            console.log(`📸 NUEVO QR PARA [${nombre}]:`);
            qrcode.generate(qr, { small: true });
            // Aquí en el futuro emitiremos por Socket.io hacia el Dashboard Web
        });

        client.on('ready', () => {
            console.log(`✅ [${nombre}] - ¡Línea Conectada y Lista!`);
        });

        client.on('message', async (msg) => {
            // Aquí irá la lógica de procesar mensaje con IA delegada a hfService
            console.log(`📩 Mensaje en ${nombre}: ${msg.body}`);
        });

        client.initialize();
        this.shops.set(tiendaId, client);
        return client;
    }

    async detenerTienda(tiendaId) {
        if (this.shops.has(tiendaId)) {
            const client = this.shops.get(tiendaId);
            await client.destroy();
            this.shops.delete(tiendaId);
            console.log(`🛑 Tienda [${tiendaId}] desconectada.`);
        }
    }
}

module.exports = new ShopManager();
