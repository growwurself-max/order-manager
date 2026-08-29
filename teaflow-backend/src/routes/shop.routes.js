import express from 'express';
import { 
  getShopSettings, 
  updateShopSettings, 
  validateShopId, 
  getShopStatus, 
  updateShopOpenStatus, 
  updateWorkerAvailability,
  getPaymentSettings,
  updatePaymentSettings,
  uploadPaymentQr,
  removePaymentQr,
  getPaymentOptions
} from '../controllers/shop.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { shopSettingsValidator } from '../middleware/validate.js';

const router = express.Router();

// Public routes (customer)
router.get('/validate/:shopId', validateShopId);
router.get('/status/:shopId', getShopStatus);
router.get('/payment-options/:shopId', getPaymentOptions);
router.get('/payment-options', getPaymentOptions);

// Owner Payment Settings (tenant isolated)
router.get('/payment-settings', authenticate, authorize('owner'), getPaymentSettings);
router.put('/payment-settings', authenticate, authorize('owner'), updatePaymentSettings);
router.post('/payment-qr', authenticate, authorize('owner'), uploadPaymentQr);
router.delete('/payment-qr', authenticate, authorize('owner'), removePaymentQr);

// Protected routes for owners
router.get('/settings', authenticate, authorize('owner'), getShopSettings);
router.put('/settings', authenticate, authorize('owner'), shopSettingsValidator, updateShopSettings);

// Shop status management (owner only)
router.put('/open-status', authenticate, authorize('owner'), updateShopOpenStatus);
router.put('/worker-availability', authenticate, authorize('owner'), updateWorkerAvailability);

export default router;