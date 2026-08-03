import express from 'express';
import { getShopSettings, updateShopSettings, validateShopId } from '../controllers/shop.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { shopSettingsValidator } from '../middleware/validate.js';

const router = express.Router();

// Public route for customer Shop ID validation
router.get('/validate/:shopId', validateShopId);

// Protected routes for owners
router.get('/settings', authenticate, authorize('owner'), getShopSettings);
router.put('/settings', authenticate, authorize('owner'), shopSettingsValidator, updateShopSettings);

export default router;