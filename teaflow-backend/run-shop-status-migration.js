import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const main = async () => {
  try {
    console.log('Starting shop status migration...');
    
    // Check if columns already exist
    const { data: existingColumns, error: checkError } = await supabase
      .from('shop_settings')
      .select('is_open_for_orders, workers_available')
      .limit(1);
    
    if (!checkError && existingColumns) {
      console.log('Columns already exist! Skipping migration.');
      return;
    }
    
    console.log('Adding new columns to shop_settings table...');
    
    // We need to execute SQL directly. Since Supabase REST API doesn't support DDL,
    // we'll provide instructions for manual execution
    console.log('\n=== MANUAL SQL EXECUTION REQUIRED ===');
    console.log('Please execute the following SQL in your Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/' + process.env.SUPABASE_PROJECT_REF + '/sql/new');
    console.log('\nSQL to execute:');
    console.log('----------------------------------------');
    const sql = fs.readFileSync(path.resolve(__dirname, 'add-shop-status-columns.sql'), 'utf8');
    console.log(sql);
    console.log('----------------------------------------');
    
    console.log('\nAfter executing the SQL, the following columns will be added:');
    console.log('- is_open_for_orders (BOOLEAN, DEFAULT TRUE)');
    console.log('- workers_available (BOOLEAN, DEFAULT TRUE)');
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

main();
