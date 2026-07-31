import { body } from 'express-validator';
import { validateRequest, isUUID } from '../middleware/validate.js';

export const createOrderValidator = [
  body('customer.phone')
    .notEmpty()
    .withMessage('Customer phone is required'),
  body('customer.name')
    .optional()
    .isString()
    .withMessage('Name must be a string'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.menuItemId')
    .isString()
    .custom(isUUID)
    .withMessage('Invalid menu item ID format'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.size').optional().isString(),
  body('items.*.toppings').optional().isArray(),
  body('notes').optional().isString(),
  validateRequest,
];

