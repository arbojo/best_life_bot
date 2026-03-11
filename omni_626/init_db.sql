-- TABLA DE PRODUCTOS
CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    stock INTEGER DEFAULT 0,
    imagen_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLA DE CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
    telefono TEXT PRIMARY KEY,
    nombre TEXT,
    compras_previas INTEGER DEFAULT 0,
    ultima_consulta TIMESTAMPTZ DEFAULT now(),
    ultima_interaccion_tipo TEXT, -- 'BOT' o 'HUMANO'
    estado_seguimiento TEXT DEFAULT 'NUEVO' -- 'INTERESADO', 'ATENDIDO_POR_HUMANO', 'CERRADO', etc.
);

-- TABLA DE PEDIDOS
CREATE TABLE IF NOT EXISTS pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_tel TEXT REFERENCES clientes(telefono),
    productos TEXT NOT NULL, -- Lista de productos y cantidades
    total DECIMAL(10,2) NOT NULL,
    detalles_envio TEXT,
    estado TEXT DEFAULT 'ESPERANDO_CONFIRMACION', -- 'ESPERANDO_PAGO', 'PAGADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- TABLA DE LOGS DE VENTAS (HISTORIAL)
CREATE TABLE IF NOT EXISTS logs_ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_tel TEXT REFERENCES clientes(telefono),
    mensaje TEXT NOT NULL,
    respuesta TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- TABLA DE MEMORIA DE IA
CREATE TABLE IF NOT EXISTS memoria_ia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_tel TEXT REFERENCES clientes(telefono),
    gustos TEXT,
    objeciones TEXT,
    otros_datos TEXT,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- Insertar un producto de prueba
INSERT INTO productos (nombre, descripcion, precio, stock) 
VALUES ('Producto Prototipo', 'Un producto de ejemplo para Online Shop', 499.00, 50)
ON CONFLICT DO NOTHING;
