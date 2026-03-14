const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_KEY);

async function patchSchema() {
    console.log("🛠️ Intentando crear tablas faltantes vía API...");

    // Si no podemos usar SQL directo, intentamos insertar un registro dummy para forzar creación (si Supabase lo permite)
    // Pero lo ideal es usar el cliente para ver si las tablas existen primero
    
    const tables = ['system_logs', 'channels'];
    
    for (const table of tables) {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error && error.message.includes("not find")) {
            console.log(`❌ La tabla '${table}' NO existe en Supabase.`);
            console.log(`⚠️ Por favor, ejecuta este SQL en tu consola de Supabase (SQL Editor):`);
            if (table === 'system_logs') {
                console.log(`
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level TEXT DEFAULT 'info',
    message TEXT NOT NULL,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo" ON public.system_logs FOR ALL USING (true);
                `);
            } else {
                console.log(`
CREATE TABLE IF NOT EXISTS public.channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    platform TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo" ON public.channels FOR ALL USING (true);
                `);
            }
        } else {
            console.log(`✅ La tabla '${table}' ya existe o es accesible.`);
        }
    }
}

patchSchema().catch(console.error);
