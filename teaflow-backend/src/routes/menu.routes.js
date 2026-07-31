import express from 'express';
import {
  createMenu,
  getMenu,
  getMenuItem,
  updateMenu,
  deleteMenu,
} from '../controllers/menu.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { menuItemValidator, menuItemIdParamValidator } from '../middleware/validate.js';

const router = express.Router();

// Public endpoints - get menu without auth (customer facing)
router.get('/', optionalAuth, getMenu);
router.get('/:id', optionalAuth, menuItemIdParamValidator, getMenuItem);

// Owner authenticated endpoints
router.post(
  '/',
  authenticate,
  authorize('owner'),
  menuItemValidator,
  createMenu
);
router.put(
  '/:id',
  authenticate,
  authorize('owner'),
  menuItemIdParamValidator,
  menuItemValidator,
  updateMenu
);
router.delete(
  '/:id',
  authenticate,
  authorize('owner'),
  menuItemIdParamValidator,
  deleteMenu
);

export default router;