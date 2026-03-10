-- Crear tabla de productos
CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    descripcion TEXT
);

-- Crear tabla de logs_ventas
CREATE TABLE logs_ventas (
    id SERIAL PRIMARY KEY,
    cliente_tel VARCHAR(50) NOT NULL,
    mensaje TEXT NOT NULL,
    respuesta TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- (Opcional) Insertar algunos datos de prueba para empezar
INSERT INTO productos (nombre, precio, stock, descripcion) VALUES
('Bota Vaquera Piel Exótica', 2500.00, 10, 'Bota vaquera de alta calidad, puro orgullo de León, Gto.'),
('Cinturón de Cuero', 500.00, 20, 'Cinturón 100% cuero genuino.'),
('Chamarra de Mezclilla y Piel', 1800.00, 5, 'Chamarra combinada, diseño exclusivo.');
