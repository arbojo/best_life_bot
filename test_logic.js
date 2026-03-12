// Para no iniciar el servidor al probar, simulamos las funciones necesarias
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const userContexts = new Map();

// Traemos la función de lógica directamente (copiada de index.js para la prueba aislada)
async function getCatalogoSupabase() {
    const { data: productos } = await supabase.from('productos').select('*').eq('active', true);
    const { data: precios } = await supabase.from('productos_precios').select('*');
    return productos.map(p => ({
        ...p,
        productos_precios: precios ? precios.filter(pr => pr.producto_id === p.id) : []
    }));
}

async function procesarMensaje(mensaje, telefono) {
    const catalogo = await getCatalogoSupabase();
    const listadoProductos = catalogo.map(p => {
        const allPrices = p.productos_precios.map(pr => `${pr.etiqueta}: $${pr.precio}`).join(', ');
        return `*${p.nombre}*:\n  - PRECIOS: ${allPrices}\n  - Beneficios: ${p.beneficio_principal}`;
    }).join('\n\n');

    const sistemaPrompt = `Eres Mía, agente de ventas por WhatsApp. RESPONDERÁS SIEMPRE EN JSON.
BASE OFICIAL:
${listadoProductos}

ESTRUCTURA:
{ "intent": "...", "reply_to_customer": "...", "media": { "use_product_image": true, "image_path": "..." } }`;

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: sistemaPrompt }, { role: "user", content: mensaje }],
        response_format: { type: "json_object" }
    });
    return response.choices[0].message.content;
}

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
