BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'STAFF' CHECK (role IN ('ADMIN','STAFF')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dishes (
  id               SERIAL PRIMARY KEY,
  name             TEXT UNIQUE NOT NULL,
  category         TEXT NOT NULL,
  cost_per_serving NUMERIC(10,2) NOT NULL CHECK (cost_per_serving > 0)
);

CREATE TABLE IF NOT EXISTS menus (
  id      SERIAL PRIMARY KEY,
  day     DATE NOT NULL,
  dish_id INT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  portion TEXT NOT NULL DEFAULT 'regular' CHECK (portion IN ('regular','large')),
  UNIQUE(day, dish_id)
);

CREATE TABLE IF NOT EXISTS customers (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  phone      TEXT,
  address    TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id          SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  plan_type   TEXT NOT NULL DEFAULT 'standard',
  meal_type   TEXT NOT NULL DEFAULT 'veg',
  start_date  DATE NOT NULL,
  end_date    DATE,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','cancelled','pending')),
  auto_renew  BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS orders (
  id                SERIAL PRIMARY KEY,
  customer_id       INT NOT NULL REFERENCES customers(id),
  dish_id           INT NOT NULL REFERENCES dishes(id),
  quantity          INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  total_price       NUMERIC(10,2) NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','preparing','ready','delivered')),
  prep_time_seconds INT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_waste (
  id         SERIAL PRIMARY KEY,
  dish_id    INT REFERENCES dishes(id),
  wasted_qty INT NOT NULL,
  unit_cost  NUMERIC(10,2) NOT NULL,
  wasted_at  TIMESTAMPTZ DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_orders_created_at    ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id   ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders(status);
CREATE INDEX IF NOT EXISTS idx_menus_day            ON menus(day);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_waste_wasted_at      ON inventory_waste(wasted_at DESC);

COMMIT;
