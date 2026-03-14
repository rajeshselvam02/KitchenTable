-- Migration 002: Subscription-driven delivery model + WhatsApp + Porter

-- Add missing columns to subscriptions
ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Add WhatsApp + geo columns to customers
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS delivery_lat NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS delivery_lng NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS locality TEXT;

-- Update plan_type constraint to match our 3 plans
-- (no hard constraint since we use CHECK in app layer)

-- Deliveries table — one row per subscription per meal per day
CREATE TABLE IF NOT EXISTS deliveries (
  id                SERIAL PRIMARY KEY,
  subscription_id   INTEGER REFERENCES subscriptions(id),
  customer_id       INTEGER REFERENCES customers(id),
  delivery_date     DATE NOT NULL,
  meal_type         TEXT NOT NULL CHECK (meal_type IN ('lunch','dinner')),
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','preparing','ready','out_for_delivery','delivered','failed','skipped','auto_confirmed')),
  dish_id           INTEGER REFERENCES dishes(id),
  porter_order_id   TEXT,
  porter_status     TEXT,
  rider_name        TEXT,
  rider_phone       TEXT,
  rider_lat         NUMERIC(10,7),
  rider_lng         NUMERIC(10,7),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent duplicate deliveries for same sub+date+meal
CREATE UNIQUE INDEX IF NOT EXISTS deliveries_sub_date_meal 
  ON deliveries(subscription_id, delivery_date, meal_type);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS deliveries_date_idx ON deliveries(delivery_date);
CREATE INDEX IF NOT EXISTS deliveries_customer_idx ON deliveries(customer_id);
CREATE INDEX IF NOT EXISTS deliveries_status_idx ON deliveries(status);

-- WhatsApp bot sessions table
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id            SERIAL PRIMARY KEY,
  phone         TEXT NOT NULL UNIQUE,
  state         TEXT NOT NULL DEFAULT 'greeting',
  data          JSONB DEFAULT '{}',
  customer_id   INTEGER REFERENCES customers(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wa_sessions_phone_idx ON whatsapp_sessions(phone);

-- Starter pack conversion tracking
CREATE TABLE IF NOT EXISTS starter_pack_conversions (
  id              SERIAL PRIMARY KEY,
  customer_id     INTEGER REFERENCES customers(id),
  starter_sub_id  INTEGER REFERENCES subscriptions(id),
  converted_to    TEXT CHECK (converted_to IN ('weekly','monthly','churned')),
  converted_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
