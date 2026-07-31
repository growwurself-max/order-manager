import express from 'express';
import {
  superAdminLogin,
  getStats,
  getShops,
  postShop,
  putShop,
  deleteShop,
  getShopStatsById,
  postResetShopCredentials,
  putSubscription,
  getSubscriptionOverviewData,
  getSettings,
  putSettings,
  getOwners,
  postOwner,
  putOwner,
  postOwnerPasswordReset,
  deleteOwner,
  getAnalyticsData,
  getNotificationsData,
} from '../controllers/superAdmin.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import {
  superAdminLoginValidator,
  createShopValidator,
  updateShopValidator,
  shopIdParamValidator,
  createOwnerValidator,
  updateOwnerValidator,
  ownerIdParamValidator,
  resetPasswordValidator,
  updateSettingsValidator,
  updateSubscriptionValidator,
  analyticsQueryValidator,
} from '../validators/superAdminValidator.js';

const router = express.Router();

// Public auth endpoint
router.post('/auth/login', superAdminLoginValidator, superAdminLogin);

// Protected routes (Super Admin only)
router.use(authenticate, authorize('super_admin'));

// Dashboard
router.get('/stats', getStats);

// Analytics
router.get('/analytics', analyticsQueryValidator, getAnalyticsData);

// Notifications
router.get('/notifications', getNotificationsData);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettingsValidator, putSettings);

// Shops
router.get('/shops', getShops);
router.post('/shops', createShopValidator, postShop);
router.get('/shops/:shopId', shopIdParamValidator, getShopStatsById);
router.put('/shops/:shopId', shopIdParamValidator, updateShopValidator, putShop);
router.delete('/shops/:shopId', shopIdParamValidator, deleteShop);
router.post('/shops/:shopId/reset-credentials', shopIdParamValidator, resetPasswordValidator, postResetShopCredentials);

// Subscriptions
router.get('/subscriptions/overview', getSubscriptionOverviewData);
router.put('/shops/:shopId/subscription', shopIdParamValidator, updateSubscriptionValidator, putSubscription);

// Owners
router.get('/owners', getOwners);
router.post('/owners', createOwnerValidator, postOwner);
router.put('/owners/:ownerId', ownerIdParamValidator, updateOwnerValidator, putOwner);
router.post('/owners/:ownerId/reset-password', ownerIdParamValidator, resetPasswordValidator, postOwnerPasswordReset);
router.delete('/owners/:ownerId', ownerIdParamValidator, deleteOwner);

export default router;