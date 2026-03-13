/**
 * schema_audit.js
 * Comprehensive database schema audit.
 */
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_KEY);

async function runAudit() {
    console.log("--- AUDITORÍA DE ESQUEMA SUPABASE ---");

    const relevantTables = [
        'new_orders', 
        'new_products', 
        'product_prices', 
        'product_media', 
        'registrar_simulation_logs', 
        'chat_logs', 
        'customers',
        'orders',
        'products',
        'logs',
        'sessions'
    ];

    console.log("\n[1] Tablas Detectadas y Estructura:");
    
    for (const table of relevantTables) {
        try {
            const { data: cols, error: colErr } = await supabase.from(table).select('*').limit(1);
            
            if (colErr) {
                if (colErr.message.includes("does not exist")) {
                    // Silencio para tablas que no existen
                } else {
                    console.log(`- ⚠️ ${table}: Error (${colErr.message})`);
                }
            } else {
                console.log(`- ✅ ${table}`);
                const columnNames = cols && cols[0] ? Object.keys(cols[0]) : "Tabla Vacía (No se pueden detectar columnas sin RPC)";
                console.log(`  Columnas: ${Array.isArray(columnNames) ? columnNames.join(', ') : columnNames}`);
            }
        } catch (e) {
            console.log(`- ❌ ${table}: Error inesperado (${e.message})`);
        }
    }

    console.log("\n--- FIN DE AUDITORÍA ---");
}

runAudit().catch(console.error);
