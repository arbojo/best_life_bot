require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function setup() {
    console.log('🚀 Iniciando creación de tabla logs_ventas...');
    
    const { error } = await supabase.rpc('execute_sql_internal', {
        query: `
            CREATE TABLE IF NOT EXISTS logs_ventas (
                id SERIAL PRIMARY KEY,
                cliente_tel VARCHAR(50) NOT NULL,
                mensaje TEXT NOT NULL,
                respuesta TEXT NOT NULL,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
            );
        `
    }).catch(async (err) => {
        // Si RPC no está disponible, intentamos una inserción dummy para ver si la tabla ya existe
        // o simplemente reportamos que usaremos el método estándar de migración via código.
        console.log('Nota: El método RPC directo puede estar restringido. Intentando verificación alternativa...');
        return { error: err };
    });

    // Como alternativa, podemos intentar un query directo si la clave es de servicio, 
    // pero usualmente usamos la anon key. 
    // La mejor forma segura es informar al bot que la tabla se creará automáticamente 
    // si el código hace un insert y Supabase está configurado, 
    // pero para DDL lo mejor es que el usuario lo haga o usar el MCP (que está fallando).
    
    // Intentaremos crearla usando un truco de Supabase: si intentamos insertar en una tabla que no existe, falla.
    // Pero no podemos "crear" tablas vía el cliente JS estándar sin una función RPC de base.
    
    console.log('⚠️ El servidor MCP de Supabase está presentando una desconexión temporal (EOF).');
    console.log('He preparado el comando SQL para usted, pero por seguridad y limitaciones del cliente JS,');
    console.log('se recomienda ejecutarlo directamente en el dashboard si el MCP persiste desconectado.');
}

setup();
