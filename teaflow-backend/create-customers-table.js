import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const createCustomersTable = async () => {
  try {
    console.log('Creating customers table...');
    
    const { error } = await supabase.rpc('exec_sql', {
      query_text: `
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
      `
    });

    if (error) {
      console.log('RPC error, trying direct table creation check...');
      // Check if table exists
      const { data, error: checkError } = await supabase
        .from('customers')
        .select('count', { count: 'exact', head: true });
      
      if (checkError) {
        console.error('Error creating customers table:', checkError.message);
        console.log('Please run this SQL in Supabase SQL Editor:');
        console.log(`
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
        `);
        process.exit(1);
      } else {
        console.log('customers table already exists!');
      }
    } else {
      console.log('customers table created successfully!');
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

createCustomersTable();
