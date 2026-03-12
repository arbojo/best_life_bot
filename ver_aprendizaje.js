const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkLearning() {
    console.log('📊 REPORTES DE APRENDIZAJE - MÍA VENTAS\n');
    
    // 1. Conteo total
    const { count, error: cError } = await supabase
        .from('logs_ventas')
        .select('*', { count: 'exact', head: true });
    
    if (cError) {
        console.error('❌ Error al conectar:', cError.message);
        return;
    }

    console.log(`✅ Ejemplos capturados hoy: ${count || 0}`);

    // 2. Últimas lecciones
    const { data: logs, error: lError } = await supabase
        .from('logs_ventas')
        .select('cliente_tel, respuesta, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (logs && logs.length > 0) {
        console.log('\n📜 ÚLTIMAS 5 LECCIONES CAPTURADAS:');
        logs.forEach((l, i) => {
            console.log(`\n--- Lección #${logs.length - i} ---`);
            console.log(`📱 Cliente: ${l.cliente_tel}`);
            console.log(`✍️ Tu respuesta: "${l.respuesta.substring(0, 100)}${l.respuesta.length > 100 ? '...' : ''}"`);
            console.log(`⏰ Hora: ${new Date(l.created_at).toLocaleTimeString()}`);
        });
    } else {
        console.log('\n😴 Aún no he capturado nada. ¡En cuanto respondas un chat, aparecerá aquí!');
    }

    console.log('\n💡 Sugerencia: Ejecuta este script ("node ver_aprendizaje.js") cada que quieras ver el progreso.');
}

checkLearning();
