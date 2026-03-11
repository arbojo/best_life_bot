/**************************************************************
 * SCRIPT DE MIGRACIÓN CORREGIDO (VERSIÓN FINAL)
 * Soluciona el error de restricción única (Unique Constraint)
 **************************************************************/

-- 1. Crear o Asegurar la Estructura de 'productos'
CREATE TABLE IF NOT EXISTS public.productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    stock INT NOT NULL DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- AGREGAR RESTRICCIÓN ÚNICA (Requerida para el ON CONFLICT)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'productos_nombre_key'
    ) THEN
        ALTER TABLE public.productos ADD CONSTRAINT productos_nombre_key UNIQUE (nombre);
    END IF;
END $$;

-- 2. Asegurar Tabla de Precios
CREATE TABLE IF NOT EXISTS public.productos_precios (
    id SERIAL PRIMARY KEY,
    producto_id INT REFERENCES public.productos(id) ON DELETE CASCADE,
    etiqueta VARCHAR(100) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    min_unidades INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. MIGRACIÓN INTELIGENTE
DO $$
DECLARE
    r RECORD;
    v_prod_id INT;
BEGIN
    -- Verificamos si existe la tabla vieja 'products'
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
        
        FOR r IN SELECT * FROM public."products" LOOP
            
            -- UPSERT basado en el NOMBRE único
            INSERT INTO public.productos (nombre, descripcion, active)
            VALUES (r.name, COALESCE(r.description, r.features), r.active)
            ON CONFLICT (nombre) DO UPDATE SET 
                descripcion = EXCLUDED.descripcion,
                active = EXCLUDED.active
            RETURNING id INTO v_prod_id;

            -- Limpiamos precios antiguos para este producto
            DELETE FROM public.productos_precios WHERE producto_id = v_prod_id;

            -- Migrar price_1 como 'Precio Normal'
            IF r.price_1 IS NOT NULL AND r.price_1 > 0 THEN
                INSERT INTO public.productos_precios (producto_id, etiqueta, precio)
                VALUES (v_prod_id, 'Normal', r.price_1);
            END IF;

            -- Migrar price_2 como 'Mayoreo'
            IF r.price_2 IS NOT NULL AND r.price_2 > 0 THEN
                INSERT INTO public.productos_precios (producto_id, etiqueta, precio)
                VALUES (v_prod_id, 'Mayoreo', r.price_2);
            END IF;

            -- Migrar ofertas recovery
            IF r.recovery_price_1 IS NOT NULL AND r.recovery_price_1 > 0 THEN
                INSERT INTO public.productos_precios (producto_id, etiqueta, precio)
                VALUES (v_prod_id, 'Recovery 1', r.recovery_price_1);
            END IF;

            IF r.recovery_price_2 IS NOT NULL AND r.recovery_price_2 > 0 THEN
                INSERT INTO public.productos_precios (producto_id, etiqueta, precio)
                VALUES (v_prod_id, 'Recovery 2', r.recovery_price_2);
            END IF;

        END LOOP;
        
        RAISE NOTICE '✅ Migración de productos completada con éxito.';
    END IF;
END $$;

-- 4. Asegurar Tablas de Configuración y CRM
CREATE TABLE IF NOT EXISTS public.configuracion (
    clave VARCHAR(50) PRIMARY KEY,
    valor TEXT NOT NULL,
    tipo VARCHAR(20) DEFAULT 'texto'
);

INSERT INTO public.configuracion (clave, valor) VALUES 
('bot_persona', 'Eres un Cerrador de Ventas Senior en Leon, Gto. Muy directo y de pocas palabras.'),
('bot_estilo', 'ULTRA-BREVE: 1 o 2 lineas maximo. SIN CONDESCENDENCIA.'),
('bot_reglas_cierre', 'Muestra productos directamente y pregunta: "¿Cual te mando?". Cierre: Pasa direccion.')
ON CONFLICT (clave) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.clientes (
    telefono VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(255),
    compras_previas INT DEFAULT 0,
    ultima_consulta TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pedidos (
    id SERIAL PRIMARY KEY,
    cliente_tel VARCHAR(50) REFERENCES public.clientes(telefono),
    detalles_envio TEXT,
    productos TEXT,
    total DECIMAL(10, 2),
    estado VARCHAR(50) DEFAULT 'ESPERANDO_PAGO',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);
