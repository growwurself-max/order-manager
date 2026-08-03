import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';
import { generateToken } from '../middleware/auth.js';
import { PASSWORD_SALT_ROUNDS } from '../utils/constants.js';
import { AuthError, NotFoundError } from '../utils/AppError.js';
import { generateShopId, validateShopIdFormat, getShopByIdentifier, getShopIdentifierFromRow } from '../utils/generateShopId.js';

// ===========================
// Auth
// ===========================
export const loginSuperAdmin = async (email, password) => {
  const { data: admin, error } = await supabase
    .from('super_admins')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error || !admin) {
    throw new AuthError('Invalid credentials');
  }

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    throw new AuthError('Invalid credentials');
  }

  const token = generateToken(admin.id, null, 'super_admin');
  return {
    token,
    user: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: 'super_admin',
    },
  };
};

// ===========================
// Dashboard Stats
// ===========================
export const getSuperAdminStats = async () => {
  // Total Shops
  const { count: totalShops } = await supabase
    .from('shop_settings')
    .select('*', { count: 'exact', head: true });

  // Active Shops
  const { count: activeShops } = await supabase
    .from('shop_settings')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_status', 'active');

  // Suspended Shops
  const { count: suspendedShops } = await supabase
    .from('shop_settings')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_status', 'suspended');

  // Trial Shops
  const { count: trialShops } = await supabase
    .from('shop_settings')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_status', 'trial');

  // Expired Shops
  const { count: expiredShops } = await supabase
    .from('shop_settings')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_status', 'expired');

  // Premium Shops
  const { count: premiumShops } = await supabase
    .from('shop_settings')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_plan', 'premium');

  // Free Shops
  const { count: freeShops } = await supabase
    .from('shop_settings')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_plan', 'free');

  // Total Owners
  const { count: totalOwners } = await supabase
    .from('owners')
    .select('*', { count: 'exact', head: true });

  // Total Workers
  const { count: totalWorkers } = await supabase
    .from('workers')
    .select('*', { count: 'exact', head: true });

  // New Shops This Month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { count: newShopsThisMonth } = await supabase
    .from('shop_settings')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfMonth.toISOString());

  // Active Subscriptions (non-expired, non-suspended)
  const { count: activeSubscriptions } = await supabase
    .from('shop_settings')
    .select('*', { count: 'exact', head: true })
    .in('subscription_status', ['active', 'trial']);

  // Calculate Platform Subscription Revenue (MRR)
  // Assuming premium plans cost ₹999/month, free = ₹0, trial = ₹0
  const PREMIUM_MONTHLY_PRICE = 999;
  const { data: premiumShopsData } = await supabase
    .from('shop_settings')
    .select('id')
    .eq('subscription_plan', 'premium')
    .in('subscription_status', ['active', 'trial']);
  const mrr = (premiumShopsData?.length || 0) * PREMIUM_MONTHLY_PRICE;
  const arr = mrr * 12;

  // Recent Shop Registrations (latest 5)
  const { data: recentShops } = await supabase
    .from('shop_settings')
    .select('id, shop_name, subscription_plan, subscription_status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    totalShops: totalShops || 0,
    activeShops: activeShops || 0,
    suspendedShops: suspendedShops || 0,
    trialShops: trialShops || 0,
    expiredShops: expiredShops || 0,
    premiumShops: premiumShops || 0,
    freeShops: freeShops || 0,
    totalOwners: totalOwners || 0,
    totalWorkers: totalWorkers || 0,
    newShopsThisMonth: newShopsThisMonth || 0,
    activeSubscriptions: activeSubscriptions || 0,
    mrr: mrr || 0,
    arr: arr || 0,
    recentShopRegistrations: recentShops || [],
  };
};

// ===========================
// Shop Management
// ===========================
export const getAllShops = async (filters = {}) => {
  let query = supabase.from('shop_settings').select('*');

  if (filters.search) {
    query = query.or(
      `shop_name.ilike.%${filters.search}%,contact->>email.ilike.%${filters.search}%`
    );
  }
  if (filters.status && filters.status !== 'all') {
    query = query.eq('subscription_status', filters.status);
  }
  if (filters.plan && filters.plan !== 'all') {
    query = query.eq('subscription_plan', filters.plan);
  }

  query = query.order('created_at', { ascending: false });

  const { data: shops, error: shopsError } = await query;
  if (shopsError) throw shopsError;

  const { data: owners, error: ownersError } = await supabase
    .from('owners')
    .select('id, name, email, phone, shop_id, is_active');

  if (ownersError) throw ownersError;

  // Map owners to shops
  return shops.map((shop) => {
    const owner = owners.find((o) => o.shop_id === shop.id);
    return {
      ...shop,
      shop_identifier: getShopIdentifierFromRow(shop) || shop.shop_identifier || null,
      owner: owner || null,
    };
  });
};

export const createShop = async (shopData, origin) => {
  console.log('=== CREATE SHOP START ===');
  console.log('Received shopData:', JSON.stringify(shopData, null, 2));
  console.log('Received origin:', origin);

  // Check database connection
  console.log('Testing database connection...');
  const { data: testConnection, error: connectionError } = await supabase
    .from('shop_settings')
    .select('id')
    .limit(1);
  
  if (connectionError) {
    console.error('Database connection failed:', JSON.stringify(connectionError, null, 2));
    throw new Error(`Database connection failed: ${connectionError.message}`);
  }
  console.log('Database connection successful');

  // 1. Generate unique Shop ID
  const shopIdentifier = await generateShopId();
  console.log('Generated Shop ID:', shopIdentifier);

  // 2. Insert shop settings (without owner_id first)
  const shopSettings = {
    orderPrefix: 'OM',
    allowPreorder: false,
    taxRate: 0.18,
    currency: 'INR',
    notifications: { email: true, sms: false },
    shop_identifier: shopIdentifier,
  };

  const shopInsertData = {
    shop_name: shopData.shopName,
    address: { street: shopData.streetAddress || '' },
    contact: {
      phone: shopData.phoneNumber,
      email: shopData.ownerEmail,
    },
    settings: shopSettings,
    branding: {
      primaryColor: '#FF6F00',
      theme: 'light',
    },
    subscription_plan: shopData.subscriptionPlan || (shopData.trialDays ? 'trial' : 'free'),
    subscription_status: shopData.subscriptionPlan === 'trial' || shopData.trialDays ? 'trial' : 'active',
    trial_days: shopData.trialDays ? parseInt(shopData.trialDays) : 30,
  };
  console.log('Shop insert data:', JSON.stringify(shopInsertData, null, 2));

  let shop, shopError;
  try {
    const result = await supabase
      .from('shop_settings')
      .insert([shopInsertData])
      .select()
      .single();
    shop = result.data;
    shopError = result.error;
  } catch (err) {
    console.error('Exception during shop insertion:', err);
    throw new Error(`Exception during shop insertion: ${err.message}`);
  }

  if (shopError) {
    console.error('Shop insertion error:', JSON.stringify(shopError, null, 2));
    console.error('Error code:', shopError.code);
    console.error('Error message:', shopError.message);
    console.error('Error details:', shopError.details);
    console.error('Error hint:', shopError.hint);
    throw new Error(`Shop insertion failed: ${shopError.message} (Code: ${shopError.code})`);
  }
  console.log('Shop created successfully:', shop.id);

  // 3. Hash owner password & Insert owner
  console.log('Hashing owner password...');
  const hashedPassword = await bcrypt.hash(shopData.ownerPassword, PASSWORD_SALT_ROUNDS);
  console.log('Password hashed successfully');

  const ownerInsertData = {
    email: shopData.ownerEmail,
    password: hashedPassword,
    name: shopData.ownerName,
    phone: shopData.phoneNumber,
    role: 'owner',
    shop_id: shop.id,
    is_active: true,
  };
  console.log('Owner insert data:', JSON.stringify({ ...ownerInsertData, password: '***' }, null, 2));

  let owner, ownerError;
  try {
    const result = await supabase
      .from('owners')
      .insert([ownerInsertData])
      .select()
      .single();
    owner = result.data;
    ownerError = result.error;
  } catch (err) {
    console.error('Exception during owner insertion:', err);
    // Cleanup created shop on owner creation failure
    console.log('Cleaning up shop due to owner creation exception...');
    await supabase.from('shop_settings').delete().eq('id', shop.id);
    throw new Error(`Exception during owner insertion: ${err.message}`);
  }

  if (ownerError) {
    console.error('Owner insertion error:', JSON.stringify(ownerError, null, 2));
    console.error('Error code:', ownerError.code);
    console.error('Error message:', ownerError.message);
    console.error('Error details:', ownerError.details);
    console.error('Error hint:', ownerError.hint);
    // Cleanup created shop on owner creation failure
    console.log('Cleaning up shop due to owner creation failure...');
    await supabase.from('shop_settings').delete().eq('id', shop.id);
    throw new Error(`Owner insertion failed: ${ownerError.message} (Code: ${ownerError.code})`);
  }
  console.log('Owner created successfully:', owner.id);

  // 4. Update shop settings with owner_id & customer_url using Shop ID
  const productionUrl = origin || 'https://order-manager-team.vercel.app';
  const customerUrl = `${productionUrl}/customer?shop=${shopIdentifier}`;
  console.log('Generated customer_url:', customerUrl);

  const shopUpdateData = {
    owner_id: owner.id,
    customer_url: customerUrl,
    settings: {
      ...(typeof shop.settings === 'object' && !Array.isArray(shop.settings) ? shop.settings : {}),
      shop_identifier: shopIdentifier,
    },
  };
  console.log('Shop update data:', JSON.stringify(shopUpdateData, null, 2));

  let updatedShop, updateError;
  try {
    const result = await supabase
      .from('shop_settings')
      .update(shopUpdateData)
      .eq('id', shop.id)
      .select()
      .single();
    updatedShop = result.data;
    updateError = result.error;
  } catch (err) {
    console.error('Exception during shop update:', err);
    throw new Error(`Exception during shop update: ${err.message}`);
  }

  if (updateError) {
    console.error('Shop update error:', JSON.stringify(updateError, null, 2));
    console.error('Error code:', updateError.code);
    console.error('Error message:', updateError.message);
    console.error('Error details:', updateError.details);
    console.error('Error hint:', updateError.hint);
    throw new Error(`Shop update failed: ${updateError.message} (Code: ${updateError.code})`);
  }
  console.log('Shop updated successfully with owner_id and customer_url');

  console.log('=== CREATE SHOP SUCCESS ===');
  return {
    shop: {
      ...updatedShop,
      shop_identifier: shopIdentifier,
      customer_url: customerUrl,
    },
    owner: {
      id: owner.id,
      name: owner.name,
      email: owner.email,
      phone: owner.phone,
    },
  };
};

export const updateShop = async (shopId, updates) => {
  const updateData = {};
  if (updates.shopName !== undefined) updateData.shop_name = updates.shopName;
  if (updates.address !== undefined) updateData.address = updates.address;
  if (updates.contact !== undefined) updateData.contact = updates.contact;
  if (updates.subscriptionPlan !== undefined) updateData.subscription_plan = updates.subscriptionPlan;
  if (updates.subscriptionStatus !== undefined) updateData.subscription_status = updates.subscriptionStatus;
  if (updates.trialDays !== undefined) updateData.trial_days = parseInt(updates.trialDays);
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

  let shopIdentifierToStore = null;

  // Handle Shop ID updates (only for Super Admin)
  if (updates.shopIdentifier !== undefined) {
    if (!validateShopIdFormat(updates.shopIdentifier)) {
      throw new Error('Invalid Shop ID format. Must be in format SHA#### (e.g., SHA1001)');
    }

    const existingShop = await getShopByIdentifier(updates.shopIdentifier);
    if (existingShop && existingShop.id !== shopId) {
      throw new Error('Shop ID already exists');
    }

    shopIdentifierToStore = updates.shopIdentifier;
    const productionUrl = 'https://order-manager-team.vercel.app';
    updateData.customer_url = `${productionUrl}/customer?shop=${updates.shopIdentifier}`;
  }

  // Regenerate Shop ID if requested
  if (updates.regenerateShopId) {
    shopIdentifierToStore = await generateShopId();
    const productionUrl = 'https://order-manager-team.vercel.app';
    updateData.customer_url = `${productionUrl}/customer?shop=${shopIdentifierToStore}`;
  }

  if (shopIdentifierToStore) {
    const { data: existingShop } = await supabase
      .from('shop_settings')
      .select('settings')
      .eq('id', shopId)
      .maybeSingle();

    const existingSettings = typeof existingShop?.settings === 'object' && !Array.isArray(existingShop.settings)
      ? existingShop.settings
      : {};

    updateData.settings = {
      ...existingSettings,
      shop_identifier: shopIdentifierToStore,
    };
  }

  const { data, error } = await supabase
    .from('shop_settings')
    .update(updateData)
    .eq('id', shopId)
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    shop_identifier: getShopIdentifierFromRow(data) || data.shop_identifier || null,
  };
};

export const deleteShop = async (shopId) => {
  // Finding owner first to clean up
  const { data: shop } = await supabase
    .from('shop_settings')
    .select('owner_id')
    .eq('id', shopId)
    .maybeSingle();

  if (shop && shop.owner_id) {
    // Delete the owner, which will cascade delete the shop_settings too due to ON DELETE CASCADE
    const { error: deleteOwnerError } = await supabase
      .from('owners')
      .delete()
      .eq('id', shop.owner_id);

    if (deleteOwnerError) throw deleteOwnerError;
  } else {
    // If no owner_id linked yet, delete shop directly
    const { error: deleteShopError } = await supabase
      .from('shop_settings')
      .delete()
      .eq('id', shopId);

    if (deleteShopError) throw deleteShopError;
  }
  return true;
};

export const getShopStats = async (shopId) => {
  // Shop details
  const { data: shop, error: shopError } = await supabase
    .from('shop_settings')
    .select('*')
    .eq('id', shopId)
    .maybeSingle();

  if (shopError || !shop) throw new NotFoundError('Shop not found');

  // Orders count
  const { count: totalOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('shop_id', shopId);

  // Revenue
  const { data: revenueData } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('shop_id', shopId)
    .eq('status', 'completed');
  const totalRevenue = (revenueData || []).reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  // Customers
  const { data: customerData } = await supabase
    .from('orders')
    .select('customer')
    .eq('shop_id', shopId);
  const phones = new Set((customerData || []).map((o) => o.customer?.phone).filter(Boolean));

  // Menu items count
  const { count: menuItems } = await supabase
    .from('menu_items')
    .select('*', { count: 'exact', head: true })
    .eq('shop_id', shopId);

  // Workers count
  const { count: workers } = await supabase
    .from('workers')
    .select('*', { count: 'exact', head: true })
    .eq('shop_id', shopId);

  // Owner
  const { data: owner } = await supabase
    .from('owners')
    .select('id, name, email, phone, is_active')
    .eq('shop_id', shopId)
    .maybeSingle();

  return {
    ...shop,
    owner: owner || null,
    stats: {
      totalOrders: totalOrders || 0,
      totalRevenue,
      totalCustomers: phones.size,
      menuItems: menuItems || 0,
      workers: workers || 0,
    },
  };
};

// Reset shop credentials (reset owner password)
export const resetShopCredentials = async (shopId, newPassword) => {
  const { data: shop } = await supabase
    .from('shop_settings')
    .select('owner_id')
    .eq('id', shopId)
    .maybeSingle();

  if (!shop || !shop.owner_id) {
    throw new NotFoundError('No owner linked to this shop');
  }

  const hashedPassword = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
  const { data, error } = await supabase
    .from('owners')
    .update({ password: hashedPassword })
    .eq('id', shop.owner_id)
    .select('id, name, email')
    .single();

  if (error) throw error;
  return data;
};

// ===========================
// Subscription Management
// ===========================
export const updateSubscription = async (shopId, updates) => {
  const updateData = {};
  if (updates.subscriptionPlan !== undefined) updateData.subscription_plan = updates.subscriptionPlan;
  if (updates.subscriptionStatus !== undefined) updateData.subscription_status = updates.subscriptionStatus;
  if (updates.trialDays !== undefined) {
    updateData.trial_days = parseInt(updates.trialDays);
  }

  const { data, error } = await supabase
    .from('shop_settings')
    .update(updateData)
    .eq('id', shopId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getSubscriptionOverview = async () => {
  // Expiring Trials (trials ending within 7 days)
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  const { data: expiringTrials } = await supabase
    .from('shop_settings')
    .select('id, shop_name, subscription_plan, subscription_status, trial_days, created_at, contact')
    .eq('subscription_status', 'trial')
    .lte('created_at', sevenDaysFromNow.toISOString())
    .order('created_at', { ascending: true });

  // Calculate trial expiry for each
  const expiringTrialsWithDays = (expiringTrials || []).map(shop => {
    const createdDate = new Date(shop.created_at);
    const trialEndDate = new Date(createdDate);
    trialEndDate.setDate(trialEndDate.getDate() + (shop.trial_days || 30));
    const daysRemaining = Math.ceil((trialEndDate - new Date()) / (1000 * 60 * 60 * 24));
    return {
      ...shop,
      trialEndDate: trialEndDate.toISOString(),
      daysRemaining: Math.max(0, daysRemaining),
    };
  }).filter(shop => shop.daysRemaining <= 7);

  // Renewal Due (active subscriptions near renewal - assuming monthly cycle)
  // For now, we'll show all active subscriptions that need attention
  const { data: renewalDue } = await supabase
    .from('shop_settings')
    .select('id, shop_name, subscription_plan, subscription_status, created_at, updated_at, contact')
    .eq('subscription_status', 'active')
    .order('updated_at', { ascending: true });

  // Revenue by Plan
  const { data: allShops } = await supabase
    .from('shop_settings')
    .select('id, subscription_plan, subscription_status');

  // Calculate revenue by plan (using completed orders)
  const { data: ordersByPlan } = await supabase
    .from('orders')
    .select('shop_id, total_amount, status')
    .eq('status', 'completed');

  const planRevenue = {};
  const planCounts = {};

  (allShops || []).forEach(shop => {
    const plan = shop.subscription_plan || 'free';
    planCounts[plan] = (planCounts[plan] || 0) + 1;
    planRevenue[plan] = planRevenue[plan] || 0;
  });

  (ordersByPlan || []).forEach(order => {
    const shop = allShops?.find(s => s.id === order.shop_id);
    if (shop) {
      const plan = shop.subscription_plan || 'free';
      planRevenue[plan] = (planRevenue[plan] || 0) + Number(order.total_amount || 0);
    }
  });

  const revenueByPlan = Object.keys(planRevenue).map(plan => ({
    plan,
    shopCount: planCounts[plan] || 0,
    revenue: planRevenue[plan] || 0,
  }));

  // Subscription Distribution
  const { data: subscriptionStats } = await supabase
    .from('shop_settings')
    .select('subscription_plan, subscription_status');

  const distribution = {
    free: 0,
    trial: 0,
    premium: 0,
    active: 0,
    suspended: 0,
    expired: 0,
  };

  (subscriptionStats || []).forEach(shop => {
    const plan = shop.subscription_plan || 'free';
    const status = shop.subscription_status || 'unknown';
    if (typeof distribution[plan] !== 'undefined') {
      distribution[plan]++;
    }
    if (typeof distribution[status] !== 'undefined') {
      distribution[status]++;
    }
  });

  return {
    expiringTrials: expiringTrialsWithDays,
    renewalDue: renewalDue || [],
    revenueByPlan,
    distribution,
  };
};

// ===========================
// Owner Management
// ===========================
export const getAllOwners = async () => {
  const { data, error } = await supabase
    .from('owners')
    .select('id, name, email, phone, role, shop_id, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Join shop names
  const { data: shops } = await supabase
    .from('shop_settings')
    .select('id, shop_name');

  return data.map((owner) => {
    const shop = shops?.find((s) => s.id === owner.shop_id);
    return {
      ...owner,
      shopName: shop ? shop.shop_name : 'Unknown Shop',
    };
  });
};

export const createOwner = async (ownerData) => {
  const hashedPassword = await bcrypt.hash(ownerData.password, PASSWORD_SALT_ROUNDS);
  const { data, error } = await supabase
    .from('owners')
    .insert([
      {
        email: ownerData.email,
        password: hashedPassword,
        name: ownerData.name,
        phone: ownerData.phone || '',
        role: 'owner',
        shop_id: ownerData.shopId,
        is_active: true,
      },
    ])
    .select('id, name, email, phone, role, shop_id, is_active, created_at')
    .single();

  if (error) throw error;
  return data;
};

export const updateOwner = async (ownerId, updates) => {
  const updateData = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.phone !== undefined) updateData.phone = updates.phone;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

  const { data, error } = await supabase
    .from('owners')
    .update(updateData)
    .eq('id', ownerId)
    .select('id, name, email, phone, role, shop_id, is_active, created_at')
    .single();

  if (error) throw error;
  return data;
};

export const resetOwnerPassword = async (ownerId, newPassword) => {
  const hashedPassword = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
  const { data, error } = await supabase
    .from('owners')
    .update({ password: hashedPassword })
    .eq('id', ownerId)
    .select('id, name, email')
    .single();

  if (error) throw error;
  return data;
};

export const deleteOwner = async (ownerId) => {
  const { error } = await supabase
    .from('owners')
    .delete()
    .eq('id', ownerId);

  if (error) throw error;
  return true;
};

// ===========================
// Global Settings
// ===========================
export const getGlobalSettings = async () => {
  const { data, error } = await supabase
    .from('global_settings')
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return (
    data || {
      platform_name: 'Order Manager',
      logo: '',
      support_email: 'support@ordermanager.com',
      contact_number: '',
      announcement_banner: '',
      maintenance_mode: false,
      default_trial_days: 30,
      default_subscription_plan: 'free',
    }
  );
};

export const updateGlobalSettings = async (updates) => {
  const updateData = {};
  if (updates.platformName !== undefined) updateData.platform_name = updates.platformName;
  if (updates.logo !== undefined) updateData.logo = updates.logo;
  if (updates.supportEmail !== undefined) updateData.support_email = updates.supportEmail;
  if (updates.contactNumber !== undefined) updateData.contact_number = updates.contactNumber;
  if (updates.announcementBanner !== undefined) updateData.announcement_banner = updates.announcementBanner;
  if (updates.maintenanceMode !== undefined) updateData.maintenance_mode = updates.maintenanceMode;
  if (updates.defaultTrialDays !== undefined) updateData.default_trial_days = parseInt(updates.defaultTrialDays);
  if (updates.defaultSubscriptionPlan !== undefined) updateData.default_subscription_plan = updates.defaultSubscriptionPlan;

  // Check if settings row exists
  const { data: existing } = await supabase
    .from('global_settings')
    .select('id')
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('global_settings')
      .update(updateData)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('global_settings')
      .insert([updateData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// ===========================
// Analytics
// ===========================
export const getAnalytics = async (query = {}) => {
  const days = parseInt(query.days) || 30;
  const startDate = query.startDate || new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const endDate = query.endDate || new Date().toISOString();

  // Orders per day
  const { data: ordersData } = await supabase
    .from('orders')
    .select('created_at, total_amount, status')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true });

  // Group by day
  const ordersByDay = {};
  const revenueByDay = {};
  (ordersData || []).forEach((o) => {
    const day = new Date(o.created_at).toISOString().split('T')[0];
    ordersByDay[day] = (ordersByDay[day] || 0) + 1;
    if (o.status === 'completed') {
      revenueByDay[day] = (revenueByDay[day] || 0) + Number(o.total_amount || 0);
    }
  });

  const ordersPerDay = Object.keys(ordersByDay)
    .sort()
    .map((day) => ({ date: day, count: ordersByDay[day], revenue: revenueByDay[day] || 0 }));

  // Top shops by order count
  const { data: topShopsData } = await supabase
    .from('orders')
    .select('shop_id, total_amount')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const shopStats = {};
  (topShopsData || []).forEach((o) => {
    if (!shopStats[o.shop_id]) {
      shopStats[o.shop_id] = { orders: 0, revenue: 0 };
    }
    shopStats[o.shop_id].orders += 1;
    if (o.status === 'completed') {
      shopStats[o.shop_id].revenue += Number(o.total_amount || 0);
    }
  });

  const topShopIds = Object.keys(shopStats);
  let shopNameMap = {};
  if (topShopIds.length > 0) {
    const { data: shopsInfo } = await supabase
      .from('shop_settings')
      .select('id, shop_name')
      .in('id', topShopIds);
    shopNameMap = (shopsInfo || []).reduce((acc, s) => {
      acc[s.id] = s.shop_name;
      return acc;
    }, {});
  }

  const topShops = Object.entries(shopStats)
    .map(([shopId, stats]) => ({
      shopId,
      shopName: shopNameMap[shopId] || 'Unknown',
      orders: stats.orders,
      revenue: stats.revenue,
    }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 10);

  // Active customers (placed order in last N days)
  const { data: activeCustomerData } = await supabase
    .from('orders')
    .select('customer')
    .gte('created_at', startDate);
  const activePhones = new Set(
    (activeCustomerData || []).map((o) => o.customer?.phone).filter(Boolean)
  );

  // Platform growth (shops created per day)
  const { data: shopsGrowth } = await supabase
    .from('shop_settings')
    .select('created_at')
    .gte('created_at', startDate)
    .order('created_at', { ascending: true });

  const growthByDay = {};
  (shopsGrowth || []).forEach((s) => {
    const day = new Date(s.created_at).toISOString().split('T')[0];
    growthByDay[day] = (growthByDay[day] || 0) + 1;
  });

  const platformGrowth = Object.keys(growthByDay)
    .sort()
    .map((day) => ({ date: day, newShops: growthByDay[day] }));

  // Customer growth (new customers per day)
  const { data: customerGrowth } = await supabase
    .from('orders')
    .select('customer, created_at')
    .gte('created_at', startDate)
    .order('created_at', { ascending: true });

  const customerByDay = {};
  const seenCustomers = new Set();
  (customerGrowth || []).forEach((o) => {
    const day = new Date(o.created_at).toISOString().split('T')[0];
    const customerKey = o.customer?.phone || o.customer?.email;
    if (customerKey && !seenCustomers.has(customerKey)) {
      seenCustomers.add(customerKey);
      customerByDay[day] = (customerByDay[day] || 0) + 1;
    }
  });

  const customerGrowthData = Object.keys(customerByDay)
    .sort()
    .map((day) => ({ date: day, newCustomers: customerByDay[day] }));

  // Monthly trends (aggregate by month)
  const monthlyTrends = {};
  (ordersData || []).forEach((o) => {
    const month = new Date(o.created_at).toISOString().slice(0, 7); // YYYY-MM
    if (!monthlyTrends[month]) {
      monthlyTrends[month] = { orders: 0, revenue: 0 };
    }
    monthlyTrends[month].orders += 1;
    if (o.status === 'completed') {
      monthlyTrends[month].revenue += Number(o.total_amount || 0);
    }
  });

  const monthlyData = Object.keys(monthlyTrends)
    .sort()
    .map((month) => ({
      month,
      orders: monthlyTrends[month].orders,
      revenue: monthlyTrends[month].revenue,
    }));

  // Summary
  const totalOrdersInPeriod = (ordersData || []).length;
  const totalRevenueInPeriod = (ordersData || [])
    .filter((o) => o.status === 'completed')
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  return {
    period: { startDate, endDate, days },
    summary: {
      totalOrders: totalOrdersInPeriod,
      totalRevenue: totalRevenueInPeriod,
      activeCustomers: activePhones.size,
      newShops: (shopsGrowth || []).length,
    },
    ordersPerDay,
    topShops,
    platformGrowth,
    customerGrowth: customerGrowthData,
    monthlyTrends: monthlyData,
  };
};

// ===========================
// Notifications / Alerts
// ===========================
export const getNotifications = async () => {
  const notifications = [];

  // New Shop Registrations (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data: newShops } = await supabase
    .from('shop_settings')
    .select('id, shop_name, created_at, subscription_plan')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  (newShops || []).forEach(shop => {
    notifications.push({
      id: `shop-${shop.id}`,
      type: 'new_shop',
      title: 'New Shop Registration',
      message: `${shop.shop_name} has registered on ${new Date(shop.created_at).toLocaleDateString()}`,
      severity: 'info',
      createdAt: shop.created_at,
      data: shop,
    });
  });

  // Trial Expiry Alerts (trials expiring within 7 days)
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  const { data: expiringTrials } = await supabase
    .from('shop_settings')
    .select('id, shop_name, created_at, trial_days, contact')
    .eq('subscription_status', 'trial');

  (expiringTrials || []).forEach(shop => {
    const createdDate = new Date(shop.created_at);
    const trialEndDate = new Date(createdDate);
    trialEndDate.setDate(trialEndDate.getDate() + (shop.trial_days || 30));
    const daysRemaining = Math.ceil((trialEndDate - new Date()) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 7 && daysRemaining > 0) {
      notifications.push({
        id: `trial-${shop.id}`,
        type: 'trial_expiry',
        title: 'Trial Expiring Soon',
        message: `${shop.shop_name}'s trial expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
        severity: daysRemaining <= 3 ? 'critical' : 'warning',
        createdAt: shop.created_at,
        data: { ...shop, daysRemaining, trialEndDate: trialEndDate.toISOString() },
      });
    }
  });

  // Payment Due / Renewal Alerts (active subscriptions)
  const { data: activeShops } = await supabase
    .from('shop_settings')
    .select('id, shop_name, updated_at, subscription_plan, contact')
    .eq('subscription_status', 'active');

  (activeShops || []).forEach(shop => {
    const lastUpdate = new Date(shop.updated_at);
    const daysSinceUpdate = Math.ceil((new Date() - lastUpdate) / (1000 * 60 * 60 * 24));
    
    // Alert if subscription hasn't been updated in 28+ days (assuming monthly cycle)
    if (daysSinceUpdate >= 28) {
      notifications.push({
        id: `renewal-${shop.id}`,
        type: 'renewal_due',
        title: 'Subscription Renewal Due',
        message: `${shop.shop_name}'s ${shop.subscription_plan} subscription may need renewal`,
        severity: daysSinceUpdate >= 30 ? 'critical' : 'warning',
        createdAt: shop.updated_at,
        data: { ...shop, daysSinceUpdate },
      });
    }
  });

  // System Alerts (suspended shops)
  const { data: suspendedShops } = await supabase
    .from('shop_settings')
    .select('id, shop_name, subscription_status, updated_at')
    .eq('subscription_status', 'suspended');

  (suspendedShops || []).forEach(shop => {
    notifications.push({
      id: `suspended-${shop.id}`,
      type: 'system',
      title: 'Shop Suspended',
      message: `${shop.shop_name} is currently suspended`,
      severity: 'warning',
      createdAt: shop.updated_at,
      data: shop,
    });
  });

  // Expired Shops
  const { data: expiredShops } = await supabase
    .from('shop_settings')
    .select('id, shop_name, subscription_status, updated_at')
    .eq('subscription_status', 'expired');

  (expiredShops || []).forEach(shop => {
    notifications.push({
      id: `expired-${shop.id}`,
      type: 'system',
      title: 'Subscription Expired',
      message: `${shop.shop_name}'s subscription has expired`,
      severity: 'critical',
      createdAt: shop.updated_at,
      data: shop,
    });
  });

  // Sort by severity (critical first) then by date (newest first)
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  notifications.sort((a, b) => {
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return {
    notifications: notifications.slice(0, 50), // Limit to 50 most recent
    unreadCount: notifications.filter(n => severityOrder[n.severity] <= 1).length,
  };
};