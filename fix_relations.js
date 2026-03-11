const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function fixRelations() {
    console.log('🔧 Verificando y reparando relaciones de tablas...');
    
    const query = `
        -- Asegurar FK para productos_precios
        ALTER TABLE IF EXISTS public.productos_precios 
        DROP CONSTRAINT IF EXISTS productos_precios_producto_id_fkey,
        ADD CONSTRAINT productos_precios_producto_id_fkey 
        FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;

        -- Asegurar FK para productos_variantes
        ALTER TABLE IF EXISTS public.productos_variantes 
        DROP CONSTRAINT IF EXISTS productos_variantes_producto_id_fkey,
        ADD CONSTRAINT productos_variantes_producto_id_fkey 
        FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;
    `;

    try {
        const { error } = await supabase.rpc('execute_sql_internal', { sql_query: query }).catch(async () => {
             console.log('Nota: Intentando ejecución alternativa...');
             return { error: 'RPC falló' };
        });
        
        if (error) {
            console.warn('⚠️ No se pudo ejecutar vía RPC. Por favor, ejecuta el siguiente SQL manualmente en el dashboard de Supabase:');
            console.log(query);
        } else {
            console.log('✅ Relaciones reparadas exitosamente.');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

fixRelations();
