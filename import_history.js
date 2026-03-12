const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function importHistory() {
    console.log('🔄 Iniciando importación de historial CRM...');

    try {
        let raw = fs.readFileSync('temp_pedidos.json', 'utf16le');
        // Eliminar BOM si existe
        if (raw.charCodeAt(0) === 0xFEFF) {
            raw = raw.slice(1);
        }
        const data = JSON.parse(raw);
        console.log(`📂 Cargados ${data.length} pedidos desde el respaldo.`);

        for (const p of data) {
            console.log(`\n📦 Procesando pedido de: ${p.cliente_tel}`);

            // 1. Asegurar el cliente
            const { error: cError } = await supabase.from('clientes').upsert([{
                telefono: p.cliente_tel,
                nombre: p.detalles_envio ? p.detalles_envio.split('|')[0].trim() : 'Cliente Importado',
                compras_previas: 1,
                ultima_consulta: p.timestamp
            }], { onConflict: 'telefono' });

            if (cError) {
                console.error(`❌ Error cliente:`, cError.message);
                continue;
            }

            // 2. Insertar pedido (sin ID original para evitar colisiones UUID)
            const { error: pError } = await supabase.from('pedidos').insert([{
                cliente_tel: p.cliente_tel,
                productos: p.productos,
                total: parseFloat(p.total) || 0,
                detalles_envio: p.detalles_envio,
                estado: p.estado,
                timestamp: p.timestamp
            }]);

            if (pError) console.error(`❌ Error pedido:`, pError.message);
            else console.log(`✅ Pedido sincronizado.`);
        }

        console.log('\n✨ ¡Restauración de historial completada!');
    } catch (err) {
        console.error('❌ Error crítico en importación:', err.message);
    }
}

importHistory();
