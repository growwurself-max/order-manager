import { ORDER_STATUS, DEFAULT_RECALL_TIMER_MINUTES } from '../utils/constants.js';
import { notifyCustomerRecall } from '../services/notification.service.js';
import {
  createOrder as createOrderDB,
  getOrderById as getOrderByIdDB,
  getOrdersByShopId as getOrdersByShopIdDB,
  getActiveOrders as getActiveOrdersDB,
  updateOrderStatus as updateOrderStatusDB,
  getRecallStats as getRecallStatsDB,
  getTodayStats as getTodayStatsDB,
  getAllOrdersForExport as getAllOrdersForExportDB,
  archiveCompletedOrders as archiveCompletedOrdersDB,
  getActiveOrderByCustomerPhone as getActiveOrderByCustomerPhoneDB,
  deleteArchivedOrders as deleteArchivedOrdersDB,
  recallCustomer as recallCustomerDB,
  getMenuById as getMenuByIdDB,
  upsertCustomerFromOrder,
} from '../services/supabase.service.js';
import { generateOrderNumber } from '../utils/generateOrderId.js';

export const createOrder = async (shopId, orderData) => {
  const { customer, items, notes, totalAmount: frontendTotal } = orderData;

  // Calculate total from menu items to ensure accuracy
  let totalAmount = 0;
  const processedItems = [];

  for (const item of items) {
    const menuItem = await getMenuByIdDB(item.menuItemId);
    if (!menuItem || !menuItem.is_available) {
      throw new Error(`Menu item ${item.menuItemId} not found or unavailable`);
    }

    const sizeName = item.size || 'Regular';
    const sizes = menuItem.sizes || [];
    const sizeObj = sizes.find(s => s.name === sizeName);
    const sizePriceMod = sizeObj ? sizeObj.priceModifier : 0;

    // Use price from item if provided (from frontend), otherwise calculate from basePrice
    const itemPrice = item.price || menuItem.base_price;
    let itemTotal = (itemPrice + sizePriceMod) * item.quantity;

    // Add toppings
    if (item.toppings && menuItem.toppings) {
      for (const toppingName of item.toppings) {
        const topping = menuItem.toppings.find(t => t.name === toppingName);
        if (topping) {
          itemTotal += topping.price * item.quantity;
        }
      }
    }

    totalAmount += itemTotal;

    processedItems.push({
      menu_item_id: menuItem.id,
      name: menuItem.name,
      category: menuItem.category,
      size: sizeName,
      toppings: item.toppings || [],
      quantity: item.quantity,
      unit_price: itemPrice + sizePriceMod,
      total_price: itemTotal,
    });
  }

  // Use frontend calculated total if provided and close enough, otherwise use backend calculation
  const finalTotal = frontendTotal && Math.abs(frontendTotal - totalAmount) < 0.01 ? frontendTotal : totalAmount;

  let orderNumber = await generateOrderNumber(shopId);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const result = await createOrderDB(shopId, {
        customer: customer || {},
        items: processedItems,
        notes: notes || '',
        totalAmount: finalTotal,
        orderNumber,
        frontendTotal,
      });
      await upsertCustomerFromOrder(shopId, result);
      return result;
    } catch (error) {
      if (error.code === '23505' && error.details?.includes('order_number')) {
        await new Promise(resolve => setTimeout(resolve, 100));
        orderNumber = await generateOrderNumber(shopId);
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to create order due to duplicate order number. Please try again.');
};

export const getOrderById = async (orderId) => {
  const order = await getOrderByIdDB(orderId);
  if (!order) {
    throw new Error('Order not found');
  }
  return order;
};

export const getOrdersByShopId = async (shopId, filters = {}) => {
  const orders = await getOrdersByShopIdDB(shopId, filters);
  return orders;
};

export const getActiveOrders = async (shopId) => {
  const orders = await getActiveOrdersDB(shopId);
  return orders;
};

export const updateOrderStatus = async (orderId, newStatus, updatedBy = 'system') => {
  const order = await updateOrderStatusDB(orderId, newStatus, updatedBy);
  return order;
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

export const recallCustomer = async (orderId, updatedBy = 'system') => {
  const order = await recallCustomerDB(orderId, updatedBy);
  // Fire-and-forget notification - don't block the response
  notifyCustomerRecall(order).catch(err => {
    console.error('[Notification] Recall notification failed:', err.message);
  });
  return order;
};

export const getRecallStats = async (shopId) => {
  const stats = await getRecallStatsDB(shopId);
  return stats;
};

export const getTodayStats = async (shopId) => {
  const stats = await getTodayStatsDB(shopId);
  return stats;
};

export const getAllOrdersForExport = async (shopId, startDate, endDate) => {
  const orders = await getAllOrdersForExportDB(shopId, startDate, endDate);
  return orders;
};

export const archiveCompletedOrders = async (shopId) => {
  const result = await archiveCompletedOrdersDB(shopId);
  return result;
};

export const getActiveOrderByCustomerPhone = async (shopId, phone) => {
  const orders = await getActiveOrderByCustomerPhoneDB(shopId, phone);
  return orders;
};

export const deleteArchivedOrders = async (shopId) => {
  const result = await deleteArchivedOrdersDB(shopId);
  return result;
};
