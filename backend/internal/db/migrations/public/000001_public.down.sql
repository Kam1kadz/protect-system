DROP TABLE IF EXISTS global_audit_log;
DROP TABLE IF EXISTS owner_sessions;
DROP TABLE IF EXISTS tenants;
DROP TYPE  IF EXISTS tenant_status;
DROP FUNCTION IF EXISTS public.fn_set_updated_at();
DROP EXTENSION IF EXISTS "pgcrypto";