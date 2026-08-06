import express from 'express';
import { 
  getShopSettings, 
  updateShopSettings, 
  validateShopId, 
  getShopStatus, 
  updateShopOpenStatus, 
  updateWorkerAvailability 
} from '../controllers/shop.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { shopSettingsValidator } from '../middleware/validate.js';

const router = express.Router();

// Public route for customer Shop ID validation
router.get('/validate/:shopId', validateShopId);

// Public route for shop status (customers can check if shop is open/worker availability)
router.get('/status/:shopId', getShopStatus);

// Protected routes for owners
router.get('/settings', authenticate, authorize('owner'), getShopSettings);
router.put('/settings', authenticate, authorize('owner'), shopSettingsValidator, updateShopSettings);

// Shop status management (owner only)
router.put('/open-status', authenticate, authorize('owner'), updateShopOpenStatus);
router.put('/worker-availability', authenticate, authorize('owner'), updateWorkerAvailability);

export default router;