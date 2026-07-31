import express from 'express';
import {
  placeOrder,
  getOrderStatus,
  getShopActiveOrders,
  updateStatus,
  getShopOrders,
  getDashboardStats,
  exportOrders,
  archiveOrders,
  deleteArchivedOrdersController,
  getActiveOrderByPhone,
  updatePaymentStatus,
  recallCustomerController,
  getRecallStatsController,
} from '../controllers/order.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { createOrderValidator, orderIdParamValidator } from '../middleware/validate.js';

const router = express.Router();

// Customer endpoints
router.post('/', optionalAuth, createOrderValidator, placeOrder);

// Owner endpoints (must be before parameterized routes)
router.get('/dashboard/stats', authenticate, authorize('owner'), getDashboardStats);
router.get('/export/csv', authenticate, authorize('owner'), exportOrders);
router.post('/archive', authenticate, authorize('owner'), archiveOrders);
router.post('/delete-archived', authenticate, authorize('owner'), deleteArchivedOrdersController);
router.get('/', authenticate, authorize('owner'), getShopOrders);

// Recall stats (owner only)
router.get('/recall-stats', authenticate, authorize('owner'), getRecallStatsController);

// Worker and Owner endpoints
router.get('/active', authenticate, authorize('worker', 'owner'), getShopActiveOrders);
router.patch('/:orderId/status', authenticate, authorize('worker', 'owner'), orderIdParamValidator, updateStatus);
router.patch('/:orderId/payment', authenticate, authorize('worker', 'owner'), orderIdParamValidator, updatePaymentStatus);

// Recall endpoint (worker and owner)
router.post('/:orderId/recall', authenticate, authorize('worker', 'owner'), orderIdParamValidator, recallCustomerController);

// Customer check for active order by phone (must be before generic status check)
router.get('/active-order/:phone', optionalAuth, getActiveOrderByPhone);

// Customer status check endpoint (must be after specific routes)
router.get('/:orderId/status', optionalAuth, orderIdParamValidator, getOrderStatus);

export default router;
