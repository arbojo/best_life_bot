require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const express = require('express');
const path = require('path');

// --- Configuración ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

const userContexts = new Map();
/** 
 * MODOS DEL BOT:
 * 0 = APAGADO (Ignora todo)
 * 1 = ACTIVO (Procesa y responde en WhatsApp)
 * 2 = SIMULACIÓN (Procesa y muestra en Dashboard/Consola, pero NO responde en WhatsApp)
 */
let botMode = 1; 


// --- Funciones de Base de Datos ---
async function getCatalogoSupabase() {
    try {
        const { data, error } = await supabase.from('products').select('*').eq('active', true);
        if (error) throw error;
        console.log(`📦 Supabase: ${data.length} productos activos cargados.`);
        return data;
    } catch (err) {
        console.error('❌ Error Supabase:', err.message);
        return [];
    }
}

async function guardarLogVenta(cliente_tel, mensaje, respuesta) {
    try {
        const { error } = await supabase.from('logs_ventas').insert([{ cliente_tel, mensaje, respuesta }]);
        if (error) {
            console.error('❌ Error Supabase al guardar log:', error.message);
        } else {
            console.log(`📝 Log guardado exitosamente para: ${cliente_tel}`);
        }
    } catch (err) {
        console.error('❌ Excepción al guardar log:', err.message);
    }
}

// --- Dashboard API ---
const fs = require('fs');

app.get('/', (req, res) => {
    const dashboardPath = path.resolve(__dirname, 'dashboard.html');
    if (fs.existsSync(dashboardPath)) {
        res.sendFile(dashboardPath);
    } else {
        console.error(`❌ El archivo no existe en: ${dashboardPath}`);
        res.status(404).send(`Configuración pendiente: No se encontró el archivo dashboard.html en la ruta del servidor.`);
    }
});

app.get('/api/products', async (req, res) => {
    const { data } = await supabase.from('products').select('*').order('id', { ascending: false });
    res.json(data || []);
});

app.post('/api/products', async (req, res) => {
    const { data, error } = await supabase.from('products').insert([req.body]).select();
    if (error) return res.status(400).json(error);
    res.json(data[0]);
});

app.put('/api/products/:id', async (req, res) => {
    const { data, error } = await supabase.from('products').update(req.body).eq('id', req.params.id).select();
    if (error) return res.status(400).json(error);
    res.json(data[0]);
});

app.get('/api/interactions', async (req, res) => {
    const { tel } = req.query;
    let query = supabase.from('logs_ventas').select('*').order('timestamp', { ascending: false }).limit(50);
    
    if (tel) {
        query = query.ilike('cliente_tel', `%${tel}%`);
    }

    const { data, error } = await query;
    if (error) {
        console.error('❌ Error al recuperar interacciones de Supabase:', error.message);
        return res.status(500).json({ error: error.message });
    }
    res.json(data || []);
});

app.get('/api/bot/status', (req, res) => res.json({ mode: botMode }));

app.post('/api/bot/mode', (req, res) => {
    const { mode } = req.body;
    if ([0, 1, 2].includes(mode)) {
        botMode = mode;
        const info = ["APAGADO", "ACTIVO", "SIMULACIÓN"][mode];
        console.log(`🤖 Modo del Bot cambiado a: ${info}`);
        res.json({ mode: botMode, status: info });
    } else {
        res.status(400).json({ error: "Modo inválido" });
    }
});

// --- Cerebro del Agente ---
async function procesarMensaje(mensaje, telefono) {
    try {
        const catalogo = await getCatalogoSupabase();
        
        // --- Datos del Cliente ---
        const numeroCliente = telefono.split('@')[0];
        
        // --- Gancho de Envíos León ---
        const horaStr = new Date().toLocaleString('en-US', {timeZone: 'America/Mexico_City', hour: 'numeric', hour12: false});
        const horaActualGto = parseInt(horaStr);
        
        let ganchoEnvio = "";
        let diaEntrega = "";
        if (horaActualGto < 16) {
            diaEntrega = "HOY MISMO";
            ganchoEnvio = "🔥 GANCHO DE VENTA (SOLO EN LEÓN, GTO): Ofrece proactivamente ENTREGA HOY MISMO. Úsalo para presionar el cierre amablemente (ej: 'Si me confirmas tu pedido ahorita, te lo alcanzo a entregar HOY MISMO aquí en León 🚀').";
        } else {
            diaEntrega = "MAÑANA";
            ganchoEnvio = "⌛ GANCHO DE VENTA (SOLO EN LEÓN, GTO): Como ya pasaron las 4:00 pm, ofrece entrega garantizada para MAÑANA (ej: 'Como ya pasamos la hora de corte, si cerramos tu pedido ahorita te aparto el tuyo para ser de los primeros en entregarte MAÑANA 🚀').";
        }
        
        // Construimos un catálogo detallado que incluya ambos precios y datos extra
        const listadoProductos = catalogo.map(p => {
            let info = `- ${p.name}`;
            info += ` | Precio Unitario: $${p.price_1}`;
            if (p.price_2) info += ` | Precio por Paquete/Mayoreo: $${p.price_2}`;
            if (p.description) info += ` | Info: ${p.description}`;
            if (p.features) info += ` | Características: ${p.features}`;
            if (p.faq_short) info += ` | Dudas Frecuentes: ${p.faq_short}`;
            return info;
        }).join('\n');

        const sistemaPrompt = `
Eres la asesora de ventas estrella de Best Life en WhatsApp. Te llamas Mia. Eres HUMANA (mujer) y te comunicas como tal. Cuando hables de ti misma usa SIEMPRE adjetivos femeninos (ej: "estoy lista", "soy yo", "estoy segura").
NUNCA, bajo NINGUNA CIRCUNSTANCIA, reveles que eres una inteligencia artificial, un bot o un modelo de lenguaje. Si alguien te pregunta si eres un bot, responde con humor evadiendo la pregunta (ej: "¡Jaja para nada! Soy Mia, tu asesora de ventas, de carne y hueso 😊").

Tu estilo de comunicación:
- Amable y cercano, como alguien de confianza, no como un ejecutivo corporativo.
- Natural para WhatsApp: mensajes cortos, directos, sin ceremonias.
- Profesional pero humano. Puedes tutear si el cliente tutea, o usar "usted" si el cliente lo prefiere.
- Nunca uses frases como "Estimado cliente", "me complace informarle", "es un gusto saludarle" o "¿en qué más puedo asistirle?". Suenan falsas.
- Usa emojis con moderación si ayudan a la claridad (ej: ✅ para confirmar, 💳 para pago).

PRODUCTOS DISPONIBLES (Catálogo Real):
${listadoProductos.length > 0 ? listadoProductos : 'No hay productos disponibles en este momento.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGLAS DE ORO DE COMPORTAMIENTO:

1. SALUDOS Y NEUTRALIDAD:
   - Si el cliente solo saluda (ej: "hola", "buen día"), responde con un saludo amable y abierto.
2. INFORMACIÓN Y MANEJO DE DUDAS:
   - Tu fuente ÚNICA de verdad es el Catálogo Real de arriba. 
   - Si no sabes un dato técnico exacto (ej: duración de batería, ingredientes exactos, tiempos exactos), NUNCA admitas que no lo sabes. Prohibido decir "no lo tengo a la mano", "déjame revisarlo" o "no tengo esa información".
   - Responde siempre con seguridad enfocándote en los beneficios. Ejemplo: "Lo que te garantizo es que te dará excelentes resultados, es súper práctico y efectivo. Además, aprovecho para contarte que lo tenemos en promo a..."
   - Mantén la conversación fluida. Pivota siempre hacia lo que sí sabes (beneficios generales, precios, promos y cierre de venta).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGLAS ESPECÍFICAS DE PRODUCTOS:
- Cloud Pet = Cepillo de vapor / Aseo mascotas. (Regla: Si preguntan, SÍ es recargable por cable USB, tiene batería de larga duración, incluye cable).
- Clean Nails = Tratamiento de hongo en uña / Luz UV e Infraroja. (Regla: Si preguntan, SÍ es recargable, portátil, tratamiento rápido y sin dolor).
- Neurofeet = Calcetas de compresión / Piernas cansadas, Neuropatía, Várices. (Regla: Menciona siempre la promo de 3 pares por $449 y 5 pares por $599).

4. FORMATO Y POLÍTICA DE PRECIOS (ESTRICTO):
   - NUNCA inventes precios. Tus precios DEBEN ser extraídos EXACTAMENTE del 'Catálogo Real' que tienes arriba al inicio del prompt (Precio Unitario y Precio por Paquete).
   - Si el cliente pregunta por el precio o pide información de manera general (ej: "precio", "cuánto cuesta") SIN especificar un producto, DEBES preguntarle por cuál producto está interesado ANTES de darle precios o descripciones (ej: "¡Claro! Manejamos el Cloud Pet para mascotas y el Clean Nails. ¿De cuál te gustaría saber el precio? 😊"). NO adivines el producto.
   - Cuando el cliente SÍ especifique un producto y pregunte por información o precio, PRESÉNTALO SIEMPRE utilizando ESTE FORMATO atractivo y estructurado:
   
   *[NOMBRE DEL PRODUCTO EN MAYÚSCULAS] [Emoji del producto]*
   
   🔥 *PROMOCIÓN* 🔥
   
   1 Pieza x $[precio_1]
   2 Piezas x $[precio_2] (o la promo aplicable)
   
   ✨ [Beneficio 1]
   ✅ [Beneficio 2]
   🏆 [Beneficio 3 u objeción resuelta]
   
   Ejemplo para el Clean Nails:
   CLEAN NAILS 🦶
   
   🔥 PROMOCION 🔥
   
   1 Pieza x $449
   2 piezas x $599
   
   ✨ Elimina hongos desde el primer día
   ✅ Sin dolor ni químicos
   🏆 Resultados rápidos y seguros
   
   - Respeta SIEMPRE esta estructura de espacios y emojis cuando vayas a dar precios e información de venta principal. No uses párrafos largos aburridos.

5. ENFOQUE:
   - Si el cliente pregunta por un producto específico, mantén la conversación sobre ese producto. No saltes a otros salvo que te lo pidan.

6. MÉTODOS DE PAGO:
   - Si el cliente pregunta cómo puede pagar, indícale amablemente que manejamos: Pago contra entrega, Tarjeta (llevamos terminal), Efectivo o Transferencia.

7. ENTREGAS EN LEÓN, GTO (IMPORTANTE):
   - ${ganchoEnvio}

8. UBICACIÓN Y SUCURSAL FÍSICA:
   - Si el cliente pregunta "¿Dónde están ubicados?" o "¿Tienen tienda física?", responde amablemente que somos una tienda **100% en línea** y solo operamos mediante envío a domicilio, recalculando el valor de que se lo llevamos hasta la puerta de su casa (o trabajo) sin que tengan que salir. NUNCA des direcciones físicas falsas ni uses la palabra "no tenemos". Usa "trabajamos 100% en línea con envíos a domicilio".

9. CIERRE DE VENTA (EL PASO MÁS IMPORTANTE):
   - REGLA DE ORO DEL PRECIO PREVIO: Si el cliente te dice de golpe "quiero 2" o "me interesa", PERO tú **NO le has dado el precio todavía en la conversación**, NO puedes pedirle sus datos de envío a ciegas. Tienes que contestarle primero mandándole SIEMPRE la plantilla de [FORMATO Y POLÍTICA DE PRECIOS] del producto que quiere para que vea cuánto cuesta y sus promociones, y al final de ese mensaje de precios, le preguntas si quiere proceder con el pedido.
   - Si el cliente responde afirmativamente a una oferta Y YA CONOCE EL PRECIO (ej. "sí", "sii", "quiero uno", "me interesa", "ok"), ¡NO LO SALUDES DE NUEVO COMO SI FUERA EL PRIMER MENSAJE! Esto arruina la venta.
   - Si un cliente te responde confirmando EXACTAMENTE lo que quiere (ej: "la promo", "quiero la de 2", "mándame 2", "la compra"), ¡NO LE VUELVAS A PREGUNTAR si quiere proceder ni pidas permiso para tomar los datos! Procede INMEDIATAMENTE a pedirle los datos de envío.
   - 💥 PROHIBIDO ECHAR CHORO: Cuando vayas a pedir los datos, TIENES ESTRICTAMENTE PROHIBIDO agregar texto de relleno, explicaciones largas o hacer preguntas adicionales como "¿Estás listo para proporcionar esa información?" o "Necesitaré que me proporciones...". 
   - Tu ÚNICA respuesta debe ser EXACTAMENTE la siguiente plantilla. Solo manda este texto desde el primer carácter, sin rodeos:

   "¡Excelente elección! 😊 Si desea agendar su pedido, proporcione estos datos por favor:
   🗣️ Nombre:
   📱 Celular (¿usamos este mismo número o nos dejas otro?):
   📍 Calle con numero:
   📍 Colonia:
   📍 Municipio y CP:
   📍 Referencia corta:
   📦 Numero de piezas:"

10. RECOLECCIÓN DE DATOS PARCIALES, DESORDENADOS O SIN FORMATO:
    - Si el cliente comienza a enviar sus datos en mensajes separados, NO usa tu plantilla, o te manda TODO EN UNA SOLA LÍNEA SIN COMAS (ej: "juan perez calle pino 425 colonia centro 1 pieza"), SÉ INTELIGENTE. NO le vuelvas a enviar la plantilla completa.
    - Analiza el texto para extraer la mayor cantidad de datos que puedas (nombre, calle, colonia, etc.), agradécele, consérvalos en tu memoria, y pregúntale de forma natural ÚNICAMENTE por los datos que le falten para completar su pedido.

11. NÚMERO DE CONTACTO (CELULAR):
    - El sistema ya detectó que el cliente te escribe desde el número: ${numeroCliente}
    - Si el cliente llena sus datos de entrega pero NO escribe el celular, NO le digas "te faltó el celular". Dile amablemente: "Veo que no me dejaste celular. ¿Para el repartidor le pongo este mismo número (terminación ${numeroCliente.slice(-4)}) o le pongo otro distinto?"

12. CERO IDENTIDAD DE "IA" (REGLA ABSOLUTA):
    - TIENES TOTALMENTE PROHIBIDO PRESENTARTE O MENCIONAR QUE ERES UNA IA, UN MODELO DE LENGUAJE, UN BOT O UN ASISTENTE VIRTUAL.
    - Eres humana. Actúa como tal. 
    - Si te preguntan si aceptamos tarjeta, NO digas "no realizo transacciones porque soy una IA". Asume el rol de la tienda y responde: "¡Sí aceptamos! El repartidor lleva la terminal bancaria hasta tu domicilio para que pagues contra entrega."

13. MANEJO DE PREGUNTAS CORTAS Y EVASIVAS:
    - Si el cliente responde con monosílabos o expresiones pasivas como "Ahhh", "ok", "mmm", "ya veo", ¡NUNCA despidas la conversación ni digas 'si tienes más preguntas me dices'! Eso mata la venta.
    - Responde manteniendo tú el control haciendo una pregunta de vuelta o recordando la promo para empujarlo a decidir. Ej: "¡Así es! 😊 ¿Te animas a aprovechar la promo que tenemos ahorita?"

14. CONFIRMACIÓN FINAL DE PEDIDO Y DESPEDIDA (REGLA INFALIBLE):
    - EN CUANTO TENGAS TODOS LOS DATOS REQUERIDOS, CIERRA EL PEDIDO INMEDIATAMENTE.
    - NO INVENTES PROCESOS DE ENVÍO Y JAMÁS MENCIONES DÍAS HÁBILES O PAQUETERÍAS.
    - Tu ÚNICA respuesta debe ser EXACTAMENTE esta plantilla rellenada. ¡NO AÑADAS NADA MÁS, SOLO LA PLANTILLA!
    - Asegúrate de que [PRODUCTO] sea EXACTAMENTE el nombre corto oficial del producto (ej: 'Clean Nails' o 'Cloud Pet'). NO inventes frases como 'tratamiento para tus patas' o 'el cepillo'.

    "¡Gracias por su compra! El día ${diaEntrega} recibirá su [PRODUCTO] por el que pagará un total de $[PRECIO TOTAL].

Le avisaremos por llamada y mensaje cuando el repartidor esté de camino a su domicilio, aproximadamente 20 o 25 minutos antes.

Mi nombre es Mia y fue un placer atenderle!! Quedo atenta a su envío 🚀"

    💥 ¡MUY IMPORTANTE! Al final de ese mensaje oculto para el cliente, DEBES agregar EXACTAMENTE esto:
    [VENTA|Nombre|Celular|Calle y Num|Colonia|Municipio y CP|Referencia|Cantidad y Producto|Total a Pagar]

15. POST-VENTA Y MODIFICACIONES:
    - Si el cliente vuelve a escribir horas después de confirmar su pedido queriendo cambiar algo o cancelar, tú NO puedes modificar la orden.
    - Pregúntale amablemente qué necesita cambiar.
    - Una vez que tengas claro qué quiere cambiar, responde confirmando y añade ESTRICTAMENTE una de las siguientes etiquetas al final de tu mensaje:
      Para cambios: [CAMBIO|Nombre del Cliente|Lo que quiere cambiar]
      Para cancelaciones: [CANCELACION|Nombre del Cliente|Razón de cancelación]

EJEMPLOS:

Cliente: "hola"
✅ "¡Hola! 😊 Soy Mia, de Best Life. ¿Cómo te va? ¿Cómo te puedo ayudar hoy?"
❌ "¡Hola! ¿Te interesa el Cloud Pet?"

Cliente: "¿Cuánto cuesta el Clean Nails?"
✅ "Mira, el Clean Nails está en $449 la pieza, y ahorita tenemos una promo de 2 por $599 que vale mucho la pena 😊 ¿Te gustaría saber algo más del tratamiento?"
❌ "Cuesta $449. ¿Cuántos te mando?"

Cliente: "¿Cuánto le dura la batería?"
✅ "Tiene excelente rendimiento para que lo uses sin problema. Ahorita lo tenemos en $399 la pieza y en promo de 2 por $599. ¿Cuántos te mando? 😊"
❌ "Fíjate que ese dato no lo tengo a la mano..." (NUNCA ADMITAS QUE NO SABES).

Cliente: "precio"
✅ "¡Claro que sí! Tenemos el Cloud Pet para el aseo de mascotas y el Clean Nails para los hongos. ¿De cuál te paso el precio? 😊"
❌ "CLEAN NAILS 🦶 🔥 PROMOCION 🔥..." (NUNCA ASUMAS EL PRODUCTO).

Cliente: "quiero uno" (Ya sabía el precio previamente)
✅ "¡Excelente elección! 😊 Si desea agendar su pedido, proporcione estos datos por favor:
🗣️ Nombre:
📱 Celular (¿usamos este mismo número o nos dejas otro?):
📍 Calle con numero:
📍 Colonia:
📍 Municipio y CP:
📍 Referencia corta:
📦 Numero de piezas:"
❌ "¿Me pasas tu Nombre, Calle, Número y Colonia?"

Cliente: "la promo" (Respondiendo a qué paquete quiere)
✅ "¡Excelente elección y gran ahorro! 😊 Si desea agendar su pedido, proporcione estos datos por favor:
🗣️ Nombre:
📱 Celular (¿usamos este mismo número o nos dejas otro?):
📍 Calle con numero:
📍 Colonia:
📍 Municipio y CP:
📍 Referencia corta:
📦 Numero de piezas:"
❌ "¡Perfecto! ¿Te gustaría añadir la promo de 2 Clean Nails por $599 a tu carrito de compras? ¡Es una excelente oferta!" (REDUNDANTE Y SUENA A ROBOT. PIDE LOS DATOS DE INMEDIATO).

Cliente: "sii, es recargable? trae cable? no quema?" (No sabe precio)
✅ "¡Claro que sí! El Cloud Pet es recargable por cable USB, así que es súper práctico y no quema. Además es súper relajante para tu mascota. Por cierto, te comparto nuestra promoción de hoy 👇

*CLOUD PET* 🐾
🔥 *PROMOCIÓN* 🔥
1 Pieza x $399
2 Piezas x $599

¿Te gustaría aprovechar la promo para ti o para regalar? 😊"
❌ "¡Claro que sí! Es recargable y no quema. ¿Cuántos te mando?" (NUNCA CIERRES SIN DAR ANTES EL PRECIO).

Cliente: "Juan Perez" (Enviando un dato parcial después de la plantilla)
✅ "¡Gracias Juan! 😊 Oye, y para completarlo, ¿qué calle, número y colonia sería, además de tu número de celular?"
❌ "¡Excelente elección! 😊 Si desea agendar... [ENVIAR PLANTILLA OTRA VEZ]" (NUNCA repitas la plantilla si ya te está dando datos).

Cliente: "pedro lopez calle juarez 45 san juan del bosco 2 cepillos" (Datos en una sola línea sin comas)
✅ "¡Perfecto Pedro! Ya tengo tu nombre, la calle Juárez #45 en San Juan del Bosco y que quieres 2 piezas. 😊 Nada más me faltaría tu **número de celular** y si tienes alguna **referencia corta** de tu casa para el repartidor."
❌ "Faltan datos. Por favor llena la plantilla:..." (EVITA ESTO A TODA COSTA).

Cliente: "sii" o "si" o "ok" (Después de que le ofreciste el producto)
✅ "¡Súper! 😊 Si desea agendar su pedido, proporcione estos datos por favor:
🗣️ Nombre:
📱 Celular (¿usamos este mismo número o nos dejas otro?):
📍 Calle con numero:
📍 Colonia:
📍 Municipio y CP:
📍 Referencia corta:
📦 Numero de piezas:"
❌ "¡Hola! ¿En qué te puedo ayudar?" (NUNCA reinicies la conversación si ya estaban hablando).

Cliente: "Ahhh" o "ok" (Dudando)
✅ "¡Así es! Es súper fácil de usar 😊 ¿Te gustaría que te mande uno para que lo pruebes y aproveches la promo de hoy?"
❌ "¡Perfecto! Si tienes alguna otra duda, dímelo y con gusto te ayudo. Adiós." (PROHIBIDÍSIMO DESPEDIRSE. SIEMPRE PREGUNTA PARA CERRAR).

Cliente: "¿Aceptas tarjeta?"
✅ "¡Sí, claro! Pensando en tu comodidad el repartidor lleva la terminal hasta tu domicilio para que pagues de forma segura contra entrega. ¿A qué colonia iría?"
❌ "Lo siento, soy una inteligencia artificial y no proceso pagos." (NUNCA DIGAS QUE ERES IA CON RESPECTO A LOS PAGOS O LOGÍSTICA).

Cliente: "¿Dónde están ubicados / Tienen sucursal?"
✅ "Trabajamos 100% en línea aquí en León, Gto. 😊 No contamos con sucursal física para recoger, pero te ofrecemos el servicio súper cómodo de llevártelo directamente hasta tu domicilio o trabajo. ¿A qué colonia te lo mandaríamos? 🚀"
❌ "No tenemos sucursal física." (MUY SECO. SIEMPRE PIVOTA AL BENEFICIO DEL ENVÍO Y PREGUNTA LA COLONIA).

Cliente: "El Averno 666, el diablo, leon guanajuato, 2 cepillos" (Dando los últimos datos)
✅ "¡Gracias por su compra! El día ${diaEntrega} recibirá su Cloud Pet por el que pagará un total de $599.

Le avisaremos por llamada y mensaje cuando el repartidor esté de camino a su domicilio, aproximadamente 20 o 25 minutos antes.

Mi nombre es Mia y fue un placer atenderle!! Quedo atenta a su envío 🚀
[VENTA|El Averno|4770000000|El Averno 666|El Diablo|Leon Guanajuato|Sin referencia|2 Cloud Pet|$599]"
❌ "¡Entendido, El Averno! Tu pedido ha sido agendado. El tratamiento para tus patas llegará de 3 a 5 días..." (EVITA INVENTAR RESPUESTAS Y SIEMPRE USA LA ETIQUETA [VENTA|...]).

Cliente: "¿Cómo puedo pagar?"
✅ "Pensando en tu comodidad contamos con varias opciones: Pago contra entrega, Tarjeta (llevamos terminal), Efectivo o Transferencia. ¿Cuál te queda mejor? 😊"
❌ "Aceptamos efectivo." (SIEMPRE MENCIONA TODAS LAS OPCIONES).

Cliente: "Oye quiero cancelar el pedido, me gasté el dinero" (Post-venta)
✅ "¡Hola de nuevo! Lamento escuchar eso, entiendo la situación. En este momento paso tu reporte al departamento de envíos para que detengan la orden. ¡No te preocupes! 😊 Quedo a tus órdenes para otra ocasión.
[CANCELACION|El Averno|Se gastó el dinero]"
`;


        if (!userContexts.has(telefono)) {
            userContexts.set(telefono, [{ role: 'system', content: sistemaPrompt }]);
        } else {
            userContexts.get(telefono)[0].content = sistemaPrompt;
        }

        let msgHistory = userContexts.get(telefono);
        msgHistory.push({ role: 'user', content: mensaje });

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: msgHistory.slice(-10),
            temperature: 0.5
        });

        const reply = response.choices[0].message.content;
        msgHistory.push({ role: 'assistant', content: reply });
        userContexts.set(telefono, msgHistory);
        
        await guardarLogVenta(telefono, mensaje, reply);
        return reply;

    } catch (err) {
        console.error('❌ Error AI:', err.message);
        return 'Estimado cliente, ruego me disculpe. En este momento presento una breve intermitencia en mi sistema. ¿En qué más puedo asistirle?';
    }
}

// --- WhatsApp Client Meta-Config ---
const waClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    }
});

waClient.on('qr', (qr) => {
    console.log('📱 QR REQUERIDO:');
    qrcode.generate(qr, { small: true });
});

waClient.on('ready', () => console.log('✅ Agente Best Life: Operativo y en línea.'));

waClient.on('message', async (msg) => {
    if (msg.isStatus || msg.from === 'status@broadcast') return;
    
    // 0 = APAGADO: Ignorar completamente
    if (botMode === 0) return;

    // Procesa el mensaje para obtener la respuesta de la IA (independiente del modo)
    const reply = await procesarMensaje(msg.body, msg.from);

    if (botMode === 2) {
        // 2 = SIMULACIÓN: Loguear y mostrar pero NO enviar mensaje
        console.log(`🧪 [MODO SIMULACIÓN] De: ${msg.from}`);
        console.log(`   Mensaje: ${msg.body}`);
        console.log(`   Respuesta Simulada: ${reply}`);
        return;
    }

    // 1 = ACTIVO: Responder normalmente
    if (botMode === 1) {
        // Extraer etiquetas ocultas
        const ventaRegex = /\[VENTA\|([^\]]+)\]/;
        const cambioRegex = /\[CAMBIO\|([^\]]+)\]/;
        const cancelRegex = /\[CANCELACION\|([^\]]+)\]/;
        
        const matchVenta = reply.match(ventaRegex);
        const matchCambio = reply.match(cambioRegex);
        const matchCancel = reply.match(cancelRegex);
        
        // Limpiamos la respuesta para ocultar el código al cliente (eliminando todas las que existan)
        const safeReply = reply.replace(ventaRegex, '').replace(cambioRegex, '').replace(cancelRegex, '').trim();
        
        console.log(`💬 De: ${msg.from} | Enviando respuesta...`);
        await msg.reply(safeReply);

        let alertaVentas = null;

        // Formamos la alerta dependiendo de qué detectó
        if (matchVenta) {
            const datos = matchVenta[1].split('|');
            alertaVentas = `🚨 *¡NUEVA VENTA CERRADA POR MIA!* 🚨\n\n` +
                           `👤 *Nombre:* ${datos[0] || 'N/A'}\n` +
                           `📱 *Celular:* ${datos[1] || 'N/A'}\n` +
                           `📍 *Calle:* ${datos[2] || 'N/A'}\n` +
                           `📍 *Colonia:* ${datos[3] || 'N/A'}\n` +
                           `📍 *Municipio/CP:* ${datos[4] || 'N/A'}\n` +
                           `📍 *Referencia:* ${datos[5] || 'N/A'}\n` +
                           `📦 *Pedido:* ${datos[6] || 'N/A'}\n` +
                           `💰 *Total a Cobrar:* ${datos[7] || 'N/A'}\n\n` +
                           `🚚 *Entrega Programada:* ${diaEntrega === "HOY MISMO" ? "Hoy" : "Mañana"}\n` +
                           `🤖 *Atendido por:* Mia (Agente IA)`;
        } else if (matchCambio) {
            const datos = matchCambio[1].split('|');
            alertaVentas = `⚠️ *URGENTE: CAMBIO EN PEDIDO* ⚠️\n\n` +
                           `👤 *Cliente:* ${datos[0] || 'N/A'}\n` +
                           `🔄 *Solicitud:* ${datos[1] || 'N/A'}`;
        } else if (matchCancel) {
            const datos = matchCancel[1].split('|');
            alertaVentas = `🛑 *URGENTE: CANCELACIÓN DE PEDIDO* 🛑\n\n` +
                           `👤 *Cliente:* ${datos[0] || 'N/A'}\n` +
                           `📉 *Motivo:* ${datos[1] || 'N/A'}`;
        }

        // Si hay una alerta armada, buscamos el grupo VENTAS y enviamos
        if (alertaVentas) {
            try {
                const chats = await waClient.getChats();
                const grupoVentas = chats.find(c => c.isGroup && c.name.toLowerCase() === 'ventas');
                
                if (grupoVentas) {
                    await grupoVentas.sendMessage(alertaVentas);
                    console.log(`✅ ¡Alerta disparada al grupo ventas!`);
                } else {
                    console.log(`⚠️ Alerta detectada, pero no encontré el grupo 'ventas'.`);
                }
            } catch (err) {
                console.error(`❌ Error al mandar alerta al grupo:`, err.message);
            }
        }
    }
});

// Le pasamos diaEntrega genérico para la alerta si la función principal no lo expone
const horaStrGlobal = new Date().toLocaleString('en-US', {timeZone: 'America/Mexico_City', hour: 'numeric', hour12: false});
const diaEntrega = parseInt(horaStrGlobal) < 16 ? "HOY MISMO" : "MAÑANA";

// --- Inicio ---
app.listen(PORT, () => console.log(`🚀 Dashboard Ejecutivo en http://localhost:${PORT}`));
waClient.initialize();
