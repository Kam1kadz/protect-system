SET search_path TO {{SCHEMA}};

DROP TABLE IF EXISTS loader_keys;
DROP TABLE IF EXISTS partner_earnings;
DROP TABLE IF EXISTS promo_codes;
DROP TABLE IF EXISTS role_permissions;

ALTER TABLE tenant_config
DROP COLUMN IF EXISTS maintenance_mode,
    DROP COLUMN IF EXISTS maintenance_message;