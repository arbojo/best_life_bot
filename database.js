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
    async saveRegisteredOrder(orderData) {
        const { data, error } = await supabase
            .from('new_orders')
            .insert([{
                customer_phone: orderData.Número,
                shipping_details: `${orderData.Cliente} | ${orderData.Dirección}, ${orderData.Colonia}, ${orderData.Ciudad_Municipio}, ${orderData.Estado} | Ref: ${orderData.Referencias || 'N/A'}`,
                items_summary: `${orderData.Cantidad}x ${orderData.Producto}`,
                total_amount: parseFloat(orderData.Precio) || 0,
                status: 'REGISTERED_MTY',
                metadata: orderData // Store raw extracted data
            }])
            .select()
            .single();
        
        if (error) throw error;
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
     * Save simulation log for shadow mode.
     */
    async saveSimulationLog(logData) {
        return supabase.from('registrar_simulation_logs').insert([logData]);
    }
};
