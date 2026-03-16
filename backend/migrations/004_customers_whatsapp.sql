-- Migration 004: Add missing customer columns for WhatsApp bot

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS locality        TEXT,
  ADD COLUMN IF NOT EXISTS delivery_lat    NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS delivery_lng    NUMERIC(10,7);

-- Add unique constraint on phone for ON CONFLICT to work
CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_unique ON customers(phone) WHERE phone IS NOT NULL;
