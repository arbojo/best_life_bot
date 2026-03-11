const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/david/best_life_bot/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function syncSchema() {
    console.log('🔄 Sincronizando esquema de base de datos...');
    
    const migrations = [
        `ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS imagen_url TEXT;`,
        `ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS beneficio_principal TEXT;`,
        `ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS modo_uso TEXT;`,
        `ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS manejo_objeciones TEXT;`,
        `ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS hacks_expertos TEXT;`,
        `ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS estado_seguimiento TEXT DEFAULT 'NUEVO';`,
        `ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS ultima_interaccion_tipo TEXT DEFAULT 'CLIENTE';`,
        `ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS producto_interes TEXT;`,
        `CREATE TABLE IF NOT EXISTS public.configuracion (
            clave TEXT PRIMARY KEY,
            valor TEXT
        );`,
        `INSERT INTO public.configuracion (clave, valor) VALUES ('bot_seguimiento_activo', 'true') ON CONFLICT (clave) DO NOTHING;`
    ];

    for (const sql of migrations) {
        try {
            const { error } = await supabase.rpc('execute_sql_internal', { sql_query: sql });
            if (error) {
                // Si no existe la funcion RPC, intentamos por query normal si el cliente lo permite
                // Nota: El cliente de JS no permite DDL directamente sin RPC o extensiones.
                // Pero podemos intentar ver si 'productos' tiene las columnas.
                console.warn(`⚠️ Error ejecutando SQL: ${error.message}`);
                console.log(`Intentando via REST (esto podria fallar si la columna no existe)...`);
            } else {
                console.log(`✅ Ejecutado: ${sql.substring(0, 50)}...`);
            }
        } catch (e) {
            console.error(`❌ Fallo crítico: ${e.message}`);
        }
    }
}

syncSchema();
