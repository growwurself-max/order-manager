import { body, param, query } from 'express-validator';
import { validateRequest, isUUID } from '../middleware/validate.js';

// ===========================
// Auth
// ===========================
export const superAdminLoginValidator = [
  body('email').isEmail().withMessage('Valid email is required').trim(),
  body('password').notEmpty().withMessage('Password is required'),
  validateRequest,
];

// ===========================
// Shop
// ===========================
export const createShopValidator = [
  body('shopName').notEmpty().withMessage('Shop name is required').trim().escape(),
  body('ownerName').notEmpty().withMessage('Owner name is required').trim().escape(),
  body('ownerEmail').isEmail().withMessage('Valid owner email is required').normalizeEmail(),
  body('ownerPassword')
    .notEmpty().withMessage('Owner password is required')
    .isLength({ min: 6 })
    .withMessage('Owner password must be at least 6 characters'),
  body('phoneNumber').notEmpty().withMessage('Phone number is required').trim().escape(),
  body('streetAddress').optional().trim().escape(),
  body('trialDays').optional().isInt({ min: 0, max: 365 }).withMessage('Trial days must be between 0 and 365'),
  body('subscriptionPlan')
    .optional()
    .isIn(['free', 'trial', 'premium'])
    .withMessage('Invalid subscription plan'),
  validateRequest,
];

export const updateShopValidator = [
  body('shopName').optional().trim().escape(),
  body('address').optional().isObject(),
  body('contact').optional().isObject(),
  body('subscriptionPlan')
    .optional()
    .isIn(['free', 'trial', 'premium'])
    .withMessage('Invalid subscription plan'),
  body('subscriptionStatus')
    .optional()
    .isIn(['active', 'suspended', 'trial', 'expired'])
    .withMessage('Invalid subscription status'),
  body('trialDays').optional().isInt({ min: 0, max: 365 }),
  body('subscriptionExpiry').optional().isISO8601().withMessage('Invalid expiry date'),
  body('isActive').optional().isBoolean(),
  validateRequest,
];

export const shopIdParamValidator = [
  param('shopId').custom(isUUID).withMessage('Invalid shop ID format'),
  validateRequest,
];

// ===========================
// Owner
// ===========================
export const createOwnerValidator = [
  body('name').notEmpty().withMessage('Name is required').trim().escape(),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('phone').optional().trim().escape(),
  body('shopId').custom(isUUID).withMessage('Valid shop ID is required'),
  validateRequest,
];

export const updateOwnerValidator = [
  body('name').optional().trim().escape(),
  body('email').optional().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('phone').optional().trim().escape(),
  body('isActive').optional().isBoolean(),
  validateRequest,
];

export const ownerIdParamValidator = [
  param('ownerId').custom(isUUID).withMessage('Invalid owner ID format'),
  validateRequest,
];

export const resetPasswordValidator = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  validateRequest,
];

// ===========================
// Settings
// ===========================
export const updateSettingsValidator = [
  body('platformName').optional().trim().escape(),
  body('logo').optional().isString().trim(),
  body('supportEmail').optional().isEmail().withMessage('Valid support email required'),
  body('contactNumber').optional().trim().escape(),
  body('announcementBanner').optional().isString().trim(),
  body('maintenanceMode').optional().isBoolean(),
  body('defaultTrialDays').optional().isInt({ min: 0, max: 365 }),
  body('defaultSubscriptionPlan')
    .optional()
    .isIn(['free', 'trial', 'premium'])
    .withMessage('Invalid default subscription plan'),
  validateRequest,
];

// ===========================
// Subscription
// ===========================
export const updateSubscriptionValidator = [
  body('subscriptionPlan')
    .optional()
    .isIn(['free', 'trial', 'premium'])
    .withMessage('Invalid subscription plan'),
  body('subscriptionStatus')
    .optional()
    .isIn(['active', 'suspended', 'trial', 'expired'])
    .withMessage('Invalid subscription status'),
  body('trialDays').optional().isInt({ min: 0, max: 365 }),
  body('subscriptionExpiry').optional().isISO8601().withMessage('Invalid expiry date'),
  validateRequest,
];

// ===========================
// Analytics
// ===========================
export const analyticsQueryValidator = [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  validateRequest,
];