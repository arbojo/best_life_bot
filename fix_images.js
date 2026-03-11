require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function fixImages() {
    console.log('Fetching products...');
    const { data: productos, error: fetchError } = await supabase.from('productos').select('*');
    
    if (fetchError) {
        console.error('Error fetching:', fetchError);
        return;
    }

    let updatedCount = 0;
    for (const prod of productos) {
        if (prod.imagen_url && prod.imagen_url.includes('vcywhbzhndjmqbkvtxuy.supabase.co')) {
            const newUrl = prod.imagen_url.replace('vcywhbzhndjmqbkvtxuy.supabase.co', 'aveusacpaexwrfoyinas.supabase.co');
            console.log(`Updating ${prod.nombre}: ${newUrl}`);
            const { error: updateError } = await supabase.from('productos').update({ imagen_url: newUrl }).eq('id', prod.id);
            if (updateError) {
                console.error(`Error updating ${prod.id}:`, updateError);
            } else {
                updatedCount++;
            }
        }
    }
    console.log(`Updated ${updatedCount} products.`);
}

fixImages();
