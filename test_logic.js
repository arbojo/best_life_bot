const { procesarMensaje } = require('./index.js');
require('dotenv').config();

async function runTests() {
    console.log('🧪 Iniciando Pruebas de Lógica Interna para Mía...\n');

    const tests = [
        { name: 'Consulta Neurofeet (Base Oficial)', msg: '¿Qué precio tienen las calcetas neurofeet?' },
        { name: 'Consulta Clean Nails (Imagen y Precios)', msg: 'Info del clean nails' },
        { name: 'Consulta Cloud Pet (Precio Unitario)', msg: '¿Cuánto cuesta el cepillo de vapor?' },
        { name: 'Intención de Pedido (Datos Estructurados)', msg: 'Lo quiero, mi nombre es Juan Pérez y vivo en Calle Falsa 123, León. Quiero 2 clean nails.' }
    ];

    for (const t of tests) {
        console.log(`--- Prueba: ${t.name} ---`);
        console.log(`Mensaje: "${t.msg}"`);
        try {
            const reply = await procesarMensaje(t.msg, '1234567890@c.us');
            const ai = JSON.parse(reply.replace(/```json/g, '').replace(/```/g, '').trim());
            
            console.log('✅ Intento:', ai.intent);
            console.log('💬 Respuesta:', ai.reply_to_customer);
            if (ai.media && ai.media.use_product_image) {
                console.log('🖼️ Media:', ai.media.image_path);
            }
            if (ai.structured_data && ai.structured_data.total > 0) {
                console.log('💰 Estructurado:', ai.structured_data);
            }
        } catch (e) {
            console.error('❌ Error en prueba:', e.message);
        }
        console.log('\n');
    }
}

// Ejecutar si el archivo se llama directamente
if (require.main === module) {
    runTests().then(() => process.exit(0));
}
