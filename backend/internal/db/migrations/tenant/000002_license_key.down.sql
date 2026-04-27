ALTER TABLE {{SCHEMA}}.licenses
DROP COLUMN IF EXISTS license_key,
    DROP COLUMN IF EXISTS secret_key;