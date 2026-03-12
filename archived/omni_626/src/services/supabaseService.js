const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
    constructor() {
        this.client = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_KEY
        );
    }

    async getProductos() {
        const { data, error } = await this.client.from('productos').select('*').eq('active', true);
        if (error) throw error;
        return data;
    }

    async getCliente(telefono) {
        const { data, error } = await this.client.from('clientes').select('*').eq('telefono', telefono).maybeSingle();
        if (error) throw error;
        return data;
    }

    async upsertCliente(clienteData) {
        const { data, error } = await this.client.from('clientes').upsert(clienteData).select().single();
        if (error) throw error;
        return data;
    }

    async guardarPedido(pedidoData) {
        const { data, error } = await this.client.from('pedidos').insert(pedidoData).select().single();
        if (error) throw error;
        return data;
    }

    async guardarLog(logData) {
        const { error } = await this.client.from('logs_ventas').insert(logData);
        if (error) throw error;
    }
}

module.exports = new SupabaseService();
