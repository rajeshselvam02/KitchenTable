-- Migration 006: Make email nullable for WhatsApp customers
ALTER TABLE customers ALTER COLUMN email DROP NOT NULL;
ALTER TABLE customers ALTER COLUMN email SET DEFAULT NULL;
