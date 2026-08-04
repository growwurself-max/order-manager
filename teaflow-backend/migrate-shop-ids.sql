-- Migration: Add shop_identifier column to shop_settings
-- This script adds the shop_identifier field and creates the unique constraint

-- Add shop_identifier column
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS shop_identifier TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shop_settings_shop_identifier ON shop_settings(shop_identifier);

-- Add comment for documentation
COMMENT ON COLUMN shop_settings.shop_identifier IS 'Unique Shop ID in format S#### (e.g., S1001, S1002) for customer access';