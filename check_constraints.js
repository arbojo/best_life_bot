const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkConstraints() {
    console.log("Checking foreign key constraints for 'new_orders'...");
    const { data: constraints, error } = await supabase.rpc('get_table_constraints', { t_name: 'new_orders' });
    
    if (error) {
        // Fallback: try to just drop the known one if we are sure of the name from the error message
        console.log("RPC failed. The error message said: new_orders_customer_phone_fkey");
    } else {
        console.log("Constraints found:", JSON.stringify(constraints, null, 2));
    }
}

checkConstraints();
