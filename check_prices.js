require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkPrices() {
    const { data: productos, error } = await supabase.from('productos').select('nombre, id, active');
    if (error) { console.error(error); return; }

    for (const prod of productos) {
        const { data: precios } = await supabase.from('productos_precios').select('etiqueta, precio, min_unidades').eq('producto_id', prod.id);
        console.log(`\nProducto: ${prod.nombre} (ID: ${prod.id}, Activo: ${prod.active})`);
        precios.forEach(p => {
            console.log(`  - ${p.etiqueta}: $${p.precio} (min ${p.min_unidades})`);
        });
    }
}

checkPrices();
