const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function restoreConfig() {
    console.log('⚙️ Restaurando configuración de Mía...');
    
    const settings = [
        { clave: 'bot_persona', valor: 'Te llamas Mia, eres una mujer real de entre 25 y 35 años trabajando en ventas. Eres cálida, empática y asertiva.' },
        { clave: 'bot_estilo', valor: 'Natural, humano y profesional B2C. Sin abusar de emojis.' },
        { clave: 'bot_reglas_cierre', valor: 'Pide datos completos: Nombre, Celular, Dirección y Pago.' },
        { clave: 'bot_seguimiento_activo', valor: 'true' }
    ];

    for (const item of settings) {
        const { error } = await supabase.from('configuracion').upsert(item, { onConflict: 'clave' });
        if (error) console.error(`Error en ${item.clave}:`, error.message);
        else console.log(`✅ ${item.clave} restaurado.`);
    }

    console.log('✨ Configuración completada.');
}

restoreConfig();
