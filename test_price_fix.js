const registrarLogic = require('./registrarLogic');
const db = require('./database');

async function testPriceCleaning() {
    console.log("🧪 Test: Simulando extracción de pedido con precio formateado...");
    
    // Mock de datos extraídos por la IA (simulando casos que fallaban antes)
    const testData = {
        "Vendedora": "Maria",
        "Cliente": "Juan Perez",
        "Número": "5512345678",
        "Dirección": "Calle Falsa 123",
        "Colonia": "Centro",
        "Ciudad/Municipio": "Monterrey",
        "Estado": "Nuevo León",
        "Producto": "Producto Test",
        "Cantidad": "2",
        "Precio": "$1,450.50 pesos", // Caso complejo
        "Día de entrega": "Lunes"
    };

    console.log("\nDatos de prueba:");
    console.log(JSON.stringify(testData, null, 2));

    // Probar limpieza en el objeto antes de ir a DB
    const cleanPrice = parseFloat(String(testData.Precio).replace(/[^0-9.]/g, ''));
    console.log(`\nPrecio original: "${testData.Precio}"`);
    console.log(`Precio limpio (parseFloat + regex): ${cleanPrice}`);

    if (cleanPrice === 1450.5) {
        console.log("\n✅ PRUEBA EXITOSA: El precio se limpió correctamente.");
    } else {
        console.log("\n❌ PRUEBA FALLIDA: El precio no es el esperado.");
    }
}

testPriceCleaning().catch(console.error);
