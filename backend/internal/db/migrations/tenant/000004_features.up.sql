ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'partner';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'support';

ALTER TABLE tenant_config
    ADD COLUMN IF NOT EXISTS maintenance_mode    BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS maintenance_message TEXT;

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
                                                                     ('user',    '[]'::jsonb, true)
    ON CONFLICT (role_name) DO NOTHING;

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

CREATE TABLE partner_earnings (
                                  id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
                                  partner_id UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                  payment_id UUID           REFERENCES payments(id)     ON DELETE SET NULL,
                                  promo_id   UUID           REFERENCES promo_codes(id)  ON DELETE SET NULL,
                                  amount     NUMERIC(10,2)  NOT NULL,
                                  currency   TEXT           NOT NULL DEFAULT 'USD',
                                  is_paid    BOOLEAN        NOT NULL DEFAULT false,
                                  paid_at    TIMESTAMPTZ,
                                  created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pe_partner ON partner_earnings (partner_id);
CREATE INDEX idx_pe_paid    ON partner_earnings (is_paid);

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