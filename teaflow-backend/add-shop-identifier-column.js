import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function addShopIdentifierColumn() {
  console.log('Adding shop_identifier column to shop_settings table...');
  
  try {
    // First, check if the column already exists
    const { data: testRow, error: testError } = await supabase
      .from('shop_settings')
      .select('shop_identifier')
      .limit(1);
    
    if (!testError) {
      console.log('Column shop_identifier already exists!');
      return;
    }
    
    // Column doesn't exist, we need to add it via SQL
    // Since Supabase REST API doesn't support DDL, we'll use the SQL editor approach
    console.log('The shop_identifier column needs to be added manually.');
    console.log('Please run the following SQL in your Supabase SQL Editor:');
    console.log('\n' + '='.repeat(60));
    console.log('-- Add shop_identifier column');
    console.log('ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS shop_identifier TEXT UNIQUE;');
    console.log('\n-- Create index for faster lookups');
    console.log('CREATE INDEX IF NOT EXISTS idx_shop_settings_shop_identifier ON shop_settings(shop_identifier);');
    console.log('\n-- Add comment for documentation');
    console.log("COMMENT ON COLUMN shop_settings.shop_identifier IS 'Unique Shop ID in format S#### (e.g., S1001, S1002) for customer access';");
    console.log('='.repeat(60));
    console.log('\nAfter running the SQL, run: node migrate-shop-ids.js');
    
  } catch (error) {
    console.error('Error checking column:', error.message);
  }
}

addShopIdentifierColumn();
