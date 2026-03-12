/**
 * miaLogic.js
 * Core conversational logic for Mía (Sales).
 */
const { OpenAI } = require('openai');
const db = require('./database');
const config = require('./config');
const sessionManager = require('./sessionManager');

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

module.exports = {
    async handleMessage(mensaje, phone) {
        try {
            const catalogo = await db.getCatalogo();
            const customer = await db.getCustomer(phone);
            
            // Business Logic Check (Deterministic)
            const appliesRecovery = customer && customer.tracking_status === 'RECOVERY_SENT';
            
            // Construct Product Catalog for IA
            const listadoProductos = catalogo.map(p => {
                let precios = p.product_prices || [];
                if (!appliesRecovery) {
                    precios = precios.filter(pr => !pr.label.toLowerCase().includes('recovery'));
                }
                const pricesStr = precios.map(pr => `${pr.label}: $${pr.price} (mínimo ${pr.min_quantity} unidades)`).join('\n    - ');
                const mainImg = p.product_media?.find(m => m.is_main) || p.product_media?.[0];
                const imgName = mainImg ? mainImg.image_url.split('/').pop() : "main.jpg";

                return `[PRODUCTO: ${p.name.toUpperCase()}]
  - DISPONIBILIDAD Y PRECIOS:
    - ${pricesStr}
  - ARCHIVO_IMAGEN: "${imgName}"
  - BENEFICIO PRINCIPAL: ${p.main_benefit || ''}`;
            }).join('\n\n');

            const sistemaPrompt = `Eres Mía, una vendedora amable de Best Life. 
RESPONDE SIEMPRE EN FORMATO JSON.

TU CATÁLOGO OFICIAL:
${listadoProductos}

REGLAS DE MÍA:
1. Habla como mujer joven (25-30 años), usa emojis para ser cercana.
2. Si el cliente solo saluda, sugiere proactivamente los productos.
3. PRECIOS: Di exactamente los precios que aparecen en el catálogo arriba.
4. LOGÍSTICA: NO prometas entrega "hoy mismo". Solo di que "tenemos envíos rápidos y pago contra entrega". La logística la confirma el equipo de Monterrey después.
5. OBJETIVO: Resolver dudas y mantener el interés. NO intentes capturar dirección completa ni cerrar el pedido formalmente. Solo dile que "si gusta, puede pasar sus datos por aquí para que el equipo de Monterrey lo registre".

ESTRUCTURA DE SALIDA JSON (OBLIGATORIO):
{
  "reply": "Tu mensaje de WhatsApp...",
  "media": {
    "show": true_o_false,
    "image": "nombre_archivo.jpg_del_catalogo"
  },
  "product_detected": "Nombre exacto del producto o null"
}`;

            const history = sessionManager.getOrCreateSession(phone, sistemaPrompt);
            sessionManager.addMessage(phone, 'user', mensaje);

            const response = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: history,
                response_format: { type: "json_object" },
                temperature: 0.7
            });

            const replyData = JSON.parse(response.choices[0].message.content);
            sessionManager.addMessage(phone, 'assistant', replyData.reply);

            // Deterministic Image Resolution
            if (replyData.media?.show && replyData.product_detected) {
                const prod = catalogo.find(p => p.name.toLowerCase().includes(replyData.product_detected.toLowerCase()));
                if (prod) {
                    const mediaItem = prod.product_media?.find(m => m.image_url.includes(replyData.media.image)) || prod.product_media?.[0];
                    if (mediaItem) replyData.media.full_url = mediaItem.image_url;
                }
            }

            return replyData;
        } catch (err) {
            console.error("❌ Error en miaLogic:", err.message);
            return { reply: "¡Hola! Estoy para ayudarte con tus dudas sobre nuestros productos. 😊", media: { show: false } };
        }
    }
};
