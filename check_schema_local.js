const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkSchema() {
    console.log("Checking columns for table 'new_orders' via information_schema...");
    const { data: cols, error } = await supabase
        .from('information_schema_columns') // This might not work if not exposed, but worth a shot via rpc or raw query
        .select('column_name')
        .eq('table_name', 'new_orders');
    
    // Fallback: try to select just the metadata column to see if it triggers the same error
    console.log("Attempting to select 'metadata' column specifically...");
    const { error: err2 } = await supabase.from('new_orders').select('metadata').limit(0);
    
    if (err2) {
        console.error("❌ Error selecting 'metadata':", err2.message);
    } else {
        console.log("✅ 'metadata' column IS accessible directly.");
    }
}

checkSchema();
