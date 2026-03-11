require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuración Hugging Face
// const hf = new HfInference(process.env.HF_TOKEN);

app.get('/', async (req, res) => {
    // Prueba rápida de conexión a la base de datos
    const { data, error } = await supabase.from('productos').select('count');
    res.json({ 
        message: "Omni-626 API is running", 
        status: "online",
        database: error ? "error" : "connected",
        db_details: error || data
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor Omni-626 iniciado en puerto ${PORT}`);
});
