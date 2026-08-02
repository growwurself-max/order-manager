import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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
const SALT_ROUNDS = 10;

const CREDENTIALS = {
  superAdmin: {
    email: 'admin@ordermanager.com',
    password: 'Admin@12345',
    name: 'Platform Super Admin',
  },
  owner: {
    email: 'owner@demo.com',
    password: 'Owner@12345',
    name: 'Demo Shop Owner',
    phone: '+919876543210',
  },
  worker: {
    username: 'worker@demo.com',
    password: 'Worker@12345',
    name: 'Demo Worker',
  },
};

const hash = (value) => bcrypt.hash(value, SALT_ROUNDS);

const findOne = async (table, match) => {
  let query = supabase.from(table).select('*');
  Object.entries(match).forEach(([key, value]) => {
    query = query.eq(key, value);
  });

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
};

const saveSingle = async (table, payload, match) => {
  const existing = await findOne(table, match);

  if (existing) {
    const { data, error } = await supabase
      .from(table)
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase.from(table).insert([payload]).select().single();
  if (error) throw error;
  return data;
};

const seedDatabase = async () => {
  try {
    console.log('Starting production-ready seed...');

    const adminPassword = await hash(CREDENTIALS.superAdmin.password);
    await saveSingle(
      'super_admins',
      {
        email: CREDENTIALS.superAdmin.email,
        password: adminPassword,
        name: CREDENTIALS.superAdmin.name,
        role: 'super_admin',
        updated_at: new Date().toISOString(),
      },
      { email: CREDENTIALS.superAdmin.email }
    );

    const shop = await saveSingle(
      'shop_settings',
      {
        shop_name: 'Demo Tea Shop',
        address: {
          street: '123 Tea Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400001',
          country: 'India',
        },
        contact: {
          phone: CREDENTIALS.owner.phone,
          email: CREDENTIALS.owner.email,
          website: 'https://ordermanager.com',
        },
        settings: {
          orderPrefix: 'TF',
          allowPreorder: false,
          taxRate: 0.18,
          currency: 'INR',
          notifications: { email: true, sms: false },
        },
        branding: {
          primaryColor: '#4CAF50',
          theme: 'light',
        },
        subscription_plan: 'trial',
        subscription_status: 'trial',
        trial_days: 30,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { shop_name: 'Demo Tea Shop' }
    );

    const ownerPassword = await hash(CREDENTIALS.owner.password);
    const owner = await saveSingle(
      'owners',
      {
        email: CREDENTIALS.owner.email,
        password: ownerPassword,
        name: CREDENTIALS.owner.name,
        phone: CREDENTIALS.owner.phone,
        role: 'owner',
        shop_id: shop.id,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { email: CREDENTIALS.owner.email }
    );

    const customerUrl = `${process.env.FRONTEND_URL || 'https://ordermanager.vercel.app'}/customer?shop=${shop.id}`;
    await supabase
      .from('shop_settings')
      .update({ owner_id: owner.id, customer_url: customerUrl, updated_at: new Date().toISOString() })
      .eq('id', shop.id);

    const workerPassword = await hash(CREDENTIALS.worker.password);
    await saveSingle(
      'workers',
      {
        shop_id: shop.id,
        username: CREDENTIALS.worker.username,
        name: CREDENTIALS.worker.name,
        pin: workerPassword,
        role: 'worker',
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { username: CREDENTIALS.worker.username }
    );

    const menuItems = [
      {
        shop_id: shop.id,
        name: 'Classic Milk Tea',
        description: 'Traditional milk tea with a balanced tea and milk finish',
        category: 'milk-tea',
        base_price: 50,
        sizes: [
          { name: 'Regular', priceModifier: 0 },
          { name: 'Large', priceModifier: 20 },
        ],
        toppings: [
          { name: 'Tapioca Pearls', price: 10 },
          { name: 'Coffee Jelly', price: 15 },
        ],
        is_available: true,
        display_order: 1,
      },
      {
        shop_id: shop.id,
        name: 'Mango Slush',
        description: 'Refreshing mango slush with fruit pieces',
        category: 'slush',
        base_price: 80,
        sizes: [
          { name: 'Regular', priceModifier: 0 },
          { name: 'Large', priceModifier: 30 },
        ],
        toppings: [{ name: 'Mango Bits', price: 10 }],
        is_available: true,
        display_order: 2,
      },
      {
        shop_id: shop.id,
        name: 'Green Tea Latte',
        description: 'Smooth green tea with creamy milk',
        category: 'specialty',
        base_price: 90,
        sizes: [
          { name: 'Regular', priceModifier: 0 },
          { name: 'Large', priceModifier: 25 },
        ],
        toppings: [],
        is_available: true,
        display_order: 3,
      },
    ];

    for (const item of menuItems) {
      await saveSingle('menu_items', item, { shop_id: shop.id, name: item.name });
    }

    try {
      await saveSingle(
        'customers',
        {
          shop_id: shop.id,
          name: 'Demo Customer',
          phone: '+919999999999',
          last_table_number: 'Takeaway',
          updated_at: new Date().toISOString(),
        },
        { shop_id: shop.id, phone: '+919999999999' }
      );
    } catch (error) {
      console.log('Warning: Could not seed customers table (may not exist in schema cache):', error.message);
    }

    await saveSingle(
      'global_settings',
      {
        platform_name: 'Order Manager',
        logo: '',
        support_email: 'support@ordermanager.com',
        contact_number: '+919876543210',
        announcement_banner: '',
        maintenance_mode: false,
        default_trial_days: 30,
        default_subscription_plan: 'trial',
        updated_at: new Date().toISOString(),
      },
      { platform_name: 'Order Manager' }
    );

    console.log('Database seeded successfully.');
    console.log('\nCredentials:');
    console.log(`  Super Admin: ${CREDENTIALS.superAdmin.email} / ${CREDENTIALS.superAdmin.password}`);
    console.log(`  Owner: ${CREDENTIALS.owner.email} / ${CREDENTIALS.owner.password}`);
    console.log(`  Worker: ${CREDENTIALS.worker.username} / ${CREDENTIALS.worker.password}`);
    console.log(`\nCustomer URL: ${customerUrl}`);
  } catch (error) {
    console.error('\nSeeding failed:', error.message);
    if (error.details) console.error('Details:', error.details);
    if (error.hint) console.error('Hint:', error.hint);
    process.exit(1);
  }
};

seedDatabase();
