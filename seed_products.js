const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function seed() {
    console.log('🌱 Reseteando y sembrando productos con datos limpios (Nuevo Esquema)...');

    const products = [
        {
            name: 'Neurofeet',
            category: 'prenda',
            description: 'Calcetas de compresión diseñadas para aliviar piernas cansadas, neuropatía y várices. Se venden por pares.',
            main_benefit: 'Alivio instantáneo del dolor y mejor circulación. Diseño que no transparenta, ideal para uso diario.',
            usage_instructions: 'Colocar como calcetín común, asegurando que la compresión llegue desde el tobillo hasta la pantorrilla.',
            objection_handling: 'Si dicen que están caras, recuérdales que es una inversión en su salud y que duran meses. Ofrece el Recovery si es necesario.',
            expert_hacks: 'Úsalas durante el día para evitar pesadez al final de la jornada. Lavar a mano para conservar la compresión.',
            is_active: true,
            prices: [
                { label: '3 Pares', price: 449, min_quantity: 3, is_recovery: false },
                { label: '5 Pares', price: 599, min_quantity: 5, is_recovery: false },
                { label: 'Recovery (3 pares)', price: 404.10, min_quantity: 3, is_recovery: true },
                { label: 'Recovery (5 pares)', price: 539.10, min_quantity: 5, is_recovery: true }
            ],
            variants: [
                { name: 'S/M', stock_quantity: 12 },
                { name: 'L/XL', stock_quantity: 11 }
            ]
        },
        {
            name: 'Clean Nails',
            category: 'aparato',
            description: 'Dispositivo con tecnología de Luz UV e Infraroja diseñado para eliminar el hongo en la uña de forma efectiva y segura.',
            main_benefit: '✨ Cambio de coloración desde el día 5\n✅ Sin dolor\n🏆 Resultados garantizados',
            usage_instructions: 'Colocar sobre la uña afectada por 7 minutos diarios. El aparato se apaga solo al terminar.',
            objection_handling: 'Es mucho más barato que ir al podólogo varias veces. Funciona en uñas de manos y pies.',
            expert_hacks: 'El tratamiento completo requiere un ciclo de crecimiento de la uña (meses) para que crezca sana. ¡No lo suspendas al ver el primer cambio!',
            is_active: true,
            prices: [
                { label: '1 Pieza', price: 449, min_quantity: 1, is_recovery: false },
                { label: 'Promo 2 piezas', price: 599, min_quantity: 2, is_recovery: false },
                { label: 'Recovery (1 pieza)', price: 404.10, min_quantity: 1, is_recovery: true },
                { label: 'Recovery (2 piezas)', price: 539.10, min_quantity: 2, is_recovery: true }
            ]
        },
        {
            name: 'Cloud Pet',
            category: 'aparato',
            description: 'Cepillo premium de vapor ultrasónico para mascotas. Es una herramienta de aseo que usa vapor frío para limpiar y masajear.',
            main_benefit: 'Elimina el pelo suelto mientras relaja a tu mascota con un masaje de vapor frío.',
            usage_instructions: 'Llenar con agua, encender el vapor y cepillar suavemente a favor del pelo.',
            objection_handling: 'No quema a la mascota (el vapor es frío). Facilita mucho la limpieza sin bañar con jabón.',
            expert_hacks: 'Añade una gota de aceite esencial apto para mascotas en el agua para un aroma increíble.',
            is_active: true,
            prices: [
                { label: '1 Unidad', price: 349, min_quantity: 1, is_recovery: false },
                { label: 'Promo 2 Unidades', price: 499, min_quantity: 2, is_recovery: false },
                { label: 'Recovery (1 unidad)', price: 314.10, min_quantity: 1, is_recovery: true },
                { label: 'Recovery (2 unidades)', price: 449.10, min_quantity: 2, is_recovery: true }
            ]
        }
    ];

    for (const p of products) {
        console.log(`\n📦 Procesando: ${p.name}...`);
        
        const { prices, variants, ...prodData } = p;

        // 1. Buscar si ya existe por nombre en new_products
        let { data: existing } = await supabase
            .from('new_products')
            .select('id')
            .eq('name', p.name)
            .maybeSingle();

        let productId;

        if (existing) {
            const { data: updated, error: updateError } = await supabase
                .from('new_products')
                .update(prodData)
                .eq('id', existing.id)
                .select()
                .single();
            if (updateError) {
                console.error(`❌ Error actualizando ${p.name}:`, updateError.message);
                continue;
            }
            productId = updated.id;
        } else {
            const { data: inserted, error: insertError } = await supabase
                .from('new_products')
                .insert(prodData)
                .select()
                .single();
            if (insertError) {
                console.error(`❌ Error insertando ${p.name}:`, insertError.message);
                continue;
            }
            productId = inserted.id;
        }

        // 2. Limpiar y Re-insertar precios
        await supabase.from('product_prices').delete().eq('product_id', productId);
        if (prices) {
            const { error: prError } = await supabase.from('product_prices').insert(
                prices.map(pr => ({ ...pr, product_id: productId }))
            );
            if (prError) console.error(`   ❌ Error precios:`, prError.message);
        }

        // 3. Limpiar y Re-insertar variantes
        await supabase.from('product_variants').delete().eq('product_id', productId);
        if (variants) {
            const { error: vError } = await supabase.from('product_variants').insert(
                variants.map(v => ({ ...v, product_id: productId }))
            );
            if (vError) console.error(`   ❌ Error variantes:`, vError.message);
        }

        console.log(`✅ ${p.name} sincronizado con ID: ${productId}`);
    }

    console.log('\n✨ ¡Proceso completado! El nuevo esquema está poblado.');
}

seed();
