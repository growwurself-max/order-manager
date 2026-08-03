import { supabase } from '../config/supabase.js';
import { getShopIdentifierFromRow } from '../utils/generateShopId.js';
import bcrypt from 'bcryptjs';
import { PASSWORD_SALT_ROUNDS, ORDER_STATUS, DEFAULT_RECALL_TIMER_MINUTES } from '../utils/constants.js';
import { generateOrderNumber } from '../utils/generateOrderId.js';

// ===========================
// Owners
// ===========================
export const createOwner = async (ownerData) => {
  const { password, ...rest } = ownerData;
  const hashedPassword = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  
  const { data, error } = await supabase
    .from('owners')
    .insert([{ ...rest, password: hashedPassword }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const findOwnerByEmail = async (email) => {
  const { data, error } = await supabase
    .from('owners')
    .select('*')
    .eq('email', email)
    .single();
  
  if (error) return null;
  return data;
};

export const updateOwner = async (id, updates) => {
  const { password, ...rest } = updates;
  const updateData = { ...rest };
  
  if (password) {
    updateData.password = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  }
  
  const { data, error } = await supabase
    .from('owners')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const getOwnerById = async (id) => {
  const { data, error } = await supabase
    .from('owners')
    .select('id, email, name, phone, shop_id, role, is_active, created_at, updated_at')
    .eq('id', id)
    .single();
  
  if (error) return null;
  return data;
};

// ===========================
// Workers
// ===========================
export const createWorker = async (workerData) => {
  const { pin, ...rest } = workerData;
  const hashedPin = await bcrypt.hash(pin.toString(), PASSWORD_SALT_ROUNDS);
  
  const { data, error } = await supabase
    .from('workers')
    .insert([{ ...rest, pin: hashedPin }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const findWorkerByUsername = async (username) => {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('username', username)
    .single();
  
  if (error) return null;
  return data;
};

export const getWorkersByShopId = async (shopId) => {
  const { data, error } = await supabase
    .from('workers')
    .select('id, shop_id, username, name, role, is_active, created_at, updated_at')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const getWorkerById = async (id, shopId) => {
  const { data, error } = await supabase
    .from('workers')
    .select('id, shop_id, username, name, role, is_active, created_at, updated_at')
    .eq('id', id)
    .eq('shop_id', shopId)
    .single();
  
  if (error) return null;
  return data;
};

export const updateWorker = async (id, shopId, updates) => {
  const { password, pin, ...rest } = updates;
  const updateData = { ...rest };
  
  if (password !== undefined || pin !== undefined) {
    updateData.pin = await bcrypt.hash((password || pin).toString(), PASSWORD_SALT_ROUNDS);
  }
  
  const { data, error } = await supabase
    .from('workers')
    .update(updateData)
    .eq('id', id)
    .eq('shop_id', shopId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteWorker = async (id, shopId) => {
  const { error } = await supabase
    .from('workers')
    .delete()
    .eq('id', id)
    .eq('shop_id', shopId);
  
  if (error) throw error;
};

// ===========================
// Shop Settings
// ===========================
export const createShopSettings = async (shopData) => {
  const { data, error } = await supabase
    .from('shop_settings')
    .insert([shopData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const getShopSettingsById = async (id) => {
  const { data, error } = await supabase
    .from('shop_settings')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) return null;
  return {
    ...data,
    shop_identifier: getShopIdentifierFromRow(data) || data.shop_identifier || null,
  };
};

export const getFirstActiveShop = async () => {
  const { data, error } = await supabase
    .from('shop_settings')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  
  if (error) return null;
  return data;
};

export const updateShopSettings = async (id, updates) => {
  const { data, error } = await supabase
    .from('shop_settings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// ===========================
// Menu Items
// ===========================
export const createMenuItem = async (shopId, menuData) => {
  const { price, ...rest } = menuData;
  const menuItemData = {
    ...rest,
    shop_id: shopId,
    base_price: price !== undefined ? price : menuData.base_price,
  };
  
  const { data, error } = await supabase
    .from('menu_items')
    .insert([menuItemData])
    .select()
    .single();
  
  if (error) throw error;
  return { ...data, price: data.base_price };
};

export const getMenuByShopId = async (shopId) => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('shop_id', shopId)
    .eq('is_available', true)
    .order('category', { ascending: true })
    .order('display_order', { ascending: true });
  
  if (error) throw error;
  return (data || []).map(item => ({ ...item, price: item.base_price }));
};

export const getMenuById = async (id) => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) return null;
  return { ...data, price: data.base_price };
};

export const updateMenuItem = async (id, updates) => {
  const { price, ...rest } = updates;
  const updateData = { ...rest };
  
  if (price !== undefined) {
    updateData.base_price = price;
  }
  
  const { data, error } = await supabase
    .from('menu_items')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return { ...data, price: data.base_price };
};

export const deleteMenuItem = async (id) => {
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// ===========================
// Orders
// ===========================
export const createOrder = async (shopId, orderData) => {
  const { customer, items, notes, totalAmount, orderNumber } = orderData;

  let processedItems = items;
  
  if (!processedItems || processedItems.length === 0) {
    throw new Error('Order must have at least one item');
  }

  const order = {
    shop_id: shopId,
    order_number: orderNumber || await generateOrderNumber(shopId),
    customer: customer || {},
    items: processedItems,
    total_amount: totalAmount || 0,
    notes: notes || '',
    status: ORDER_STATUS.PLACED,
    placed_at: new Date().toISOString(),
    status_history: [
      {
        status: ORDER_STATUS.PLACED,
        timestamp: new Date().toISOString(),
        updated_by: 'customer',
      },
    ],
  };

  const { data, error } = await supabase
    .from('orders')
    .insert([order])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const getOrderById = async (id) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) return null;
  return data;
};

export const getOrdersByShopId = async (shopId, filters = {}) => {
  let query = supabase
    .from('orders')
    .select('*')
    .eq('shop_id', shopId);

  if (filters.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters.startDate || filters.endDate) {
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const getActiveOrders = async (shopId) => {
  const activeStatuses = [
    ORDER_STATUS.PLACED,
    ORDER_STATUS.PREPARING,
    ORDER_STATUS.READY,
  ];

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('shop_id', shopId)
    .in('status', activeStatuses)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const updateOrderStatus = async (id, newStatus, updatedBy = 'system') => {
  const order = await getOrderById(id);
  if (!order) {
    throw new Error('Order not found');
  }

  const allowedTransitions = {
    [ORDER_STATUS.PLACED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.READY, ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY, ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.READY]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.COMPLETED]: [],
    [ORDER_STATUS.CANCELLED]: [],
  };

  const validTransitions = allowedTransitions[order.status] || [];
  if (!validTransitions.includes(newStatus)) {
    throw new Error(`Invalid status transition from ${order.status} to ${newStatus}`);
  }

  const statusHistory = order.status_history || [];
  statusHistory.push({
    status: newStatus,
    timestamp: new Date().toISOString(),
    updated_by: updatedBy,
  });

  const updates = {
    status: newStatus,
    status_history: statusHistory,
  };

  if (newStatus === ORDER_STATUS.READY) {
    updates.ready_at = new Date().toISOString();
    updates.recall_count = 0;
    updates.last_recall_at = null;
  }

  if (newStatus === ORDER_STATUS.COMPLETED) {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const isWaitingForPickup = (order, timerMinutes = DEFAULT_RECALL_TIMER_MINUTES) => {
  if (order.status !== ORDER_STATUS.READY) return false;
  if (!order.ready_at) return false;
  const elapsed = (Date.now() - new Date(order.ready_at).getTime()) / 1000 / 60;
  return elapsed >= timerMinutes;
};

export const attachRecallFields = (order) => {
  if (!order) return order;
  return {
    ...order,
    waitingForPickup: isWaitingForPickup(order),
  };
};

export const recallCustomer = async (id, updatedBy = 'system') => {
  const order = await getOrderById(id);
  if (!order) {
    throw new Error('Order not found');
  }

  if (order.status !== ORDER_STATUS.READY) {
    throw new Error('Recall can only be triggered for orders that are ready');
  }

  const statusHistory = order.status_history || [];
  statusHistory.push({
    status: 'recall',
    timestamp: new Date().toISOString(),
    updated_by: updatedBy,
  });

  const { data, error } = await supabase
    .from('orders')
    .update({
      recall_count: (order.recall_count || 0) + 1,
      last_recall_at: new Date().toISOString(),
      status_history: statusHistory,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getRecallStats = async (shopId) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('orders')
    .select('order_number, customer, recall_count, last_recall_at, status, total_amount')
    .eq('shop_id', shopId)
    .gt('recall_count', 0)
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString())
    .order('last_recall_at', { ascending: false });

  if (error) throw error;
  return {
    totalRecalledOrders: data?.length || 0,
    recallDetails: data || [],
  };
};

export const getTodayStats = async (shopId) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('orders')
    .select('status, total_amount, payment_status')
    .eq('shop_id', shopId)
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString());

  if (error) throw error;

  const totalOrders = data?.length || 0;
  const totalRevenue = (data || []).reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);
  const pendingPayments = (data || [])
    .filter(order => order.payment_status !== 'paid')
    .reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);
  const completedOrders = (data || []).filter(order => order.status === ORDER_STATUS.COMPLETED).length;

  return {
    totalOrders,
    totalRevenue,
    pendingPayments,
    completedOrders,
  };
};

export const getAllOrdersForExport = async (shopId, startDate, endDate) => {
  let query = supabase
    .from('orders')
    .select('*')
    .eq('shop_id', shopId);

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const archiveCompletedOrders = async (shopId) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ archived: true })
    .eq('shop_id', shopId)
    .eq('status', ORDER_STATUS.COMPLETED)
    .eq('archived', false)
    .select('id');

  if (error) throw error;
  return { modifiedCount: data?.length || 0 };
};

export const getActiveOrderByCustomerPhone = async (shopId, phone) => {
  const activeStatuses = [
    ORDER_STATUS.PLACED,
    ORDER_STATUS.PREPARING,
    ORDER_STATUS.READY,
  ];

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('shop_id', shopId)
    .in('status', activeStatuses)
    .eq('customer->>phone', phone)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
};

export const deleteArchivedOrders = async (shopId) => {
  // First count the orders to be deleted
  const { count, error: countError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('shop_id', shopId)
    .eq('status', ORDER_STATUS.COMPLETED)
    .eq('archived', true);

  if (countError) throw countError;

  // Then delete them
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('shop_id', shopId)
    .eq('status', ORDER_STATUS.COMPLETED)
    .eq('archived', true);

  if (error) throw error;
  return { deletedCount: count || 0 };
};

export const upsertCustomerFromOrder = async (shopId, order) => {
  const customer = order.customer || {};
  const phone = customer.phone?.trim();
  const name = customer.name?.trim();

  if (!phone || !name) return null;

  const { data, error } = await supabase
    .from('customers')
    .upsert(
      {
        shop_id: shopId,
        phone,
        name,
        last_table_number: customer.tableNumber || customer.table_number || 'Takeaway',
        last_order_id: order.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'shop_id,phone' }
    )
    .select()
    .single();

  if (error) {
    console.warn('Customer persistence skipped:', error.message);
    return null;
  }

  return data;
};

export const updatePaymentStatus = async (id, paymentStatus) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ payment_status: paymentStatus })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};
