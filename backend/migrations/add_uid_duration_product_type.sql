-- UID для аккаунтов (автоинкремент)
ALTER TABLE users ADD COLUMN IF NOT EXISTS uid SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS users_uid_idx ON users (uid);

-- duration_days в loader_keys для установки срока подписки
ALTER TABLE loader_keys ADD COLUMN IF NOT EXISTS duration_days INTEGER;

-- product_type и config_file_key в subscription_plans
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'subscription',
  ADD COLUMN IF NOT EXISTS config_file_key TEXT;
