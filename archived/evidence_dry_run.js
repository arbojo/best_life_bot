/**
 * evidence_dry_run.js
 * Generates three specific test cases for registrar evidence.
 */
const registrar = require('./registrarLogic');

async function runTest(name, msg) {
    console.log(`\n--- TEST: ${name} ---`);
    console.log("MENSAJE RECIBIDO:");
    console.log(msg);
    
    // Simulate extraction
    const extracted = await registrar.extractData(msg);
    console.log("DATOS EXTRAÍDOS:", JSON.stringify(extracted, null, 2));

    const config = require('./config');
    const missingMandatory = config.MTY_REQUIRED_FIELDS.filter(field => !extracted[field] || extracted[field].trim() === "");
    const missingOptional = config.MTY_OPTIONAL_FIELDS.filter(field => !extracted[field] || extracted[field].trim() === "");
    
    console.log("FALTANTES DETECTADOS (Obligatorios):", missingMandatory);
    console.log("OMITIDOS DETECTADOS (Opcionales):", missingOptional);
    
    const wouldRegister = missingMandatory.length === 0;
    const simulatedId = `SIM-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    console.log("¿SE REGISTRARÍA?:", wouldRegister ? "SÍ ✅" : "NO ❌");
    if (wouldRegister) console.log("ID SIMULADO:", simulatedId);
    
    console.log("FILA PROYECTADA PARA DB:");
    console.log({
        original_message: msg,
        extracted_data: extracted,
        missing_mandatory: missingMandatory,
        missing_optional: missingOptional,
        would_register: wouldRegister,
        simulated_id: wouldRegister ? simulatedId : null
    });
}

async function main() {
    // 1. Pedido Válido
    await runTest("Pedido Válido", `Vendedora: Mía
Cliente: David Lopez
Número: 5512345678
Dirección: Plaza Mayor 45
Colonia: Centro
Ciudad/Municipio: León
Estado: Guanajuato
Producto: Kit Best Life
Cantidad: 1
Precio: 1200
Día de entrega: Martes
CP: 37000
Entre calles: Hidalgo y Morelos
Referencias: Fachada azul
Ruta: León 1`);

    // 2. Pedido con Faltantes Obligatorios
    await runTest("Pedido con Faltantes Obligatorios", `Vendedora: Mía
Cliente: Ana Maria
Número: 3322110044
Dirección: Av Insurgentes
Colonia: Roma
Producto: Kit Best Life
Precio: 1200
Ruta: CDMX SUR`);

    // 3. Pedido con Omitidos Opcionales
    await runTest("Pedido con Omitidos Opcionales", `Vendedora: Mía
Cliente: Carlos Ruiz
Número: 4422334455
Dirección: Libertad 10
Colonia: Industrial
Ciudad/Municipio: Queretaro
Estado: Queretaro
Producto: Kit Best Life
Cantidad: 2
Precio: 2400
Día de entrega: Miércoles`);

    process.exit(0);
}

main();
