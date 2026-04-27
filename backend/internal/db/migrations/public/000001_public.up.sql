CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'deleted');

CREATE TABLE tenants (
                         id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                         slug            TEXT        NOT NULL UNIQUE,
                         display_name    TEXT        NOT NULL,
                         owner_email     TEXT        NOT NULL,
                         signing_key_enc TEXT        NOT NULL,
                         cert_pin        TEXT        NOT NULL,
                         status          tenant_status NOT NULL DEFAULT 'active',
                         created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                         updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug   ON tenants (slug);
CREATE INDEX idx_tenants_status ON tenants (status);

CREATE TABLE owner_sessions (
                                id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                                token_hash  TEXT        NOT NULL UNIQUE,
                                ip_address  INET        NOT NULL,
                                user_agent  TEXT,
                                expires_at  TIMESTAMPTZ NOT NULL,
                                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_owner_sessions_token   ON owner_sessions (token_hash);
CREATE INDEX idx_owner_sessions_expires ON owner_sessions (expires_at);

CREATE TABLE global_audit_log (
                                  id          BIGSERIAL   PRIMARY KEY,
                                  tenant_id   UUID        REFERENCES tenants(id) ON DELETE SET NULL,
                                  event_type  TEXT        NOT NULL,
                                  severity    TEXT        NOT NULL DEFAULT 'info',
                                  ip_address  INET,
                                  payload     JSONB       NOT NULL DEFAULT '{}',
                                  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gal_tenant   ON global_audit_log (tenant_id);
CREATE INDEX idx_gal_event    ON global_audit_log (event_type);
CREATE INDEX idx_gal_created  ON global_audit_log (created_at DESC);

-- Shared trigger function, referenced from all tenant schemas
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;