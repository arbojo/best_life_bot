const tests = [
    { input: "$1,450.50", expected: 1450.50 },
    { input: "1200", expected: 1200 },
    { input: "Precio: 500 pesos", expected: 500 },
    { input: "$ 2,000.00 MXN", expected: 2000 },
    { input: "gratis", expected: 0 },
    { input: "1.500", expected: 1.5 }, // Ojo: en JS 1.500 es 1.5. Si es mil, debería ser 1500.
    { input: "1,500", expected: 1500 }
];

function cleanPrice(p) {
    if (!p) return 0;
    // Eliminamos todo excepto números y el punto decimal
    const cleaned = String(p).replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
}

console.log("🧪 VALIDACIÓN DE LIMPIEZA DE PRECIOS\n");
let successCount = 0;

tests.forEach(({ input, expected }, i) => {
    const result = cleanPrice(input);
    const pass = result === expected;
    if (pass) successCount++;
    console.log(`Test ${i + 1}: [${input}] -> ${result} | ${pass ? '✅' : '❌ (Esperado: ' + expected + ')'}`);
});

console.log(`\n📊 Resultado: ${successCount}/${tests.length} pruebas pasadas.`);

if (successCount === tests.length) {
    console.log("\n🚀 TODO CORRECTO. La lógica es robusta para el mercado regional.");
} else {
    process.exit(1);
}
