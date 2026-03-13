/**
 * database.js
 * Supabase wrapper for data access.
 */
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_KEY);

module.exports = {
    /**
     * Fetch all active products with prices and media.
     */
    async getCatalogo() {
        const { data: productos } = await supabase.from('new_products').select('*').eq('is_active', true);
        const { data: precios } = await supabase.from('product_prices').select('*');
        const { data: media } = await supabase.from('product_media').select('*');

        return (productos || []).map(p => ({
            ...p,
            product_prices: precios ? precios.filter(pr => pr.product_id === p.id) : [],
            product_media: media ? media.filter(m => m.product_id === p.id) : []
        }));
    },

    /**
     * Save a registered order from a group.
     */
    async saveRegisteredOrder(orderData, msgMetadata = {}) {
        const { data, error } = await supabase
            .from('new_orders')
            .insert([{
                customer_phone: orderData.Número,
                customer_name: orderData.Cliente,
                seller_name: orderData.Vendedora,
                address: orderData.Dirección,
                neighborhood: orderData.Colonia,
                city_municipality: orderData.Ciudad_Municipio,
                state: orderData.Estado,
                zip_code: orderData.CP || null,
                cross_streets: orderData.Entre_calles || null,
                references: orderData.Referencias || null,
                product_desc: orderData.Producto,
                quantity: parseInt(orderData.Cantidad) || 1,
                total_amount: parseFloat(orderData.Precio) || 0,
                delivery_day: orderData.Día_de_entrega,
                route: orderData.Ruta || null,
                status: 'REGISTERED_MTY',
                original_msg: msgMetadata.text || null,
                group_id: msgMetadata.groupId || null,
                author_id: msgMetadata.author || null,
                message_ts: msgMetadata.timestamp ? new Date(msgMetadata.timestamp * 1000).toISOString() : null,
                metadata: orderData // Respaldo JSON completo
            }])
            .select('id, tracking_id')
            .single();
        
        if (error) {
            console.error("❌ Error saving registered order:", error.message);
            throw error;
        }
        return data;
    },

    /**
     * Get order by MTY ID.
     */
    async getOrderById(id) {
        // Since we use UUIDs internally, we might need a specific MTY_ID column 
        // or search in metadata. For now, we'll assume the user wants to search by the generated ID.
        const { data } = await supabase.from('new_orders').select('*').eq('id', id).single();
        return data;
    },

    /**
     * Log chat interactions.
     */
    async logChat(phone, message, response) {
        return supabase.from('chat_logs').insert([{ customer_phone: phone, message, response }]);
    },

    /**
     * Get customer context (tracking status, etc.)
     */
    async getCustomer(phone) {
        const { data } = await supabase.from('customers').select('*').eq('phone', phone).single();
        return data;
    },

    /**
     * Finds a potential duplicate order in the last 48 hours.
     * Criteria: Same phone, product and quantity.
     * Checks both new_orders and registrar_simulation_logs.
     */
    /**
     * Finds a potential duplicate order in the last 48 hours.
     * Criteria: Same phone, product and quantity.
     * @param {Boolean} isSimulation - If true, checks both real and sim logs. If false, only real orders.
     */
    async findPotentialDuplicate(phone, product, quantity, isSimulation = false) {
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

        // Always check Real Orders
        const { data: realOrder } = await supabase
            .from('new_orders')
            .select('id, tracking_id, metadata')
            .eq('customer_phone', phone)
            .gte('created_at', fortyEightHoursAgo)
            .order('created_at', { ascending: false });

        if (realOrder) {
            for (const order of realOrder) {
                const meta = order.metadata || {};
                const prod = meta.Producto || meta.product;
                const qty = meta.Cantidad || meta.quantity || meta.Quantity;
                if (prod === product && String(qty) === String(quantity)) {
                    // Use tracking_id for stable sequential ID
                    const seqId = order.tracking_id || order.id;
                    return `MTY-${String(seqId).padStart(5, '0')}`;
                }
            }
        }

        // Only check Simulation Logs if we are IN simulation mode
        if (isSimulation) {
            const { data: simLog } = await supabase
                .from('registrar_simulation_logs')
                .select('simulated_id, extracted_data')
                .gte('created_at', fortyEightHoursAgo)
                .order('created_at', { ascending: false });

            if (simLog) {
                for (const log of simLog) {
                    const ext = log.extracted_data || {};
                    const num = ext.Número || ext.Number || ext.numero;
                    const prod = ext.Producto || ext.product;
                    const qty = ext.Cantidad || ext.quantity;

                    if (num === phone && prod === product && String(qty) === String(quantity)) {
                        return log.simulated_id; // Already formatted as MTY-SXXXX or MTY-XXXXX
                    }
                }
            }
        }

        return null;
    },

    /**
     * Save simulation log for shadow mode.
     */
    async saveSimulationLog(logData) {
        const { data, error } = await supabase.from('registrar_simulation_logs').insert([logData]);
        if (error) {
            console.error("❌ Error saving simulation log:", error.message);
            throw error;
        }
        return data;
    }
};
