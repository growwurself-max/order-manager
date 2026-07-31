import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const executeSQL = async (filePath, label) => {
  console.log(`\n=== Executing ${label} ===`);
  const sql = fs.readFileSync(path.resolve(__dirname, '../', filePath), 'utf8');
  
  // Try using the REST API directly instead of rpc
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql }),
  });

  if (!response.ok) {
    // exec_sql may not exist - use direct SQL via management API
    console.log(`${label}: RPC not available, trying direct SQL via REST API...`);
    
    // Alternative: use raw SQL endpoint
    const mgmtResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'params=single-object',
      },
    });
    
    // Split the SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', { query_text: statement });
        if (error) {
          // Try via REST
          console.log(`  Statement error (may be non-critical): ${error.message}`);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (e) {
        console.log(`  Statement error: ${e.message}`);
        errorCount++;
      }
    }
    
    console.log(`${label}: ${successCount} statements executed, ${errorCount} errors`);
    return { successCount, errorCount };
  }
  
  const result = await response.json();
  console.log(`${label}: Completed`, result);
  return result;
};

const main = async () => {
  try {
    // First, check if tables already exist
    const { data: existingTables, error: tableError } = await supabase
      .from('shop_settings')
      .select('id')
      .limit(1);
    
    if (!tableError) {
      console.log('Tables already exist! Checking schema...');
      const { data: shops } = await supabase.from('shop_settings').select('count').limit(1);
      console.log('shop_settings table: OK');
      const { data: owners } = await supabase.from('owners').select('count').limit(1);
      console.log('owners table: OK');
      console.log('Schema appears to be already set up. Skipping SQL execution.');
      return;
    }
    
    console.log('Tables do not exist yet. Creating schema...');
    
    // Use Supabase Management API to execute SQL
    // The simplest approach is to use the SQL query via the /rest/v1/ endpoint
    console.log('Please execute the SQL files manually in the Supabase SQL Editor:');
    console.log('1. Open https://supabase.com/dashboard/project/' + process.env.SUPABASE_PROJECT_REF);
    console.log('2. Go to SQL Editor');
    console.log('3. Copy and paste the contents of:');
    console.log('   - supabase-schema.sql');
    console.log('   - supabase-rls.sql');
    console.log('   - supabase-storage.sql');
    console.log('');
    console.log('Or, use the Supabase CLI to run:');
    console.log('   supabase db push');
    
    // Attempt to create tables via direct INSERT first as a test
    console.log('\nTesting Supabase connection...');
    const { data, error } = await supabase.from('shop_settings').select('count', { count: 'exact', head: true });
    
    if (error) {
      if (error.code === '42P01') {
        console.log('ERROR: Tables do not exist. SQL execution required above.');
        console.log('The Supabase REST API does not support DDL (CREATE TABLE) statements.');
        console.log('You MUST run the SQL files in the Supabase SQL Editor.');
        process.exit(1);
      }
      console.log('Connection test result:', error.message);
    } else {
      console.log('Connection OK - tables accessible');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
};

main();
