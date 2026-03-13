/**
 * registrarLogic.js
 * Processes order messages in the MTY Group.
 */
const { OpenAI } = require('openai');
const db = require('./database');
const config = require('./config');

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

module.exports = {
    /**
     * Handle messages from the MTY group.
     */
    async handleGroupMessage(mensaje, metadata = {}) {
        try {
            // Handle ID-based queries first
            const queryResponse = await this.handleQuery(mensaje);
            if (queryResponse) return queryResponse;

            // Otherwise, attempt order extraction
            const extracted = await this.extractData(mensaje);
            if (!extracted) return null;

            // Validate mandatory fields (11 fields)
            const missingMandatory = config.MTY_REQUIRED_FIELDS.filter(field => {
                const val = extracted[field];
                return !val || (typeof val === 'string' && val.trim().length === 0);
            });
            
            const wouldRegister = missingMandatory.length === 0;

            // Check optional fields
            const missingOptional = config.MTY_OPTIONAL_FIELDS.filter(field => {
                const val = extracted[field];
                return !val || (typeof val === 'string' && val.trim().length === 0);
            });

            // Production vs Simulation logic
            // Para simulación: MTY-S + 4 caracteres aleatorios
            const simulatedId = wouldRegister ? `MTY-S${Math.random().toString(36).substr(2, 4).toUpperCase()}` : null;
            
            // Check for potential duplicate (regardless of simulation mode)
            let duplicateId = null;
            if (wouldRegister) {
                duplicateId = await db.findPotentialDuplicate(
                    extracted.Número, 
                    extracted.Producto, 
                    extracted.Cantidad,
                    config.SIMULATION_MODE // Pass flag to scope search
                );
            }

            if (config.SIMULATION_MODE) {
                await this.logSimulationResult({
                    mensaje,
                    metadata,
                    extracted,
                    missingMandatory,
                    missingOptional,
                    wouldRegister,
                    simulatedId,
                    duplicateId
                });

                // Save to Simulation Log table
                await db.saveSimulationLog({
                    original_message: mensaje,
                    extracted_data: extracted,
                    missing_mandatory: missingMandatory,
                    missing_optional: missingOptional,
                    would_register: wouldRegister,
                    simulated_id: simulatedId
                    // Se omite duplicate_id por compatibilidad de esquema actual
                });

                return null; // Shadow mode: No reply to group
            }

            // Production: Save to DB
            if (!wouldRegister) {
                return `❌ No se registró. Faltan datos mínimos: ${missingMandatory.join(', ')}`;
            }

            const saved = await db.saveRegisteredOrder(extracted, {
                text: mensaje,
                groupId: metadata.chat_id,
                author: metadata.author,
                timestamp: metadata.messageTimestamp,
                is_duplicate: !!duplicateId,
                duplicate_of: duplicateId
            });
            // Formato secuencial real estable via tracking_id
            const mtyId = `MTY-${String(saved.tracking_id).padStart(5, '0')}`;
            
            // Response format (DOS LÍNEAS exactas si hay duplicado)
            let response = `✅ Pedido registrado | ID: ${mtyId}`;
            if (duplicateId) {
                response += `\n⚠️ Posible duplicado con ${duplicateId}`;
            }
            if (missingOptional.length > 0) {
                response += `\nℹ️ Omitidos: ${missingOptional.join(', ')}`;
            }
            return response;

        } catch (err) {
            console.error("\n==================================================");
            console.error("❌ ERROR CRITICO EN REGISTRADOR MTY");
            console.error("Mensaje:", mensaje);
            console.error("Error:", err.message);
            console.error("==================================================\n");
            return config.SIMULATION_MODE ? null : "❌ Error interno al procesar el pedido.";
        }
    },

    /**
     * Extraction logic using IA.
     */
    async extractData(text) {
        const prompt = `Actúa como extractor de datos de pedidos de WhatsApp. 
Extrae la información del siguiente mensaje y devuélvela UNICAMENTE en este formato JSON exacto.
Si un campo no está presente, déjalo como cadena vacía "". No inventes datos.

{
    "Vendedora": "Nombre de quien vende",
    "Cliente": "Nombre del cliente",
    "Número": "Teléfono de contacto",
    "Dirección": "Calle y número",
    "Colonia": "Colonia",
    "Ciudad/Municipio": "Ciudad o Municipio",
    "Estado": "Estado",
    "Producto": "Nombre del producto",
    "Cantidad": "Cantidad solicitada",
    "Precio": "Precio total o unitario indicado",
    "Día de entrega": "Fecha o día prometido",
    "CP": "Código Postal",
    "Entre calles": "Cruces de calles",
    "Referencias": "Color de casa, fachada, etc.",
    "Ruta": "Ruta asignada o zona"
}

MENSAJE ORIGINAL:
"${text}"`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'system', content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0
        });

        return JSON.parse(response.choices[0].message.content);
    },

    /**
     * Handle direct queries by ID.
     */
    async handleQuery(text) {
        const match = text.match(/consultar (MTY-\w+)/i);
        if (match) {
            const id = match[1].toUpperCase();
            
            // Check in simulation logs first
            const { data: simLog } = await supabase
                .from('registrar_simulation_logs')
                .select('*')
                .eq('simulated_id', id)
                .single();

            if (simLog) {
                return `🔎 [MODO SIMULACIÓN] El ID ${id} representa un registro de prueba exitoso en los logs de sombra.`;
            }

            // Real DB query
            const order = await db.getOrderById(id);
            if (order) {
                return `📦 Pedido ${id} encontrado:\n- Cliente: ${order.metadata?.Cliente}\n- Estado: ${order.status}\n- Registrado el: ${new Date(order.created_at).toLocaleString()}`;
            }
            return `❌ Pedido ${id} no encontrado.`;
        }
        return null;
    },

    /**
     * Prints high-visibility simulation logs to console.
     */
    async logSimulationResult({ mensaje, metadata, extracted, missingMandatory, missingOptional, wouldRegister, simulatedId, duplicateId }) {
        const timestamp = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
        
        console.log("\n==================================================");
        console.log("[MTY][SIMULATION] Nuevo mensaje detectado");
        console.log("==================================================");
        console.log(`Grupo: ${metadata.chat_id || 'N/A'}`);
        console.log(`Autor: ${metadata.author || 'N/A'}`);
        console.log(`Fecha: ${timestamp}`);
        console.log("\nMensaje original:");
        console.log("----------------------------------------");
        console.log(mensaje);
        console.log("----------------------------------------");
        console.log("\nDatos extraídos:");
        console.log(JSON.stringify(extracted, null, 2));
        console.log("\nObligatorios faltantes:");
        console.log(JSON.stringify(missingMandatory));
        console.log("\nOpcionales omitidos:");
        console.log(JSON.stringify(missingOptional));
        console.log("\nResultado:");
        console.log(`- ¿Se registraría?: ${wouldRegister ? "SÍ ✅" : "NO ❌"}`);
        console.log(`- MTY-ID: ${simulatedId || "null"} (Simulado)`);
        console.log(`- ¿Duplicado?: ${duplicateId ? `SÍ (con ${duplicateId}) ⚠️` : "NO"}`);
        console.log(`- Guardado en: registrar_simulation_logs`);
        console.log("\nResumen corto:");
        if (wouldRegister) {
            console.log(`[MTY][SIMULATION][OK] ${simulatedId}${duplicateId ? ` (⚠️ Duplicado con ${duplicateId})` : ""}`);
        } else {
            console.log(`[MTY][SIMULATION][REJECTED] Faltan: ${missingMandatory.join(', ')}`);
        }
        console.log("==================================================\n");
    }
};
