-- Migration 005: Fix customers phone unique constraint
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DROP INDEX IF EXISTS customers_phone_unique;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_phone_unique;
UPDATE customers SET phone = NULL WHERE phone = '';
ALTER TABLE customers ADD CONSTRAINT customers_phone_unique UNIQUE (phone);
