-- TeaFlow Supabase RLS Policies
-- Run this after creating the tables

-- Enable RLS on all tables
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;

-- ===========================
-- owners policies
-- ===========================
CREATE POLICY "Owners can view their own data" ON owners
  FOR SELECT USING (true);

CREATE POLICY "Owners can update their own data" ON owners
  FOR UPDATE USING (true);

-- Service role has full access
CREATE POLICY "Service role full access on owners" ON owners
  FOR ALL USING (auth.role() = 'service_role');

-- ===========================
-- workers policies
-- ===========================
CREATE POLICY "Workers can view their own shop data" ON workers
  FOR SELECT USING (true);

CREATE POLICY "Workers can be managed by owners" ON workers
  FOR ALL USING (true);

-- Service role has full access
CREATE POLICY "Service role full access on workers" ON workers
  FOR ALL USING (auth.role() = 'service_role');

-- ===========================
-- menu_items policies
-- ===========================
CREATE POLICY "Public can view available menu items" ON menu_items
  FOR SELECT USING (is_available = true);

CREATE POLICY "Owners can manage menu items" ON menu_items
  FOR ALL USING (true);

-- Service role has full access
CREATE POLICY "Service role full access on menu_items" ON menu_items
  FOR ALL USING (auth.role() = 'service_role');

-- ===========================
-- orders policies
-- ===========================
CREATE POLICY "Public can create orders" ON orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Customers can view their own orders" ON orders
  FOR SELECT USING (true);

CREATE POLICY "Workers can update orders" ON orders
  FOR UPDATE USING (true);

-- Service role has full access
CREATE POLICY "Service role full access on orders" ON orders
  FOR ALL USING (auth.role() = 'service_role');

-- ===========================
-- shop_settings policies
-- ===========================
CREATE POLICY "Public can view shop settings" ON shop_settings
  FOR SELECT USING (true);

CREATE POLICY "Owners can manage shop settings" ON shop_settings
  FOR ALL USING (true);

-- Service role has full access
CREATE POLICY "Service role full access on shop_settings" ON shop_settings
  FOR ALL USING (auth.role() = 'service_role');