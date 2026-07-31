import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

const runSchema = async () => {
  try {
    console.log('=== Current Database State ===');
    
    // Check shop_settings columns
    const { data: shopData, error: shopError } = await supabase
      .from('shop_settings')
      .select('*')
      .limit(1);
    
    if (shopError) {
      console.log('shop_settings error:', shopError.message);
    } else if (shopData && shopData.length > 0) {
      console.log('shop_settings columns:', Object.keys(shopData[0]).join(', '));
    } else {
      console.log('shop_settings: table exists but empty');
    }

    // Check super_admins
    const { error: saError } = await supabase
      .from('super_admins')
      .select('count', { count: 'exact', head: true });
    console.log('super_admins:', saError ? saError.message : 'exists');

    // Check global_settings
    const { error: gsError } = await supabase
      .from('global_settings')
      .select('count', { count: 'exact', head: true });
    console.log('global_settings:', gsError ? gsError.message : 'exists');

    // Now try to execute SQL via the Supabase Management API
    // The Management API requires a PAT (Personal Access Token), not the service role key
    // But we can try using the service role key as a bearer token
    
    console.log('\n=== Attempting to execute SQL via Management API ===');
    console.log(`Project ref: ${projectRef}`);
    
    const schema = fs.readFileSync(path.resolve(__dirname, 'supabase-schema.sql'), 'utf8');
    
    // Try the SQL endpoint
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/sql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ query: schema })
      }
    );
    
    const result = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${result.substring(0, 500)}`);
    
    if (response.ok) {
      console.log('\n✓ Schema executed successfully!');
    } else {
      console.log('\n✗ Management API failed. Trying alternative approach...');
      
      // Try using the Supabase client to create the tables via the REST API
      // We can use the .from() method to check if we can insert into tables
      console.log('\n=== Trying to create tables via REST API ===');
      
      // Create super_admins table by inserting a row (this won't work for DDL)
      // Instead, let's try to use the pg_dump endpoint or check if there's another way
      
      console.log('Cannot execute DDL via REST API. Please run the SQL manually in Supabase Dashboard.');
      console.log('\nTo fix this:');
      console.log('1. Go to https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
      console.log('2. Paste the contents of supabase-schema.sql');
      console.log('3. Click "Run"');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
};

runSchema();