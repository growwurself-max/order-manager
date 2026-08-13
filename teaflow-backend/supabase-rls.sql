-- TeaFlow Supabase RLS Policies (least-privilege)
-- Run this after creating the tables.
--
-- NOTE: The backend uses the SERVICE ROLE key, which bypasses RLS entirely.
-- These policies exist as defense-in-depth so that the ANON key (which is
-- public and committed to the repo) can never read PII or mutate data.
--
-- Only the two genuinely public reads are allowed for anon:
--   - available menu items (public menu)
--   - shop_settings (public shop info such as name/address/open status)
-- Everything else (owners, workers, orders, customers, super_admins,
-- order_sequences, global_settings) is denied to anon.

-- Enable RLS on all tables
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

-- ===========================
-- Drop any pre-existing (insecure) policies for idempotency
-- ===========================
DROP POLICY IF EXISTS "Owners can view their own data" ON owners;
DROP POLICY IF EXISTS "Owners can update their own data" ON owners;
DROP POLICY IF EXISTS "Service role full access on owners" ON owners;
DROP POLICY IF EXISTS "Workers can view their own shop data" ON workers;
DROP POLICY IF EXISTS "Workers can be managed by owners" ON workers;
DROP POLICY IF EXISTS "Service role full access on workers" ON workers;
DROP POLICY IF EXISTS "Public can view available menu items" ON menu_items;
DROP POLICY IF EXISTS "Owners can manage menu items" ON menu_items;
DROP POLICY IF EXISTS "Service role full access on menu_items" ON menu_items;
DROP POLICY IF EXISTS "Public can create orders" ON orders;
DROP POLICY IF EXISTS "Customers can view their own orders" ON orders;
DROP POLICY IF EXISTS "Workers can update orders" ON orders;
DROP POLICY IF EXISTS "Service role full access on orders" ON orders;
DROP POLICY IF EXISTS "Public can view shop settings" ON shop_settings;
DROP POLICY IF EXISTS "Owners can manage shop settings" ON shop_settings;
DROP POLICY IF EXISTS "Service role full access on shop_settings" ON shop_settings;

-- ===========================
-- owners  (anon: NO access)
-- ===========================
CREATE POLICY "Service role full access on owners" ON owners
  FOR ALL USING (auth.role() = 'service_role');

-- ===========================
-- workers  (anon: NO access)
-- ===========================
CREATE POLICY "Service role full access on workers" ON workers
  FOR ALL USING (auth.role() = 'service_role');

-- ===========================
-- menu_items  (anon: read-only available items)
-- ===========================
CREATE POLICY "Public can view available menu items" ON menu_items
  FOR SELECT USING (is_available = true);

CREATE POLICY "Service role full access on menu_items" ON menu_items
  FOR ALL USING (auth.role() = 'service_role');

-- ===========================
-- orders  (anon: NO access)
-- ===========================
CREATE POLICY "Service role full access on orders" ON orders
  FOR ALL USING (auth.role() = 'service_role');

-- ===========================
-- shop_settings  (anon: read-only, public info)
-- ===========================
CREATE POLICY "Public can view shop settings" ON shop_settings
  FOR SELECT USING (true);

CREATE POLICY "Service role full access on shop_settings" ON shop_settings
  FOR ALL USING (auth.role() = 'service_role');

-- ===========================
-- customers  (anon: NO access)
-- ===========================
CREATE POLICY "Service role full access on customers" ON customers
  FOR ALL USING (auth.role() = 'service_role');

-- ===========================
-- order_sequences  (anon: NO access)
-- ===========================
CREATE POLICY "Service role full access on order_sequences" ON order_sequences
  FOR ALL USING (auth.role() = 'service_role');

-- ===========================
-- super_admins  (anon: NO access)
-- ===========================
CREATE POLICY "Service role full access on super_admins" ON super_admins
  FOR ALL USING (auth.role() = 'service_role');

-- ===========================
-- global_settings  (anon: NO access)
-- ===========================
CREATE POLICY "Service role full access on global_settings" ON global_settings
  FOR ALL USING (auth.role() = 'service_role');
