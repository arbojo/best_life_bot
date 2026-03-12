const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function cleanSchema() {
    console.log('🧹 Limpiando esquema de Supabase Ohio...');
    
    const queries = [
        "ALTER TABLE public.productos DROP COLUMN IF EXISTS precio_principal;",
        "ALTER TABLE public.productos ALTER COLUMN precio DROP NOT NULL;",
        "ALTER TABLE public.productos ADD CONSTRAINT unique_nombre UNIQUE (nombre);"
    ];

    for (const q of queries) {
        try {
            const { error } = await supabase.rpc('execute_sql_internal', { sql_query: q });
            if (error) {
                console.warn(`⚠️ Aviso en '${q.substring(0, 30)}...':`, error.message);
            } else {
                console.log(`✅ Éxito: ${q.substring(0, 30)}...`);
            }
        } catch (e) {
            console.error(`❌ Fallo en '${q.substring(0, 30)}...':`, e.message);
        }
    }
    console.log('✨ Limpieza terminada.');
}

cleanSchema();
