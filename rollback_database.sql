-- ==========================================================
-- SCRIPT DE ELIMINACIÓN (ROLLBACK) - ECOSISTEMA BEST LIFE
-- ==========================================================

-- 1. Eliminar tablas con llaves foráneas primero
DROP TABLE IF EXISTS public.sheets_sync_queue CASCADE;
DROP TABLE IF EXISTS public.product_variants CASCADE;
DROP TABLE IF EXISTS public.product_prices CASCADE;
DROP TABLE IF EXISTS public.product_media CASCADE;
DROP TABLE IF EXISTS public.chat_logs CASCADE;
DROP TABLE IF EXISTS public.new_orders CASCADE;

-- 2. Eliminar tablas maestras y de IA
DROP TABLE IF EXISTS public.training_samples CASCADE;
DROP TABLE IF EXISTS public.registrar_simulation_logs CASCADE;
DROP TABLE IF EXISTS public.memoria_ia CASCADE;
DROP TABLE IF EXISTS public.learning_candidates CASCADE;
DROP TABLE IF EXISTS public.approved_keywords CASCADE;
DROP TABLE IF EXISTS public.agent_feedback CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.system_settings CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;
DROP TABLE IF EXISTS public.new_products CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.new_orders_backup_2026_03_13 CASCADE;

-- 3. Eliminar secuencias
DROP SEQUENCE IF EXISTS agent_feedback_id_seq;
DROP SEQUENCE IF EXISTS new_orders_tracking_id_seq;

-- 4. Eliminar extensiones (Opcional, comentar si se usan en otras partes)
-- DROP EXTENSION IF EXISTS "uuid-ossp";
-- DROP EXTENSION IF EXISTS "pgcrypto";
