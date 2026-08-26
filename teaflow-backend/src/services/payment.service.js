import crypto from 'crypto';
import Razorpay from 'razorpay';
import { supabase } from '../config/supabase.js';
import { generateOrderNumber } from '../utils/generateOrderId.js';
import { PAYMENT_STATUS, PAYMENT_METHOD } from '../utils/constants.js';

// Lazy singleton for Razorpay instance
let razorpayInstance = null;

const getRazorpayInstance = () => {
  if (razorpayInstance) return razorpayInstance;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }
  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
  return razorpayInstance;
};

// Calculate total SERVER-SIDE from DB menu items scoped to shopId
// Reuses supabase getMenuById logic internally to prevent cross-tenant price tampering
import { getMenuById } from './supabase.service.js';

export const calculateOrderTotal = async (shopId, items) => {
  let totalAmount = 0;
  const processedItems = [];
  for (const item of items) {
    const menuItem = await getMenuById(item.menuItemId, shopId);
    if (!menuItem || !menuItem.is_available) {
      throw new Error(`Menu item ${item.menuItemId} not found or unavailable`);
    }
    const sizeName = item.size || 'Regular';
    const sizes = menuItem.sizes || [];
    const sizeObj = sizes.find((s) => s.name === sizeName);
    const sizePriceMod = sizeObj ? sizeObj.priceModifier : 0;
    const itemPrice = Number(menuItem.base_price);
    let itemTotal = (itemPrice + sizePriceMod) * item.quantity;
    if (item.toppings && menuItem.toppings) {
      for (const toppingName of item.toppings) {
        const topping = menuItem.toppings.find((t) => t.name === toppingName);
        if (topping) itemTotal += topping.price * item.quantity;
      }
    }
    totalAmount += itemTotal;
    processedItems.push({
      menu_item_id: menuItem.id,
      name: menuItem.name,
      category: menuItem.category,
      size: sizeName,
      toppings: item.toppings || [],
      quantity: item.quantity,
      unit_price: itemPrice + sizePriceMod,
      total_price: itemTotal,
    });
  }
  return { totalAmount, processedItems };
};

// Create order with pending payment + Razorpay order
export const createPaymentOrder = async (shopId, orderData) => {
  const { customer, items, notes, paymentMethod } = orderData;

  if (!customer || !customer.phone) throw new Error('Customer phone is required');
  if (!items || items.length === 0) throw new Error('At least one item required');

  // Prevent duplicate pending Razorpay order for same customer in-flight
  // Check for recent pending orders with same shopId+phone within last 2 minutes
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: recentPending } = await supabase
    .from('orders')
    .select('id, razorpay_order_id, created_at')
    .eq('shop_id', shopId)
    .eq('payment_status', PAYMENT_STATUS.PENDING)
    .eq('customer->>phone', customer.phone.trim())
    .gte('created_at', twoMinutesAgo)
    .limit(1);
  if (recentPending && recentPending.length > 0 && recentPending[0].razorpay_order_id) {
    throw new Error('A payment is already in progress for this phone. Please wait a moment and retry.');
  }

  const { totalAmount, processedItems } = await calculateOrderTotal(shopId, items);
  if (totalAmount <= 0) throw new Error('Invalid order amount');

  const amountPaise = Math.round(totalAmount * 100);
  const orderNumber = await generateOrderNumber(shopId);

  // Create DB order first with pending state and pay_now
  const dbOrder = {
    shop_id: shopId,
    order_number: orderNumber,
    customer: customer || {},
    items: processedItems,
    total_amount: totalAmount,
    notes: notes || '',
    status: 'placed',
    placed_at: new Date().toISOString(),
    status_history: [{ status: 'placed', timestamp: new Date().toISOString(), updated_by: 'customer' }],
    payment_status: PAYMENT_STATUS.PENDING,
    payment_method: PAYMENT_METHOD.PAY_NOW,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('orders')
    .insert([dbOrder])
    .select()
    .single();
  if (insertError) throw insertError;

  // Create Razorpay order
  let razorpayOrder;
  try {
    const razorpay = getRazorpayInstance();
    const options = {
      amount: amountPaise,
      currency: 'INR',
      receipt: orderNumber,
      notes: {
        shop_id: shopId,
        order_db_id: inserted.id,
        order_number: orderNumber,
        phone: customer.phone,
      },
    };
    razorpayOrder = await razorpay.orders.create(options);
  } catch (rzpErr) {
    // Mark order as failed if Razorpay creation fails
    await supabase
      .from('orders')
      .update({ payment_status: PAYMENT_STATUS.FAILED })
      .eq('id', inserted.id);
    throw new Error(`Razorpay order creation failed: ${rzpErr.message || rzpErr.error?.description || 'Unknown'}`);
  }

  // Save razorpay_order_id against DB order (idempotent)
  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update({ razorpay_order_id: razorpayOrder.id })
    .eq('id', inserted.id)
    .select()
    .single();
  if (updateError) {
    console.error('[payment.service] Failed to save razorpay_order_id:', updateError.message);
  }

  return {
    dbOrder: updated || inserted,
    razorpayOrder,
    amountPaise,
  };
};

// Verify signature and mark paid (idempotent)
export const verifyPayment = async ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new Error('Missing Razorpay payment details');
  }
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) throw new Error('RAZORPAY_KEY_SECRET not configured');

  // Lookup DB order by razorpay_order_id
  const { data: order, error: findError } = await supabase
    .from('orders')
    .select('*')
    .eq('razorpay_order_id', razorpayOrderId)
    .maybeSingle();
  if (findError) throw new Error(`DB lookup failed: ${findError.message}`);
  if (!order) throw new Error('Order not found for this Razorpay order ID');

  // Idempotent: already paid -> return early (no duplicate state change)
  if (order.payment_status === PAYMENT_STATUS.PAID) {
    // If already paid with same payment id, treat as success
    if (order.razorpay_payment_id === razorpayPaymentId) {
      return { order, alreadyVerified: true };
    }
    throw new Error('Order is already marked as paid with a different payment. Duplicate not allowed.');
  }
  if (order.payment_status === PAYMENT_STATUS.FAILED) {
    throw new Error('Order payment was previously marked failed. Please create a new payment order.');
  }

  // Verify HMAC signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret)
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  if (expectedSignature !== razorpaySignature) {
    // Mark failed for audit trail (do not mark paid)
    await supabase
      .from('orders')
      .update({ payment_status: PAYMENT_STATUS.FAILED, razorpay_payment_id: razorpayPaymentId, razorpay_signature: razorpaySignature })
      .eq('id', order.id);
    throw new Error('Invalid payment signature');
  }

  // Optional: fetch payment from Razorpay to confirm captured status (defense in depth)
  // If network fails, still trust signature but log warning
  try {
    const razorpay = getRazorpayInstance();
    const payment = await razorpay.payments.fetch(razorpayPaymentId);
    if (payment.order_id && payment.order_id !== razorpayOrderId) {
      throw new Error('Payment order ID mismatch');
    }
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      console.warn('[payment.service] Razorpay payment status not captured:', payment.status);
      // Still mark paid if signature valid and not failed; webhook will handle final captured event
    }
    // Verify amount matches (paise)
    const expectedPaise = Math.round(Number(order.total_amount) * 100);
    if (payment.amount !== expectedPaise) {
      throw new Error(`Amount mismatch: expected ${expectedPaise} got ${payment.amount}`);
    }
  } catch (fetchErr) {
    // If error is about amount mismatch, rethrow; else log and continue with signature-only trust
    if (fetchErr.message && fetchErr.message.includes('Amount mismatch')) throw fetchErr;
    if (fetchErr.message && fetchErr.message.includes('Payment order ID mismatch')) throw fetchErr;
    console.warn('[payment.service] Razorpay payment fetch warning:', fetchErr.message);
  }

  // Mark paid atomically
  const { data: paidOrder, error: paidError } = await supabase
    .from('orders')
    .update({
      payment_status: PAYMENT_STATUS.PAID,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      payment_verified_at: new Date().toISOString(),
    })
    .eq('id', order.id)
    .select()
    .single();
  if (paidError) throw new Error(`Failed to mark paid: ${paidError.message}`);

  return { order: paidOrder, alreadyVerified: false };
};

// Verify webhook signature (raw body)
export const verifyWebhookSignature = (rawBody, signature, secret) => {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return expected === signature;
};

// Process webhook events idempotently
export const handleWebhookEvent = async (event) => {
  const eventType = event.event || event.type;
  const payload = event.payload || {};

  // Razorpay sends payload.payment.entity and payload.order.entity
  let razorpayOrderId = null;
  let razorpayPaymentId = null;
  let paymentEntity = null;

  if (payload.payment && payload.payment.entity) {
    paymentEntity = payload.payment.entity;
    razorpayPaymentId = paymentEntity.id;
    razorpayOrderId = paymentEntity.order_id;
  }
  if (payload.order && payload.order.entity) {
    // order.paid event
    razorpayOrderId = payload.order.entity.id || razorpayOrderId;
  }

  if (!razorpayOrderId && paymentEntity && paymentEntity.order_id) {
    razorpayOrderId = paymentEntity.order_id;
  }

  if (!razorpayOrderId && razorpayPaymentId) {
    // Try fetch payment to get order_id
    try {
      const razorpay = getRazorpayInstance();
      const payment = await razorpay.payments.fetch(razorpayPaymentId);
      razorpayOrderId = payment.order_id;
    } catch (e) {
      console.warn('[payment.service] webhook payment fetch failed:', e.message);
    }
  }

  if (!razorpayOrderId) {
    console.warn('[payment.service] webhook missing razorpayOrderId for event:', eventType);
    return { ignored: true, reason: 'missing razorpayOrderId' };
  }

  const { data: order, error: findError } = await supabase
    .from('orders')
    .select('*')
    .eq('razorpay_order_id', razorpayOrderId)
    .maybeSingle();
  if (findError) throw new Error(`Webhook DB lookup failed: ${findError.message}`);
  if (!order) {
    console.warn('[payment.service] webhook order not found:', razorpayOrderId);
    return { ignored: true, reason: 'order not found' };
  }

  // Idempotent: if already paid, ignore duplicate captured/paid events
  if (order.payment_status === PAYMENT_STATUS.PAID) {
    return { ignored: false, alreadyPaid: true, order };
  }

  if (eventType === 'payment.captured' || eventType === 'order.paid') {
    // Verify amount if available
    if (paymentEntity && paymentEntity.amount) {
      const expectedPaise = Math.round(Number(order.total_amount) * 100);
      if (paymentEntity.amount !== expectedPaise) {
        console.error('[payment.service] webhook amount mismatch:', paymentEntity.amount, expectedPaise);
        // Do NOT mark paid on amount mismatch
        return { ignored: true, reason: 'amount mismatch' };
      }
    }
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: PAYMENT_STATUS.PAID,
        razorpay_payment_id: razorpayPaymentId || order.razorpay_payment_id,
        payment_verified_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .select()
      .single();
    if (updateError) throw updateError;
    return { order: updated, markedPaid: true };
  }

  if (eventType === 'payment.failed') {
    // Mark failed only if still pending (don't overwrite paid)
    if (order.payment_status === PAYMENT_STATUS.PENDING) {
      const { data: updated, error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: PAYMENT_STATUS.FAILED,
          razorpay_payment_id: razorpayPaymentId || order.razorpay_payment_id,
        })
        .eq('id', order.id)
        .select()
        .single();
      if (updateError) throw updateError;
      return { order: updated, markedFailed: true };
    }
    return { ignored: true, reason: 'not pending' };
  }

  return { ignored: true, reason: `unhandled event ${eventType}` };
};
