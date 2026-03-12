/**
 * config.js
 * Centralized configuration and business rules.
 */
require('dotenv').config();

module.exports = {
    // API Keys & URLs
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY,
    PORT: process.env.PORT || 3000,

    // Switch de Simulación (Modo Sombra)
    // Default seguro: true. Solo es false si la env var es exactamente 'false'.
    SIMULATION_MODE: process.env.SIMULATION_MODE !== 'false',

    // WhatsApp Group IDs (Exact JIDs)
    // REQUERIDO: Reemplazar con el ID real (ej: 123456789@g.us)
    MTY_GROUP_ID: process.env.MTY_GROUP_ID || '120363324630453531@g.us', 

    // MTY Registrar - Campos Obligatorios (CONVENCIÓN CONGELADA)
    MTY_REQUIRED_FIELDS: [
        'Vendedora',
        'Cliente',
        'Número',
        'Dirección',
        'Colonia',
        'Ciudad/Municipio',
        'Estado',
        'Producto',
        'Cantidad',
        'Precio',
        'Día de entrega'
    ],

    // MTY Registrar - Campos Opcionales (CONVENCIÓN CONGELADA)
    MTY_OPTIONAL_FIELDS: [
        'CP',
        'Entre calles',
        'Referencias',
        'Ruta'
    ],

    // Global Business Rules
    RULES: {
        SAME_DAY_CUTOFF_HOUR: 16, // 4 PM
        SAME_DAY_CITY: 'León',    // Solo León tiene entrega el mismo día
        RECOVERY_DISCOUNT: 0.10   // 10%
    }
};
