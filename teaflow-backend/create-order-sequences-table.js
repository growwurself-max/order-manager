// Migration: Create order_sequences table for sequential ORD order numbers
// Run with: node create-order-sequences-table.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 1. Try using the supabase-js .rpc() with a custom exec_sql function
try {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `CREATE TABLE IF NOT EXISTS order_sequences (
      shop_id UUID PRIMARY KEY NOT NULL REFERENCES shop_settings(id) ON DELETE CASCADE,
      last_number BIGINT NOT NULL DEFAULT 100000,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`,
  });
  if (!error) {
    console.log('✅ order_sequences table created via exec_sql RPC');
    process.exit(0);
  } else {
    console.log('ℹ️  exec_sql RPC not available:', error.message);
  }
} catch (e) {
  console.log('ℹ️  exec_sql RPC error:', e.message);
}

// 2. Fallback: create table using PostgREST (REST API) - this only works if the table has RLS permissions
// For RLS-managed migrations, we instead provide the SQL to run in Supabase Studio.
console.log('\n⚠️  The order_sequences table could not be created via API.');
console.log('Please run the following SQL manually in your Supabase SQL Editor:');
console.log('\n--- SUPABASE SQL EDITOR ---');
console.log(`
-- ===========================
-- Table: order_sequences (for sequential order numbers ORD100001, ORD100002...)
-- ===========================
CREATE TABLE IF NOT EXISTS order_sequences (
  shop_id UUID PRIMARY KEY NOT NULL REFERENCES shop_settings(id) ON DELETE CASCADE,
  last_number BIGINT NOT NULL DEFAULT 100000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`);
console.log('--- END SQL ---');