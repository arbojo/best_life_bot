require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkStorage() {
    const { data, error } = await supabase.storage.from('productos').list();
    if (error) {
        console.error('Error listing bucket:', error.message);
    } else {
        console.log('Files in "productos" bucket:');
        if (data.length === 0) {
            console.log('(Empty bucket)');
        }
        data.forEach(f => console.log(`- ${f.name}`));
    }
}

checkStorage();
