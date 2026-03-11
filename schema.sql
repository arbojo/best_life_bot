-- Crear tabla de productos
CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    stock INT NOT NULL DEFAULT 0,
    active BOOLEAN DEFAULT true
);

-- Crear tabla de precios de productos (1 a N)
CREATE TABLE productos_precios (
    id SERIAL PRIMARY KEY,
    producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
    etiqueta VARCHAR(100) NOT NULL, -- Ej: 'Unitario', 'Mayoreo 3+', 'Promocion'
    precio DECIMAL(10, 2) NOT NULL,
    min_unidades INT DEFAULT 1
);

-- Crear tabla de logs_ventas
CREATE TABLE logs_ventas (
    id SERIAL PRIMARY KEY,
    cliente_tel VARCHAR(50) NOT NULL,
    mensaje TEXT NOT NULL,
    respuesta TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Crear tabla de clientes para seguimiento
CREATE TABLE clientes (
    telefono VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(255),
    compras_previas INT DEFAULT 0,
    ultima_consulta TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Crear tabla de memoria_ia para aprendizaje
CREATE TABLE memoria_ia (
    id SERIAL PRIMARY KEY,
    cliente_tel VARCHAR(50) REFERENCES clientes(telefono),
    gustos TEXT,
    objeciones TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Crear tabla de pedidos
CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    cliente_tel VARCHAR(50) REFERENCES clientes(telefono),
    detalles_envio TEXT,
    productos TEXT,
    total DECIMAL(10, 2),
    estado VARCHAR(50) DEFAULT 'ESPERANDO_PAGO',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- (Opcional) Insertar algunos datos de prueba para empezar
INSERT INTO productos (nombre, precio, stock, descripcion) VALUES
('Bota Vaquera Piel Exotica', 2500.00, 10, 'Bota vaquera de alta calidad, puro orgullo de Leon, Gto.'),
('Cinturon de Cuero', 500.00, 20, 'Cinturon 100% cuero genuino.'),
('Chamarra de Mezclilla y Piel', 1800.00, 5, 'Chamarra combinada, diseño exclusivo.');
