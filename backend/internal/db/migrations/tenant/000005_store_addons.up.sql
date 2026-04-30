-- UID для аккаунтов (автоинкремент)
ALTER TABLE users ADD COLUMN IF NOT EXISTS uid SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS users_uid_idx ON users (uid);

-- duration_days в loader_keys для установки срока подписки при генерации ключа
ALTER TABLE loader_keys ADD COLUMN IF NOT EXISTS duration_days INTEGER;

-- доп. типы товаров и конфиги (в перспективе выдача файла)
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'subscription',
  ADD COLUMN IF NOT EXISTS config_file_key TEXT;

-- поддержка 1.19.4 (оставляем существующие значения, добавляем новое)
ALTER TYPE mc_version ADD VALUE IF NOT EXISTS '1.19.4';

