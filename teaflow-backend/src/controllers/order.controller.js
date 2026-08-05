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
} from '../services/order.service.js';
import { updatePaymentStatus as updatePaymentStatusDB, getFirstActiveShop } from '../services/supabase.service.js';
import { resolveShopId } from '../utils/resolveShopId.js';
import { isShopId } from '../utils/generateShopId.js';

export const placeOrder = async (req, res, next) => {
  try {
    let shopId = req.user?.shopId;
    
    if (!shopId) {
      shopId = req.query.shopId;
    }

    if (!shopId) {
      const shop = await getFirstActiveShop();
      if (!shop) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          message: 'No active shop found',
        });
      }
      shopId = shop.id;
    }

    const resolvedShopId = await resolveShopId(shopId);
    if (!resolvedShopId) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Shop not found with this Shop ID',
      });
    }
    
    const orderData = req.body;

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

export const getOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await getOrderById(orderId);
    const mapped = addIdAlias(order);

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

    const order = await updateOrderStatus(orderId, status, updatedBy);

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
      const shop = await getFirstActiveShop();
      if (!shop) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          message: 'No active shop found',
        });
      }
      shopId = shop.id;
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
        order.status === 'completed' ? 'Paid' : 'Pending',
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
    
    let shopId = req.user?.shopId;
    if (!shopId) {
      shopId = req.query.shopId;
    }
    
    if (!shopId) {
      const shop = await getFirstActiveShop();
      if (!shop) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          message: 'No active shop found',
        });
      }
      shopId = shop.id;
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
      data: addIdAlias(orders),
    });
  } catch (error) {
    next(error);
  }
};

export const updatePaymentStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus } = req.body;
    
    const order = await updatePaymentStatusDB(orderId, paymentStatus);

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

    const order = await recallCustomer(orderId, updatedBy);

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
