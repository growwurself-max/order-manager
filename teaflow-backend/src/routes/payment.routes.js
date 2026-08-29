import express from 'express';
import { body, validationResult } from 'express-validator';
import { HTTP_STATUS, PAYMENT_METHOD } from '../utils/constants.js';
import { optionalAuth } from '../middleware/auth.js';
import { resolveShopId } from '../utils/resolveShopId.js';
import { getShopSettingsById } from '../services/supabase.service.js';
import { createPaymentOrder, verifyPayment, verifyWebhookSignature, handleWebhookEvent } from '../services/payment.service.js';

const router = express.Router();

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path || e.param, message: e.msg })),
    });
  }
  next();
};

// POST /api/payment/order  — create Razorpay order + pending DB order (Pay Now)
const paymentOrderValidator = [
  body('customer').exists().withMessage('Customer is required'),
  body('customer.phone').notEmpty().withMessage('Customer phone is required').trim(),
  body('customer.name').optional().isString().trim().escape(),
  body('items').isArray({ min: 1, max: 50 }).withMessage('At least one item required'),
  body('items.*.menuItemId').isString().withMessage('Invalid menuItemId'),
  body('items.*.quantity').isInt({ min: 1, max: 99 }).withMessage('Quantity must be 1..99'),
  body('items.*.size').optional().isString().trim().escape(),
  body('items.*.toppings').optional().isArray(),
  body('shopId').optional().isString().trim(),
  validateRequest,
];

router.post('/order', optionalAuth, paymentOrderValidator, async (req, res, next) => {
  try {
    let shopId = req.body.shopId || req.query.shopId || req.user?.shopId;
    if (!shopId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Shop ID is required. Please specify a valid Shop ID (e.g., S1001).' });
    }
    const resolvedShopId = await resolveShopId(shopId);
    if (!resolvedShopId) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Shop not found with this Shop ID' });
    }
    const shopSettings = await getShopSettingsById(resolvedShopId);
    if (!shopSettings) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Shop settings not found' });
    }
    if (shopSettings.is_open_for_orders === false) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ message: 'This shop is currently closed and not accepting orders' });
    }
    const payNowEnabled = shopSettings.payment_pay_now_enabled !== false;
    if (!payNowEnabled) return res.status(HTTP_STATUS.FORBIDDEN).json({ message: 'Pay Now is disabled for this shop' });

    const { customer, items, notes } = req.body;
    const { dbOrder, razorpayOrder } = await createPaymentOrder(resolvedShopId, {
      customer,
      items,
      notes,
      paymentMethod: PAYMENT_METHOD.PAY_NOW,
    });

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Payment order created',
      data: {
        dbOrderId: dbOrder.id,
        orderNumber: dbOrder.order_number,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount, // paise
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID, // public key only
      },
    });
  } catch (error) {
    // Handle missing Razorpay creds gracefully
    if (error.message && error.message.includes('Razorpay credentials')) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Payment gateway not configured. Please contact support.' });
    }
    if (error.message && error.message.includes('already in progress')) {
      return res.status(HTTP_STATUS.CONFLICT).json({ message: error.message });
    }
    if (error.message && error.message.includes('not found or unavailable')) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message });
    }
    next(error);
  }
});

// POST /api/payment/verify — verify signature and mark paid (public, no auth, but shop-scoped via order)
router.post(
  '/verify',
  optionalAuth,
  [
    body('razorpay_order_id').notEmpty().withMessage('razorpay_order_id is required'),
    body('razorpay_payment_id').notEmpty().withMessage('razorpay_payment_id is required'),
    body('razorpay_signature').notEmpty().withMessage('razorpay_signature is required'),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const result = await verifyPayment({
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      });
      res.status(HTTP_STATUS.OK).json({
        message: result.alreadyVerified ? 'Payment already verified' : 'Payment verified successfully',
        data: {
          orderId: result.order.id,
          orderNumber: result.order.order_number,
          paymentStatus: result.order.payment_status,
          razorpayPaymentId: result.order.razorpay_payment_id,
          alreadyVerified: !!result.alreadyVerified,
        },
      });
    } catch (error) {
      // Do not mark paid on failure — service already marks failed on bad signature
      if (error.message && error.message.includes('Invalid payment signature')) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Invalid payment signature. Payment not verified.' });
      }
      if (error.message && error.message.includes('Amount mismatch')) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message });
      }
      if (error.message && error.message.includes('already marked as paid')) {
        return res.status(HTTP_STATUS.CONFLICT).json({ message: error.message });
      }
      if (error.message && error.message.includes('Order not found')) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: error.message });
      }
      next(error);
    }
  }
);

// POST /api/payment/webhook — Razorpay webhook (raw body signature verified, idempotent)
// Note: This route is mounted BEFORE express.json() parsing for raw access OR uses raw body captured below.
router.post('/webhook', async (req, res, next) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.warn('[webhook] RAZORPAY_WEBHOOK_SECRET not configured — rejecting webhook');
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Webhook secret not configured' });
    }
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Missing x-razorpay-signature header' });
    }
    // Raw body: webhook middleware provides req.rawBody (Captured) - fallback to JSON stringify if not available
    let rawBody = req.rawBody;
    if (!rawBody) {
      // Fallback: reconstruct from parsed body (may differ but handle)
      rawBody = JSON.stringify(req.body);
    }
    // verifyWebhookSignature expects string/buffer raw
    const rawForVerify = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
    const isValid = verifyWebhookSignature(rawForVerify, signature, secret);
    if (!isValid) {
      console.warn('[webhook] Invalid signature');
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Invalid webhook signature' });
    }
    let event = req.body;
    // If body is string (raw), parse it
    if (typeof event === 'string' || Buffer.isBuffer(event)) {
      try {
        event = JSON.parse(String(event));
      } catch {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Invalid JSON payload' });
      }
    }
    const result = await handleWebhookEvent(event);
    // Always return 200 to prevent Razorpay retries for correctly-handled duplicates
    res.status(HTTP_STATUS.OK).json({ message: 'Webhook processed', result: { event: event.event, ...result } });
  } catch (error) {
    console.error('[webhook] error:', error.message);
    next(error);
  }
});

// GET /api/payment/config — expose public key to frontend (optional helper)
router.get('/config', (req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Razorpay not configured' });
  }
  res.status(HTTP_STATUS.OK).json({ data: { keyId } });
});

export default router;
