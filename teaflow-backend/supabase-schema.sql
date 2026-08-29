-- TeaFlow Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor after setting up your project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ===========================
-- Table: shop_settings (created first - no FK to owners yet)
-- ===========================
CREATE TABLE IF NOT EXISTS shop_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_name TEXT NOT NULL,
  address JSONB DEFAULT '{}'::jsonb,
  contact JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  branding JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================
-- Table: owners (FK to shop_settings)
-- ===========================
CREATE TABLE IF NOT EXISTS owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT DEFAULT '',
  name TEXT NOT NULL,
  role TEXT DEFAULT 'owner',
  shop_id UUID NOT NULL REFERENCES shop_settings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_owners_email ON owners(email);
CREATE INDEX IF NOT EXISTS idx_owners_shop_id ON owners(shop_id);

-- Add owner_id to shop_settings after owners table exists
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS owner_id UUID UNIQUE REFERENCES owners(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_shop_settings_owner_id ON shop_settings(owner_id);

-- ===========================
-- Table: workers
-- ===========================
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shop_settings(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  pin TEXT NOT NULL,
  role TEXT DEFAULT 'worker',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workers_shop_id ON workers(shop_id);
CREATE INDEX IF NOT EXISTS idx_workers_shop_id_active ON workers(shop_id, is_active);
CREATE INDEX IF NOT EXISTS idx_workers_username ON workers(username);

-- ===========================
-- Table: menu_items
-- ===========================
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shop_settings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('milk-tea', 'fruit-tea', 'slush', 'specialty')),
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sizes JSONB DEFAULT '[]'::jsonb,
  toppings JSONB DEFAULT '[]'::jsonb,
  is_available BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  image_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_shop_category_order ON menu_items(shop_id, category, display_order);
CREATE INDEX IF NOT EXISTS idx_menu_items_shop_id ON menu_items(shop_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_items_shop_name_unique ON menu_items(shop_id, name);

-- ===========================
-- Table: orders
-- ===========================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shop_settings(id) ON DELETE CASCADE,
  order_number TEXT UNIQUE NOT NULL,
  customer JSONB NOT NULL DEFAULT '{}'::jsonb,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('placed', 'preparing', 'ready', 'completed', 'cancelled')),
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  placed_at TIMESTAMPTZ DEFAULT NOW(),
  status_history JSONB DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ,
   payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'pending', 'failed', 'refunded')),
   payment_method TEXT DEFAULT '' CHECK (payment_method IN ('', 'pay_later', 'pay_now')),
   razorpay_order_id TEXT,
   razorpay_payment_id TEXT,
   razorpay_signature TEXT,
   payment_verified_at TIMESTAMPTZ,
   archived BOOLEAN DEFAULT FALSE,
  ready_at TIMESTAMPTZ,
  recall_count INTEGER DEFAULT 0,
  last_recall_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_shop_status_created ON orders(shop_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_shop_order_number ON orders(shop_id, order_number);
CREATE INDEX IF NOT EXISTS idx_orders_archived ON orders(archived);
-- Use BTREE index on JSONB text extraction instead of GIN (text has no default GIN operator class)
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders ((customer->>'phone'));

-- ===========================
-- Table: customers
-- ===========================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shop_settings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  last_table_number TEXT DEFAULT 'Takeaway',
  last_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_customers_shop_phone ON customers(shop_id, phone);

-- ===========================
-- Table: order_sequences (for sequential order numbers ORD100001, ORD100002...)
-- ===========================
CREATE TABLE IF NOT EXISTS order_sequences (
  shop_id UUID PRIMARY KEY NOT NULL REFERENCES shop_settings(id) ON DELETE CASCADE,
  last_number BIGINT NOT NULL DEFAULT 100000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================
-- Table: super_admins
-- ===========================
CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'super_admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================
-- Table: global_settings
-- ===========================
CREATE TABLE IF NOT EXISTS global_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_name TEXT DEFAULT 'Order Manager',
  logo TEXT DEFAULT '',
  support_email TEXT DEFAULT 'support@ordermanager.com',
  contact_number TEXT DEFAULT '',
  announcement_banner TEXT DEFAULT '',
  maintenance_mode BOOLEAN DEFAULT FALSE,
  default_trial_days INTEGER DEFAULT 30,
  default_subscription_plan TEXT DEFAULT 'free' CHECK (default_subscription_plan IN ('free', 'trial', 'premium')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================
-- Alter: shop_settings (new columns)
-- ===========================
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'trial', 'premium'));
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'trial', 'expired'));
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 30;
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ;
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS customer_url TEXT;
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS shop_identifier TEXT UNIQUE;

-- Create index for shop_identifier for faster lookups
CREATE INDEX IF NOT EXISTS idx_shop_settings_shop_identifier ON shop_settings(shop_identifier);

-- ===========================
-- Alter: owners (new columns)
-- ===========================
ALTER TABLE owners ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ===========================
-- Payment Migration (Razorpay)
-- ===========================
-- Extend orders table for Razorpay TEST MODE integration.
-- Safe for existing orders: new columns are nullable / defaulted.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_signature TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ;

-- Relax payment_status / payment_method to include pending/failed/refunded and pay_later/pay_now
-- Drop existing checks if present, then recreate with extended values.
DO $$ BEGIN
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('unpaid','pending','paid','failed','refunded'));

DO $$ BEGIN
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('','pay_later','pay_now','upi_qr'));

-- Index razorpay_order_id for webhook/verify lookups (idempotent)
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop_payment_status ON orders(shop_id, payment_status);

-- ===========================
-- Payment Settings + UPI QR (per-shop tenant)
-- ===========================
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS payment_pay_now_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS payment_pay_later_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS payment_upi_qr_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS payment_upi_qr_image_url TEXT DEFAULT '';
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS payment_upi_vpa_id TEXT DEFAULT '';
UPDATE shop_settings SET payment_pay_now_enabled = TRUE WHERE payment_pay_now_enabled IS NULL;
UPDATE shop_settings SET payment_pay_later_enabled = FALSE WHERE payment_pay_later_enabled IS NULL;
UPDATE shop_settings SET payment_upi_qr_enabled = FALSE WHERE payment_upi_qr_enabled IS NULL;
UPDATE shop_settings SET payment_upi_vpa_id = '' WHERE payment_upi_vpa_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_shop_payment_method ON orders(shop_id, payment_method);

