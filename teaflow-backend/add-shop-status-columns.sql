-- Add Shop Open/Closed Status and Worker Availability columns to shop_settings table
-- Migration for Business Availability & Reliability Upgrade

-- Add is_open_for_orders column (default: shop is open)
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS is_open_for_orders BOOLEAN DEFAULT TRUE;

-- Add workers_available column (default: workers are available)
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS workers_available BOOLEAN DEFAULT TRUE;

-- Add indexes for faster queries on these status fields
CREATE INDEX IF NOT EXISTS idx_shop_settings_is_open ON shop_settings(is_open_for_orders);
CREATE INDEX IF NOT EXISTS idx_shop_settings_workers_available ON shop_settings(workers_available);

-- Update updated_at timestamp for all existing rows
UPDATE shop_settings SET updated_at = NOW() WHERE is_open_for_orders IS NULL OR workers_available IS NULL;
