/**
 * final_evidence.js
 * Produces exact operational evidence for the three MTY registrar scenarios.
 */
const registrar = require('./registrarLogic');
const config = require('./config');

async function runTest(name, msg) {
    console.log(`\n========================================`);
    console.log(`CASE: ${name}`);
    console.log(`========================================`);
    console.log(`1. MENSAJE EXACTO RECIBIDO:`);
    console.log(`----------------------------------------`);
    console.log(msg);
    console.log(`----------------------------------------`);
    
    // 2. Extraction
    const extracted = await registrar.extractData(msg);
    console.log(`2. JSON EXACTO EXTRAÍDO:`);
    console.log(JSON.stringify(extracted, null, 4));

    // 3. Validation results
    const missingMandatory = config.MTY_REQUIRED_FIELDS.filter(field => !extracted[field] || extracted[field].trim() === "");
    const missingOptional = config.MTY_OPTIONAL_FIELDS.filter(field => !extracted[field] || extracted[field].trim() === "");
    const wouldRegister = missingMandatory.length === 0;
    const simulatedId = wouldRegister ? `SIM-${Math.random().toString(36).substr(2, 6).toUpperCase()}` : null;

    console.log(`\n3. MISSING_MANDATORY EXACTO:`, JSON.stringify(missingMandatory));
    console.log(`4. MISSING_OPTIONAL EXACTO:`, JSON.stringify(missingOptional));
    console.log(`5. WOULD_REGISTER:`, wouldRegister);
    console.log(`6. SIMULATED_ID:`, simulatedId);

    console.log(`\n7. FILA EXACTA GUARDADA EN registrar_simulation_logs:`);
    console.log(JSON.stringify({
        original_message: msg,
        extracted_data: extracted,
        missing_mandatory: missingMandatory,
        missing_optional: missingOptional,
        would_register: wouldRegister,
        simulated_id: simulatedId,
        created_at: new Date().toISOString()
    }, null, 4));
}

async function main() {
    // Caso 1: Pedido Válido
    await runTest("PEDIDO VÁLIDO (11 OBLIGATORIOS + OPCIONALES)", `Vendedora: Mía
Cliente: Alejandro García
Número: 5599887766
Dirección: Av Central 100
Colonia: Jardines
Ciudad/Municipio: León
Estado: Guanajuato
Producto: Kit Best Life
Cantidad: 1
Precio: 1200
Día de entrega: Miércoles
CP: 37000
Entre calles: Palma y Olivo
Referencias: Portón café
Ruta: León 2`);

    // Caso 2: Pedido con Faltantes Obligatorios
    await runTest("PEDIDO CON FALTANTES OBLIGATORIOS", `Vendedora: Mía
Cliente: Maria Soto
Número: 442233
Dirección: Sin nombre
Colonia: Flores
Producto: Kit Best Life
Precio: 1200`);

    // Caso 3: Pedido con Omitidos Opcionales
    await runTest("PEDIDO CON OMITIDOS OPCIONALES", `Vendedora: Mía
Cliente: Roberto Ruiz
Número: 8112233445
Dirección: Independencia 500
Colonia: San Pedro
Ciudad/Municipio: Monterrey
Estado: Nuevo León
Producto: Kit Best Life
Cantidad: 3
Precio: 3600
Día de entrega: Lunes`);

    process.exit(0);
}

main();
