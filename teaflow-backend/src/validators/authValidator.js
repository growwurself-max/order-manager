import { body } from 'express-validator';
import { validateRequest } from '../middleware/validate.js';

export const ownerLoginValidator = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validateRequest,
];

export const workerPinValidator = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .trim()
    .escape(),
  body('password')
    .optional()
    .trim(),
  body('pin')
    .optional()
    .notEmpty()
    .withMessage('PIN is required')
    .trim(),
  body().custom((value) => {
    if (!value.password && !value.pin) {
      throw new Error('PIN is required');
    }
    return true;
  }),
  validateRequest,
];
