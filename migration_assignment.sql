-- Crear tabla para repartidores
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'Disponible',
    is_active BOOLEAN DEFAULT true,
    rating NUMERIC DEFAULT 5.0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para drivers
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo drivers" ON public.drivers FOR ALL USING (true);

-- Agregar campo driver_id a new_orders para vinculación formal
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='new_orders' AND COLUMN_NAME='driver_id') THEN
        ALTER TABLE public.new_orders ADD COLUMN driver_id UUID REFERENCES public.drivers(id);
    END IF;
END $$;

-- Insertar algunos repartidores iniciales (basados en los mocks)
INSERT INTO public.drivers (name, phone, status, is_active)
VALUES 
    ('Juan Carlos', '818-123-4567', 'Ocupado', true),
    ('Pedro Ramirez', '811-987-6543', 'Disponible', true),
    ('Luis Mendoza', '812-456-7890', 'Disponible', false),
    ('Jose Garcia', '818-555-0199', 'Disponible', true)
ON CONFLICT DO NOTHING;
