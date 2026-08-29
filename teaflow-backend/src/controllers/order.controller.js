import { HTTP_STATUS } from '../utils/constants.js';
import { addIdAlias } from '../utils/responseFormatter.js';
import {
  createOrder,
  getOrderById,
  getOrdersByShopId,
  getActiveOrders,
  updateOrderStatus,
  getTodayStats,
  getAllOrdersForExport,
  archiveCompletedOrders,
  deleteArchivedOrders,
  getActiveOrderByCustomerPhone,
  getRecallStats,
  attachRecallFields,
  recallCustomer,
} from '../services/order.service.js';
import { updatePaymentStatus as updatePaymentStatusDB, getShopSettingsById } from '../services/supabase.service.js';
import { resolveShopId } from '../utils/resolveShopId.js';
import { isShopId } from '../utils/generateShopId.js';

// Resolve the authenticated caller's shop to a UUID (handles S#### identifiers)
const getCallerShopId = async (req) => {
  let shopId = req.user?.shopId;
  if (shopId && isShopId(shopId)) {
    shopId = await resolveShopId(shopId);
  }
  return shopId;
};

export const placeOrder = async (req, res, next) => {
  try {
    // SECURITY FIX: Customer orders must have explicit valid shopId.
    // Removed fallback to getFirstActiveShop() — tenant must be explicit.
    // Shop can come from body.shopId (Pay Now) or query.shopId or authenticated user.
    let shopId = req.body.shopId || req.query.shopId || req.user?.shopId;
    
    if (!shopId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Shop ID is required. Please provide a valid Shop ID (e.g., S1001).',
      });
    }

    const resolvedShopId = await resolveShopId(shopId);
    if (!resolvedShopId) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Shop not found with this Shop ID',
      });
    }

    // Check if shop is open for orders
    const shopSettings = await getShopSettingsById(resolvedShopId);
    if (!shopSettings) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Shop settings not found',
      });
    }

    if (shopSettings.is_open_for_orders === false) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: 'This shop is currently closed and not accepting orders',
      });
    }

    // Extract payment fields safely (whitelist) - supports upi_qr manual flow
    const paymentMethodRaw = req.body.paymentMethod;
    const allowedPaymentMethods = ['pay_later', 'pay_now', 'upi_qr', ''];
    const paymentMethod = allowedPaymentMethods.includes(paymentMethodRaw) ? paymentMethodRaw : '';
    // Per-shop enabled check (tenant isolation, server-side)
    const payNowEnabled = shopSettings.payment_pay_now_enabled !== false;
    const payLaterEnabled = shopSettings.payment_pay_later_enabled === true;
    const upiQrEnabled = shopSettings.payment_upi_qr_enabled === true;
    const requestedMethod = paymentMethod || 'pay_later';
    if (requestedMethod === 'pay_now' && !payNowEnabled) return res.status(HTTP_STATUS.FORBIDDEN).json({ message: 'Pay Now is disabled for this shop' });
    if (requestedMethod === 'pay_later' && !payLaterEnabled) return res.status(HTTP_STATUS.FORBIDDEN).json({ message: 'Pay Later is disabled for this shop' });
    if (requestedMethod === 'upi_qr' && !upiQrEnabled) return res.status(HTTP_STATUS.FORBIDDEN).json({ message: 'UPI QR payment is disabled for this shop' });
    
    const orderData = {
      customer: req.body.customer,
      items: req.body.items,
      notes: req.body.notes,
      paymentMethod: requestedMethod,
    };

    const order = await createOrder(resolvedShopId, orderData);
    const mapped = addIdAlias(order);

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Order placed successfully',
      data: {
        orderId: mapped.id,
        _id: mapped.id,
        orderNumber: mapped.orderNumber,
        status: mapped.status,
        totalAmount: mapped.totalAmount,
        paymentStatus: mapped.paymentStatus,
        paymentMethod: mapped.paymentMethod,
      },
    });
  } catch (error) {
    if (error.message && error.message.includes('duplicate order number')) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        message: 'Order number conflict. Please try placing your order again.',
      });
    }
    next(error);
  }
};

// Public-facing order projection: keeps tracking info but strips PII.
const toPublicOrder = (order) => {
  if (!order) return order;
  const mapped = addIdAlias(order);
  return {
    ...mapped,
    customer: {
      phone: mapped.customer?.phone ? mapped.customer.phone.replace(/.(?=.{4})/g, '*') : undefined,
      name: mapped.customer?.name,
      tableNumber: mapped.customer?.tableNumber || mapped.customer?.table_number,
    },
  };
};

export const getOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await getOrderById(orderId);
    const mapped = toPublicOrder(order);

    res.status(HTTP_STATUS.OK).json({
      message: 'Order status fetched successfully',
      data: mapped,
    });
  } catch (error) {
    next(error);
  }
};

export const getShopActiveOrders = async (req, res, next) => {
  try {
    let shopId = req.user.shopId;
    console.log('[getShopActiveOrders] Incoming shopId from user:', shopId);

    // Resolve Shop ID to UUID if needed
    if (shopId && isShopId(shopId)) {
      console.log('[getShopActiveOrders] Shop ID detected, resolving to UUID');
      const resolvedShopId = await resolveShopId(shopId);
      if (!resolvedShopId) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          message: 'Shop not found',
        });
      }
      shopId = resolvedShopId;
      console.log('[getShopActiveOrders] Resolved UUID:', shopId);
    }

    console.log('Fetching active orders for shopId:', shopId);
    console.log('User:', req.user);
    const orders = await getActiveOrders(shopId);
    console.log('Active orders found:', orders.length);

    res.status(HTTP_STATUS.OK).json({
      message: 'Active orders fetched successfully',
      data: addIdAlias(orders),
      count: orders.length,
    });
  } catch (error) {
    console.error('Get active orders error:', error.message);
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const updatedBy = req.user.name || 'system';

    if (req.user.role === 'worker' && !['ready', 'completed'].includes(status)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: 'Workers can only mark orders ready or completed',
      });
    }

    const shopId = await getCallerShopId(req);
    const order = await updateOrderStatus(orderId, shopId, status, updatedBy);

    res.status(HTTP_STATUS.OK).json({
      message: 'Order status updated successfully',
      data: {
        orderId: order.id,
        _id: order.id,
        status: order.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getShopOrders = async (req, res, next) => {
  try {
    let shopId = req.user.shopId;
    console.log('[getShopOrders] Incoming shopId from user:', shopId);

    // Resolve Shop ID to UUID if needed
    if (shopId && isShopId(shopId)) {
      console.log('[getShopOrders] Shop ID detected, resolving to UUID');
      const resolvedShopId = await resolveShopId(shopId);
      if (!resolvedShopId) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          message: 'Shop not found',
        });
      }
      shopId = resolvedShopId;
      console.log('[getShopOrders] Resolved UUID:', shopId);
    }

    const filters = req.query;

    const orders = await getOrdersByShopId(shopId, filters);

    res.status(HTTP_STATUS.OK).json({
      message: 'Orders fetched successfully',
      data: addIdAlias(orders),
      count: orders.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    let shopId = req.user.shopId;
    console.log('[getDashboardStats] Incoming shopId from user:', shopId);

    // Resolve Shop ID to UUID if needed
    if (shopId && isShopId(shopId)) {
      console.log('[getDashboardStats] Shop ID detected, resolving to UUID');
      const resolvedShopId = await resolveShopId(shopId);
      if (!resolvedShopId) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          message: 'Shop not found',
        });
      }
      shopId = resolvedShopId;
      console.log('[getDashboardStats] Resolved UUID:', shopId);
    }

    const stats = await getTodayStats(shopId);

    res.status(HTTP_STATUS.OK).json({
      message: 'Dashboard stats fetched successfully',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const exportOrders = async (req, res, next) => {
  try {
    let shopId = req.user?.shopId;
    
    if (!shopId) {
      shopId = req.query.shopId;
    }
    
    if (!shopId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Shop ID is required. Please provide a valid Shop ID.',
      });
    }

    const resolvedShopId = await resolveShopId(shopId);
    if (!resolvedShopId) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Shop not found with this Shop ID',
      });
    }

    const orders = await getAllOrdersForExport(resolvedShopId, req.query.startDate, req.query.endDate);

    const escapeCSVValue = (value) => {
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      'Order Number',
      'Customer Name',
      'Mobile Number',
      'Ordered Items',
      'Quantity',
      'Total Amount',
      'Order Status',
      'Payment Status',
      'Date & Time',
    ];

    const csvRows = [headers.map(escapeCSVValue).join(',')];

    for (const order of orders) {
      const itemsString = order.items
        .map(item => `${item.name} x${item.quantity}`)
        .join('; ');
      
      const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

      const row = [
        order.order_number,
        order.customer?.name || '',
        order.customer?.phone,
        itemsString,
        totalQuantity,
        order.total_amount,
        order.status,
        order.payment_status || (order.status === 'completed' ? 'paid' : 'unpaid'),
        order.created_at,
      ];

      csvRows.push(row.map(escapeCSVValue).join(','));
    }

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
    res.status(HTTP_STATUS.OK).send(csvContent);
  } catch (error) {
    next(error);
  }
};

export const archiveOrders = async (req, res, next) => {
  try {
    let shopId = req.user.shopId;
    console.log('[archiveOrders] Incoming shopId from user:', shopId);

    // Resolve Shop ID to UUID if needed
    if (shopId && isShopId(shopId)) {
      console.log('[archiveOrders] Shop ID detected, resolving to UUID');
      const resolvedShopId = await resolveShopId(shopId);
      if (!resolvedShopId) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          message: 'Shop not found',
        });
      }
      shopId = resolvedShopId;
      console.log('[archiveOrders] Resolved UUID:', shopId);
    }

    const result = await archiveCompletedOrders(shopId);

    res.status(HTTP_STATUS.OK).json({
      message: 'Orders archived successfully',
      data: {
        archivedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteArchivedOrdersController = async (req, res, next) => {
  try {
    let shopId = req.user.shopId;
    console.log('[deleteArchivedOrdersController] Incoming shopId from user:', shopId);

    // Resolve Shop ID to UUID if needed
    if (shopId && isShopId(shopId)) {
      console.log('[deleteArchivedOrdersController] Shop ID detected, resolving to UUID');
      const resolvedShopId = await resolveShopId(shopId);
      if (!resolvedShopId) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          message: 'Shop not found',
        });
      }
      shopId = resolvedShopId;
      console.log('[deleteArchivedOrdersController] Resolved UUID:', shopId);
    }

    const result = await deleteArchivedOrders(shopId);

    res.status(HTTP_STATUS.OK).json({
      message: 'Archived orders deleted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveOrderByPhone = async (req, res, next) => {
  try {
    const { phone } = req.params;
    
    let shopId = req.user?.shopId || req.query.shopId;
    
    if (!shopId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Shop ID is required to fetch active orders',
      });
    }

    const resolvedShopId = await resolveShopId(shopId);
    if (!resolvedShopId) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Shop not found with this Shop ID',
      });
    }

    const orders = await getActiveOrderByCustomerPhone(resolvedShopId, phone);

    if (!orders || orders.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'No active order found',
        data: null,
      });
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Active orders found',
      data: addIdAlias(orders).map(toPublicOrder),
    });
  } catch (error) {
    next(error);
  }
};

export const updatePaymentStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus } = req.body;

    const shopId = await getCallerShopId(req);
    // Fetch order first to enforce pay_now lock
    const { getOrderById: getOrderForGuard } = await import('../services/supabase.service.js');
    const existing = await getOrderForGuard(orderId);
    if (!existing) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Order not found' });
    }
    if (existing.shop_id && shopId && existing.shop_id !== shopId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ message: 'Forbidden: order does not belong to your shop' });
    }
    if (existing.payment_method === 'pay_now' && existing.payment_status === 'paid') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Verified online payments (Pay Now) are locked and cannot be edited.',
      });
    }
    const order = await updatePaymentStatusDB(orderId, shopId, paymentStatus);

    res.status(HTTP_STATUS.OK).json({
      message: 'Payment status updated successfully',
      data: {
        orderId: order.id,
        paymentStatus: order.payment_status,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const recallCustomerController = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const updatedBy = req.user.name || 'system';

    const shopId = await getCallerShopId(req);
    const order = await recallCustomer(orderId, shopId, updatedBy);

    res.status(HTTP_STATUS.OK).json({
      message: 'Customer recalled successfully',
      data: {
        orderId: order.id,
        recallCount: order.recall_count,
        lastRecallAt: order.last_recall_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRecallStatsController = async (req, res, next) => {
  try {
    let shopId = req.user.shopId;
    console.log('[getRecallStatsController] Incoming shopId from user:', shopId);

    // Resolve Shop ID to UUID if needed
    if (shopId && isShopId(shopId)) {
      console.log('[getRecallStatsController] Shop ID detected, resolving to UUID');
      const resolvedShopId = await resolveShopId(shopId);
      if (!resolvedShopId) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          message: 'Shop not found',
        });
      }
      shopId = resolvedShopId;
      console.log('[getRecallStatsController] Resolved UUID:', shopId);
    }

    const stats = await getRecallStats(shopId);

    res.status(HTTP_STATUS.OK).json({
      message: 'Recall stats fetched successfully',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
