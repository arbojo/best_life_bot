require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importar Servicios
const supabaseService = require('./src/services/supabaseService');
const hfService = require('./src/services/hfService');
const shopManager = require('./src/services/shopManager');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// RUTAS DE TIENDAS
app.post('/api/tienda/iniciar', async (req, res) => {
    const { tiendaId, nombre } = req.body;
    try {
        await shopManager.inicializarTienda(tiendaId, nombre);
        res.json({ message: `Iniciando sesión para ${nombre}... Revisa la consola para el QR.` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// RUTAS DE PRUEBA
app.get('/api/status', async (req, res) => {
    try {
        const { data, error } = await supabaseService.client.from('productos').select('count');
        res.json({ 
            status: "online", 
            database: error ? "error" : "connected",
            ai_ready: !!process.env.HF_TOKEN && !process.env.HF_TOKEN.includes('TU_HUGGING_FACE')
        });
    } catch (e) {
        res.status(500).json({ status: "error", message: e.message });
    }
});

// Endpoint para que el Dashboard vea los productos reales
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await supabaseService.getProductos();
        res.json(productos);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// INICIO DEL SERVIDOR
app.listen(PORT, () => {
    console.log(`🚀 Motor Omni-626 rugiendo en puerto ${PORT}`);
    console.log(`📂 Backend estructurado y listo para el Experimento.`);
});
