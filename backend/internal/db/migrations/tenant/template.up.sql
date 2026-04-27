CREATE SCHEMA IF NOT EXISTS {{SCHEMA}};
SET search_path TO {{SCHEMA}};

-- ── Enums ─────────────────────────────────────────────────────────────────────

CREATE TYPE user_role         AS ENUM ('user', 'partner', 'support', 'admin');
CREATE TYPE license_status    AS ENUM ('active', 'paused', 'expired', 'banned');
CREATE TYPE payment_status    AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE shop_item_type    AS ENUM ('plan_tier', 'hwid_reset');
CREATE TYPE hwid_change_cause AS ENUM ('initial', 'reset_purchase', 'admin_reset');
CREATE TYPE mc_version        AS ENUM ('1.16.5', '1.21.4');
CREATE TYPE audit_level       AS ENUM ('info', 'warn', 'critical');
CREATE TYPE runtime_event_type AS ENUM (
    'debugger_detected', 'jvmti_dump_attempt', 'integrity_failure',
    'profiler_detected', 'hwid_mismatch', 'launcher_check_failed', 'jvm_agent_detected'
);

-- ── Tenant config ─────────────────────────────────────────────────────────────

CREATE TABLE tenant_config (
                               id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                               display_name         TEXT        NOT NULL,
                               primary_color        TEXT        NOT NULL DEFAULT '#7c3aed',
                               secondary_color      TEXT        NOT NULL DEFAULT '#1e1e2e',
                               accent_color         TEXT        NOT NULL DEFAULT '#a855f7',
                               logo_storage_key     TEXT,
                               favicon_storage_key  TEXT,
                               custom_domain        TEXT        UNIQUE,
                               loader_display_name  TEXT        NOT NULL,
                               site_description     TEXT,
                               discord_url          TEXT,
                               telegram_url         TEXT,
                               maintenance_mode     BOOLEAN     NOT NULL DEFAULT false,
                               maintenance_message  TEXT,
                               updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_config_updated
    BEFORE UPDATE ON tenant_config
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Payment providers ─────────────────────────────────────────────────────────

CREATE TABLE payment_providers (
                                   id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                                   provider_type TEXT        NOT NULL,
                                   display_name  TEXT        NOT NULL,
                                   config_enc    BYTEA       NOT NULL,
                                   is_active     BOOLEAN     NOT NULL DEFAULT false,
                                   created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                   updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_providers_updated
    BEFORE UPDATE ON payment_providers
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Users ─────────────────────────────────────────────────────────────────────

CREATE TABLE users (
                       id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                       username       TEXT        NOT NULL UNIQUE,
                       email          TEXT        NOT NULL UNIQUE,
                       password_hash  TEXT        NOT NULL,
                       role           user_role   NOT NULL DEFAULT 'user',
                       hwid           TEXT,
                       hwid_locked_at TIMESTAMPTZ,
                       ip_registered  INET,
                       ip_last        INET,
                       last_seen_at   TIMESTAMPTZ,
                       created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email    ON users (email);
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_hwid     ON users (hwid) WHERE hwid IS NOT NULL;
CREATE INDEX idx_users_role     ON users (role);

-- ── Subscription plans ────────────────────────────────────────────────────────

CREATE TABLE subscription_plans (
                                    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                                    name            TEXT        NOT NULL UNIQUE,
                                    display_name    TEXT        NOT NULL,
                                    jar_storage_key TEXT,
                                    is_active       BOOLEAN     NOT NULL DEFAULT true,
                                    sort_order      INT         NOT NULL DEFAULT 0,
                                    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plans_active ON subscription_plans (is_active);

CREATE TRIGGER trg_plans_updated
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Plan tiers ────────────────────────────────────────────────────────────────

CREATE TABLE plan_tiers (
                            id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
                            plan_id       UUID           NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
                            duration_days INT            NOT NULL CHECK (duration_days > 0),
                            price         NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
                            currency      TEXT           NOT NULL DEFAULT 'USD',
                            is_active     BOOLEAN        NOT NULL DEFAULT true,
                            created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tiers_plan   ON plan_tiers (plan_id);
CREATE INDEX idx_tiers_active ON plan_tiers (is_active);

-- ── Shop items ────────────────────────────────────────────────────────────────

CREATE TABLE shop_items (
                            id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
                            type         shop_item_type NOT NULL,
                            plan_tier_id UUID           REFERENCES plan_tiers(id) ON DELETE CASCADE,
                            display_name TEXT           NOT NULL,
                            description  TEXT,
                            price        NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
                            currency     TEXT           NOT NULL DEFAULT 'USD',
                            is_active    BOOLEAN        NOT NULL DEFAULT true,
                            created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
                            CONSTRAINT chk_item_tier CHECK (type != 'plan_tier' OR plan_tier_id IS NOT NULL)
    );

CREATE INDEX idx_shop_type   ON shop_items (type);
CREATE INDEX idx_shop_active ON shop_items (is_active);

-- ── Licenses ──────────────────────────────────────────────────────────────────

CREATE TABLE licenses (
                          id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
                          user_id       UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                          plan_id       UUID           NOT NULL REFERENCES subscription_plans(id),
                          tier_id       UUID           REFERENCES plan_tiers(id) ON DELETE SET NULL,
                          hwid_snapshot TEXT,
                          status        license_status NOT NULL DEFAULT 'active',
                          expires_at    TIMESTAMPTZ    NOT NULL,
                          paused_at     TIMESTAMPTZ,
                          pause_reason  TEXT,
                          ban_reason    TEXT,
                          license_key   TEXT           UNIQUE,
                          secret_key    TEXT,
                          created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_licenses_user    ON licenses (user_id);
CREATE INDEX idx_licenses_status  ON licenses (status);
CREATE INDEX idx_licenses_expires ON licenses (expires_at);
CREATE INDEX idx_licenses_plan    ON licenses (plan_id);
CREATE INDEX idx_licenses_key     ON licenses (license_key) WHERE license_key IS NOT NULL;

-- ── Sessions ──────────────────────────────────────────────────────────────────

CREATE TABLE sessions (
                          id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                          user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                          license_id        UUID        NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
                          token_hash        TEXT        NOT NULL UNIQUE,
                          hwid              TEXT        NOT NULL,
                          ip_address        INET        NOT NULL,
                          loader_version    TEXT,
                          minecraft_version mc_version,
                          last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                          expires_at        TIMESTAMPTZ NOT NULL,
                          is_revoked        BOOLEAN     NOT NULL DEFAULT false,
                          created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_token     ON sessions (token_hash);
CREATE INDEX idx_sessions_user      ON sessions (user_id);
CREATE INDEX idx_sessions_heartbeat ON sessions (last_heartbeat_at);
CREATE INDEX idx_sessions_alive     ON sessions (is_revoked, expires_at);

-- ── HWID history ──────────────────────────────────────────────────────────────

CREATE TABLE hwid_records (
                              id         UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
                              user_id    UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                              hwid_old   TEXT,
                              hwid_new   TEXT              NOT NULL,
                              reason     hwid_change_cause NOT NULL,
                              payment_id UUID,
                              changed_at TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hwid_user ON hwid_records (user_id);

-- ── Payments ──────────────────────────────────────────────────────────────────

CREATE TABLE payments (
                          id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
                          user_id             UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                          shop_item_id        UUID           NOT NULL REFERENCES shop_items(id),
                          provider_id         UUID           NOT NULL REFERENCES payment_providers(id),
                          provider_payment_id TEXT,
                          amount              NUMERIC(10, 2) NOT NULL,
                          currency            TEXT           NOT NULL DEFAULT 'USD',
                          status              payment_status NOT NULL DEFAULT 'pending',
                          webhook_payload     JSONB          NOT NULL DEFAULT '{}',
                          created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
                          completed_at        TIMESTAMPTZ
);

CREATE INDEX idx_payments_user        ON payments (user_id);
CREATE INDEX idx_payments_status      ON payments (status);
CREATE INDEX idx_payments_provider_id ON payments (provider_payment_id) WHERE provider_payment_id IS NOT NULL;

-- ── Nonce blacklist ───────────────────────────────────────────────────────────

CREATE TABLE nonce_blacklist (
                                 nonce      TEXT        PRIMARY KEY,
                                 expires_at TIMESTAMPTZ NOT NULL,
                                 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nonce_expires ON nonce_blacklist (expires_at);

-- ── Audit log ─────────────────────────────────────────────────────────────────

CREATE TABLE audit_log (
                           id         BIGSERIAL   PRIMARY KEY,
                           user_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
                           event_type TEXT        NOT NULL,
                           severity   audit_level NOT NULL DEFAULT 'info',
                           ip_address INET,
                           payload    JSONB       NOT NULL DEFAULT '{}',
                           created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user     ON audit_log (user_id);
CREATE INDEX idx_audit_event    ON audit_log (event_type);
CREATE INDEX idx_audit_severity ON audit_log (severity);
CREATE INDEX idx_audit_created  ON audit_log (created_at DESC);

-- ── Plan integrity ────────────────────────────────────────────────────────────

CREATE TABLE plan_integrity (
                                id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                                plan_id       UUID        NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
                                mc_version    mc_version  NOT NULL,
                                manifest_hash TEXT        NOT NULL,
                                created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                UNIQUE (plan_id, mc_version)
);

CREATE INDEX idx_integrity_plan ON plan_integrity (plan_id);

-- ── Runtime events ────────────────────────────────────────────────────────────

CREATE TABLE runtime_events (
                                id         BIGSERIAL          PRIMARY KEY,
                                session_id UUID               REFERENCES sessions(id) ON DELETE SET NULL,
                                user_id    UUID               REFERENCES users(id)    ON DELETE SET NULL,
                                event_type runtime_event_type NOT NULL,
                                severity   audit_level        NOT NULL DEFAULT 'warn',
                                payload    JSONB              NOT NULL DEFAULT '{}',
                                ip_address INET,
                                created_at TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_re_session ON runtime_events (session_id);
CREATE INDEX idx_re_user    ON runtime_events (user_id);
CREATE INDEX idx_re_type    ON runtime_events (event_type);
CREATE INDEX idx_re_created ON runtime_events (created_at DESC);

-- ── Role permissions ──────────────────────────────────────────────────────────

CREATE TABLE role_permissions (
                                  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                                  role_name   TEXT        NOT NULL UNIQUE,
                                  permissions JSONB       NOT NULL DEFAULT '[]',
                                  is_system   BOOLEAN     NOT NULL DEFAULT false,
                                  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO role_permissions (role_name, permissions, is_system) VALUES
                                                                     ('admin',   '["*"]'::jsonb, true),
                                                                     ('support', '["users.view","users.ban","users.hwid_reset","licenses.view","licenses.revoke","keys.view","promo.view","events.view","transactions.view","logs.view","settings.general"]'::jsonb, true),
                                                                     ('partner', '["partner.earnings"]'::jsonb, true),
                                                                     ('user',    '[]'::jsonb, true);

-- ── Promo codes ───────────────────────────────────────────────────────────────

CREATE TABLE promo_codes (
                             id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
                             code         TEXT           NOT NULL UNIQUE,
                             partner_id   UUID           REFERENCES users(id) ON DELETE SET NULL,
                             discount_pct INT            NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 100),
                             partner_pct  INT            NOT NULL DEFAULT 0 CHECK (partner_pct  BETWEEN 0 AND 100),
                             uses_total   INT            NOT NULL DEFAULT 0,
                             uses_max     INT,
                             is_active    BOOLEAN        NOT NULL DEFAULT true,
                             expires_at   TIMESTAMPTZ,
                             created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_promo_code    ON promo_codes (code);
CREATE INDEX idx_promo_partner ON promo_codes (partner_id);
CREATE INDEX idx_promo_active  ON promo_codes (is_active);

-- ── Partner earnings ──────────────────────────────────────────────────────────

CREATE TABLE partner_earnings (
                                  id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
                                  partner_id UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                  payment_id UUID           REFERENCES payments(id)    ON DELETE SET NULL,
                                  promo_id   UUID           REFERENCES promo_codes(id) ON DELETE SET NULL,
                                  amount     NUMERIC(10,2)  NOT NULL,
                                  currency   TEXT           NOT NULL DEFAULT 'USD',
                                  is_paid    BOOLEAN        NOT NULL DEFAULT false,
                                  paid_at    TIMESTAMPTZ,
                                  created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pe_partner ON partner_earnings (partner_id);
CREATE INDEX idx_pe_paid    ON partner_earnings (is_paid);

-- ── Loader keys ───────────────────────────────────────────────────────────────

CREATE TABLE loader_keys (
                             id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                             key_value  TEXT        NOT NULL UNIQUE,
                             plan_id    UUID        NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
                             tier_id    UUID        REFERENCES plan_tiers(id) ON DELETE SET NULL,
                             is_used    BOOLEAN     NOT NULL DEFAULT false,
                             used_by    UUID        REFERENCES users(id) ON DELETE SET NULL,
                             used_at    TIMESTAMPTZ,
                             created_by UUID        REFERENCES users(id) ON DELETE SET NULL,
                             created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lk_plan  ON loader_keys (plan_id);
CREATE INDEX idx_lk_used  ON loader_keys (is_used);
CREATE INDEX idx_lk_value ON loader_keys (key_value);