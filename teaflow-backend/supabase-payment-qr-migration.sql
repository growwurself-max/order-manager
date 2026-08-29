-- TeaFlow Payment Settings + UPI QR Migration (per-shop)
-- Run in Supabase SQL Editor. Idempotent. Uses existing architecture.

ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS payment_pay_now_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS payment_pay_later_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS payment_upi_qr_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS payment_upi_qr_image_url TEXT DEFAULT '';

-- Backfill existing rows to required defaults
UPDATE shop_settings SET payment_pay_now_enabled = TRUE WHERE payment_pay_now_enabled IS NULL;
UPDATE shop_settings SET payment_pay_later_enabled = FALSE WHERE payment_pay_later_enabled IS NULL;
UPDATE shop_settings SET payment_upi_qr_enabled = FALSE WHERE payment_upi_qr_enabled IS NULL;
UPDATE shop_settings SET payment_upi_qr_image_url = '' WHERE payment_upi_qr_image_url IS NULL;

-- Extend orders payment_method to include upi_qr
DO $$ BEGIN
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('','pay_later','pay_now','upi_qr'));

DO $$ BEGIN
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('unpaid','pending','paid','failed','refunded'));

CREATE INDEX IF NOT EXISTS idx_orders_shop_payment_method ON orders(shop_id, payment_method);
