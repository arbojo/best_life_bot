const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function updateSchema() {
    console.log('🏗️ Expandiendo esquema en Supabase Ohio...');
    
    const query = `
        ALTER TABLE public.productos 
        ADD COLUMN IF NOT EXISTS beneficio_principal TEXT,
        ADD COLUMN IF NOT EXISTS modo_uso TEXT,
        ADD COLUMN IF NOT EXISTS manejo_objeciones TEXT,
        ADD COLUMN IF NOT EXISTS hacks_expertos TEXT,
        ADD COLUMN IF NOT EXISTS categoria TEXT,
        ADD COLUMN IF NOT EXISTS reglas_especiales TEXT;
    `;

    try {
        const { error } = await supabase.rpc('execute_sql_internal', { sql_query: query });
        if (error) {
            console.error('❌ Error RPC:', error.message);
            console.log('Intenta ejecutar esto en el SQL Editor de Supabase:\n', query);
        } else {
            console.log('✅ Columnas añadidas correctamente.');
        }
    } catch (e) {
        console.error('❌ Error fatal:', e.message);
    }
}

updateSchema();
