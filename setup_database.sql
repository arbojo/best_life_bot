-- ==========================================================
-- SCRIPT DE CONFIGURACIÓN FUNCIONAL - ECOSISTEMA BEST LIFE
-- ==========================================================

-- 0. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Secuencias
CREATE SEQUENCE IF NOT EXISTS agent_feedback_id_seq;
CREATE SEQUENCE IF NOT EXISTS new_orders_tracking_id_seq;

-- 2. Tablas Maestras (Sin Dependencias)

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  phone text NOT NULL UNIQUE,
  full_name text,
  purchases_count integer DEFAULT 0,
  last_interaction_at timestamp with time zone DEFAULT now(),
  tracking_status text DEFAULT 'NEW'::text,
  intent_score double precision DEFAULT 0.0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  last_followup_at timestamp with time zone,
  last_recovery_at timestamp with time zone,
  CONSTRAINT customers_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.new_products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sku text UNIQUE,
  name text NOT NULL,
  description text,
  category text,
  is_active boolean DEFAULT true,
  main_benefit text,
  usage_instructions text,
  objection_handling text,
  expert_hacks text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT new_products_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_pkey PRIMARY KEY (key)
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  key text NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT system_settings_pkey PRIMARY KEY (key)
);

CREATE TABLE IF NOT EXISTS public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  source text NOT NULL,
  type text NOT NULL,
  chat_id text,
  meta jsonb,
  CONSTRAINT events_pkey PRIMARY KEY (id)
);

-- 3. Tablas con Dependencias

CREATE TABLE IF NOT EXISTS public.chat_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  customer_phone text,
  message text,
  response text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_logs_pkey PRIMARY KEY (id),
  CONSTRAINT chat_logs_customer_phone_fkey FOREIGN KEY (customer_phone) REFERENCES public.customers(phone) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.new_orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  customer_phone text,
  status text DEFAULT 'PENDING_CONFIRMATION'::text,
  total_amount numeric NOT NULL,
  shipping_details text,
  items_summary text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  tracking_id bigint NOT NULL DEFAULT nextval('new_orders_tracking_id_seq'::regclass),
  seller_name text,
  customer_name text,
  address text,
  neighborhood text,
  city_municipality text,
  state text,
  zip_code text,
  cross_streets text,
  "references" text,
  product_desc text,
  quantity integer NOT NULL DEFAULT 1,
  delivery_day text,
  route text,
  is_duplicate boolean NOT NULL DEFAULT false,
  duplicate_of text,
  original_msg text,
  group_id text,
  author_id text,
  message_ts timestamp with time zone,
  metadata jsonb,
  CONSTRAINT new_orders_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.product_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  image_url text NOT NULL,
  is_main boolean DEFAULT false,
  label text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_media_pkey PRIMARY KEY (id),
  CONSTRAINT product_media_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.new_products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.product_prices (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  product_id uuid,
  label text NOT NULL,
  price numeric NOT NULL,
  min_quantity integer DEFAULT 1,
  is_recovery boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_prices_pkey PRIMARY KEY (id),
  CONSTRAINT product_prices_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.new_products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  product_id uuid,
  name text NOT NULL,
  stock_quantity integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_variants_pkey PRIMARY KEY (id),
  CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.new_products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.sheets_sync_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  payload jsonb NOT NULL,
  status text DEFAULT 'PENDING'::text,
  error_log text,
  created_at timestamp with time zone DEFAULT now(),
  synced_at timestamp with time zone,
  CONSTRAINT sheets_sync_queue_pkey PRIMARY KEY (id),
  CONSTRAINT sheets_sync_queue_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.new_orders(id) ON DELETE CASCADE
);

-- Tablas de IA y Logs de Proceso

CREATE TABLE IF NOT EXISTS public.agent_feedback (
  id bigint NOT NULL DEFAULT nextval('agent_feedback_id_seq'::regclass),
  seller_id text,
  customer_text text,
  agent_reply_text text,
  ai_intent text,
  ai_product text,
  confidence double precision,
  chosen_action text,
  created_at timestamp with time zone DEFAULT now(),
  chat_hash text,
  CONSTRAINT agent_feedback_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.approved_keywords (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  product_key text,
  intent text,
  approved boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT approved_keywords_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.learning_candidates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  chat_hash text NOT NULL,
  product_context text,
  raw_text text NOT NULL,
  normalized_text text NOT NULL,
  ai_intent text,
  confidence double precision,
  review_status text NOT NULL DEFAULT 'pending'::text,
  dedupe_key text,
  ai_product text,
  CONSTRAINT learning_candidates_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.memoria_ia (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cliente_tel text,
  gustos text,
  objeciones text,
  otros_datos text,
  timestamp timestamp with time zone DEFAULT now(),
  CONSTRAINT memoria_ia_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.registrar_simulation_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  original_message text,
  extracted_data jsonb,
  missing_mandatory text[], -- Corregido de ARRAY a text[]
  missing_optional text[],  -- Corregido de ARRAY a text[]
  would_register boolean,
  simulated_id text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT registrar_simulation_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.training_samples (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id text NOT NULL,
  product_key text,
  customer_text text,
  human_text text,
  ai_suggested_label text,
  approved boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT training_samples_pkey PRIMARY KEY (id)
);

-- 4. Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_new_orders_tracking ON public.new_orders(tracking_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_phone ON public.chat_logs(customer_phone);
