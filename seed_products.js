const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function seed() {
    console.log('🌱 Reseteando y sembrando productos con datos limpios...');

    const products = [
        {
            id: 3,
            nombre: 'Neurofeet',
            categoria: 'prenda',
            descripcion: 'Calcetas de compresión diseñadas para aliviar piernas cansadas, neuropatía y várices. Se venden por pares.',
            stock: 23,
            beneficio_principal: 'Alivio instantáneo del dolor y mejor circulación. Diseño que no transparenta, ideal para uso diario.',
            modo_uso: 'Colocar como calcetín común, asegurando que la compresión llegue desde el tobillo hasta la pantorrilla.',
            manejo_objeciones: 'Si dicen que están caras, recuérdales que es una inversión en su salud y que duran meses. Ofrece el Recovery si es necesario.',
            hacks_expertos: 'Úsalas durante el día para evitar pesadez al final de la jornada. Lavar a mano para conservar la compresión.',
            reglas_especiales: 'Paquetes de 1 y 2 pares. No se vende individual una sola calceta.',
            imagen_url: 'https://vcywhbzhndjmqbkvtxuy.supabase.co/storage/v1/object/public/productos/neurofeet.png',
            prices: [
                { etiqueta: '1 Par', precio: 449, min_unidades: 1 },
                { etiqueta: 'Promo 2 Pares', precio: 799, min_unidades: 2 },
                { etiqueta: 'Recovery (10% off)', precio: 404, min_unidades: 1 }
            ],
            variants: [
                { nombre: 'S/M', stock: 12 },
                { nombre: 'L/XL', stock: 11 }
            ]
        },
        {
            id: 2,
            nombre: 'Clean Nails',
            categoria: 'aparato',
            descripcion: 'Dispositivo con tecnología de Luz UV e Infraroja diseñado para eliminar el hongo en la uña de forma efectiva y segura.',
            stock: 15,
            beneficio_principal: 'Tratamiento no invasivo, sin químicos y con resultados visibles en pocas semanas.',
            modo_uso: 'Colocar sobre la uña afectada por 7 minutos diarios. El aparato se apaga solo al terminar.',
            manejo_objeciones: 'Es mucho más barato que ir al podólogo varias veces. Funciona en uñas de manos y pies.',
            hacks_expertos: 'Sé constante, los mejores resultados se ven al mes de uso diario.',
            reglas_especiales: 'Garantía de 30 días contra defectos de fábrica.',
            imagen_url: 'https://vcywhbzhndjmqbkvtxuy.supabase.co/storage/v1/object/public/productos/clean_nails.png',
            prices: [
                { etiqueta: '1 Unidad', precio: 449, min_unidades: 1 },
                { etiqueta: 'Promo 2 Unidades', precio: 799, min_unidades: 2 },
                { etiqueta: 'Recovery (10% off)', precio: 404, min_unidades: 1 }
            ]
        },
        {
            id: 1,
            nombre: 'Cloud Pet',
            categoria: 'aparato',
            descripcion: 'Cepillo premium de vapor ultrasónico para mascotas. Es una herramienta de aseo que usa vapor frío para limpiar y masajear.',
            stock: 8,
            beneficio_principal: 'Elimina el pelo suelto mientras relaja a tu mascota con un masaje de vapor frío.',
            modo_uso: 'Llenar con agua, encender el vapor y cepillar suavemente a favor del pelo.',
            manejo_objeciones: 'No quema a la mascota (el vapor es frío). Facilita mucho la limpieza sin bañar con jabón.',
            hacks_expertos: 'Añade una gota de aceite esencial apto para mascotas en el agua para un aroma increíble.',
            reglas_especiales: 'Carga USB incluida.',
            imagen_url: 'https://vcywhbzhndjmqbkvtxuy.supabase.co/storage/v1/object/public/productos/cloud_pet.png',
            prices: [
                { etiqueta: '1 Unidad', precio: 399, min_unidades: 1 },
                { etiqueta: 'Promo 2 Unidades', precio: 699, min_unidades: 2 },
                { etiqueta: 'Recovery (10% off)', precio: 359, min_unidades: 1 }
            ]
        }
    ];

    for (const p of products) {
        console.log(`\n📦 Procesando: ${p.nombre}...`);
        
        // 1. Limpiar precios y variantes actuales
        await supabase.from('productos_precios').delete().eq('producto_id', p.id);
        await supabase.from('productos_variantes').delete().eq('producto_id', p.id);

        // 2. Actualizar producto principal
        const { id, prices, variants, ...prodData } = p;
        await supabase.from('productos').update(prodData).eq('id', id);

        // 3. Insertar nuevos precios
        if (prices) {
            await supabase.from('productos_precios').insert(prices.map(pr => ({ ...pr, producto_id: id })));
        }

        // 4. Insertar nuevas variantes
        if (variants) {
            await supabase.from('productos_variantes').insert(variants.map(v => ({ ...v, producto_id: id })));
        }

        console.log(`✅ ${p.nombre} actualizado correctamente.`);
    }

    console.log('\n✨ ¡Proceso completado! La base de datos está limpia.');
}

seed();
