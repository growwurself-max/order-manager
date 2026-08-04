import { body, param, validationResult } from 'express-validator';
import { HTTP_STATUS } from '../utils/constants.js';

// UUID v4 regex pattern
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUUID = (value) => UUID_V4_REGEX.test(value);

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.param || err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

export const ownerLoginValidator = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validateRequest,
];

export const workerPinValidator = [
  body('password').optional().trim(),
  body('pin').optional().notEmpty().withMessage('PIN is required').trim(),
  body().custom((value) => {
    if (!value.password && !value.pin) {
      throw new Error('Password or PIN is required');
    }
    return true;
  }),
  validateRequest,
];

export const createOrderValidator = [
  body('customer.phone')
    .notEmpty()
    .withMessage('Customer phone is required')
    .matches(/^[\d\s-]{10,15}$/)
    .withMessage('Valid phone number is required'),
  body('customer.name')
    .optional()
    .isString()
    .withMessage('Name must be a string')
    .trim()
    .escape(),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.menuItemId')
    .isString()
    .custom(isUUID)
    .withMessage('Invalid menu item ID format'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('items.*.size').optional().isString().trim().escape(),
  body('items.*.toppings').optional().isArray(),
  body('notes').optional().isString().trim().escape(),
  validateRequest,
];

export const menuItemValidator = [
  body('name').notEmpty().withMessage('Name is required').trim().escape(),
  body('description').optional().isString().trim().escape(),
  body('category')
    .isIn(['milk-tea', 'fruit-tea', 'slush', 'specialty'])
    .withMessage('Invalid category'),
  body('basePrice').optional().isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('sizes').optional().isArray(),
  body('toppings').optional().isArray(),
  body('isAvailable').optional().isBoolean(),
  body('displayOrder').optional().isInt().toFloat(),
  body('imageUrl').optional().isURL().withMessage('Invalid image URL'),
  body('imageData')
    .optional()
    .isString()
    .withMessage('Image data must be a string')
    .custom((value) => {
      if (!value) return true;
      // Base64 image payloads for ~5MB files are roughly 7MB
      const maxBase64Length = 7 * 1024 * 1024;
      if (value.length > maxBase64Length) {
        throw new Error('Image data exceeds maximum size (5MB)');
      }
      return true;
    }),
  body('removeImage').optional().isBoolean().withMessage('removeImage must be a boolean'),
  validateRequest,
];

export const createWorkerValidator = [
  body('username').notEmpty().withMessage('Username is required').trim().escape(),
  body('name').notEmpty().withMessage('Name is required').trim().escape(),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters').trim(),
  body('pin').optional().notEmpty().withMessage('PIN is required').trim(),
  body().custom((value) => {
    if (!value.password && !value.pin) {
      throw new Error('Password or PIN is required');
    }
    return true;
  }),
  body('role')
    .optional()
    .isIn(['worker'])
    .withMessage('Invalid role'),
  validateRequest,
];

export const workerValidator = [
  body('username').optional().trim().escape(),
  body('name').notEmpty().withMessage('Name is required').trim().escape(),
  body('password').optional({ values: 'falsy' }).isLength({ min: 8 }).withMessage('Password must be at least 8 characters').trim(),
  body('pin').optional({ values: 'falsy' }).notEmpty().withMessage('PIN is required').trim(),
  body('role')
    .optional()
    .isIn(['worker'])
    .withMessage('Invalid role'),
  validateRequest,
];

export const shopSettingsValidator = [
  body('shopName').notEmpty().withMessage('Shop name is required').trim().escape(),
  body('address.street').optional().isString().trim().escape(),
  body('address.city').optional().isString().trim().escape(),
  body('address.state').optional().isString().trim().escape(),
  body('address.zipCode').optional().isString().trim().escape(),
  body('address.country').optional().isString().trim().escape(),
  body('contact.phone').optional().isString().trim(),
  body('contact.email').optional().isEmail().withMessage('Invalid email'),
  body('contact.website').optional().isURL().withMessage('Invalid URL'),
  body('settings.orderPrefix').optional().isString().trim().escape(),
  body('settings.allowPreorder').optional().isBoolean(),
  body('settings.taxRate').optional().isFloat({ min: 0, max: 1 }),
  body('settings.currency').optional().isString().trim().escape(),
  body('branding.logo').optional().isURL().withMessage('Invalid logo URL'),
  body('branding.primaryColor')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Invalid color format (e.g., #4CAF50)'),
  body('branding.theme')
    .optional()
    .isIn(['light', 'dark'])
    .withMessage('Theme must be light or dark'),
  body('isActive').optional().isBoolean(),
  validateRequest,
];

export const orderIdParamValidator = [
  param('orderId')
    .isString()
    .custom(isUUID)
    .withMessage('Invalid order ID format'),
  validateRequest,
];

export const menuItemIdParamValidator = [
  param('id')
    .isString()
    .custom(isUUID)
    .withMessage('Invalid menu item ID format'),
  validateRequest,
];

export const workerIdParamValidator = [
  param('id')
    .isString()
    .custom(isUUID)
    .withMessage('Invalid worker ID format'),
  validateRequest,
];
