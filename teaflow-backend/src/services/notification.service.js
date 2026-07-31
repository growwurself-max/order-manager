/**
 * Notification Service — Base Interface
 *
 * Designed for extensibility:
 * - Currently logs recall actions to console.
 * - In the future, integrate real channels by adding methods:
 *     sendSMS(order), sendWhatsApp(order), sendPushNotification(order),
 *     sendBrowserNotification(order)
 *
 * Usage: import { notifyCustomerRecall } from './services/notification.service.js';
 */

/**
 * Notify the customer that their order is ready for pickup (recall).
 * @param {Object} order — The full order object (must include order_number, customer.phone, customer.name)
 */
export const notifyCustomerRecall = async (order) => {
  const phone = order.customer?.phone || 'unknown';
  const name = order.customer?.name || 'Customer';
  const orderNumber = order.order_number || 'N/A';

  // Base log — always works
  console.log(`[Notification] Recall triggered for Order #${orderNumber}`);
  console.log(`[Notification] Customer: ${name} (${phone})`);
  console.log(`[Notification] Recall count: ${order.recall_count || 0}`);

  // ────────────────────────────────────────────
  // Future Integration Points (add later):
  // ────────────────────────────────────────────
  //
  // Browser Notification:
  //   - Requires WebSocket/SSE or push subscription.
  //   sendBrowserNotification(order)
  //
  // SMS (Twilio, etc.):
  //   await smsProvider.send({
  //     to: phone,
  //     body: `Dear ${name}, your order #${orderNumber} is ready for pickup. Please collect it from the counter.`,
  //   });
  //
  // WhatsApp (Twilio/WhatsApp Business API):
  //   await whatsappProvider.send({
  //     to: phone,
  //     template: 'order_ready',
  //     params: { name, orderNumber },
  //   });
  //
  // Push Notification (Firebase, OneSignal):
  //   await pushProvider.send({
  //     token: customerPushToken,
  //     title: 'Order Ready',
  //     body: `Your order #${orderNumber} is waiting at the counter.`,
  //   });
};

/**
 * Placeholder for sending SMS (to be implemented).
 * @param {Object} order
 */
export const sendSMS = async (order) => {
  console.log(`[Notification:SMS] Placeholder — would send SMS for Order #${order.order_number}`);
};

/**
 * Placeholder for sending WhatsApp (to be implemented).
 * @param {Object} order
 */
export const sendWhatsApp = async (order) => {
  console.log(`[Notification:WhatsApp] Placeholder — would send WhatsApp for Order #${order.order_number}`);
};

/**
 * Placeholder for sending Push Notification (to be implemented).
 * @param {Object} order
 */
export const sendPushNotification = async (order) => {
  console.log(`[Notification:Push] Placeholder — would send Push for Order #${order.order_number}`);
};

/**
 * Placeholder for sending Browser Notification (to be implemented).
 * @param {Object} order
 */
export const sendBrowserNotification = async (order) => {
  console.log(`[Notification:Browser] Placeholder — would send Browser notification for Order #${order.order_number}`);
};

export default {
  notifyCustomerRecall,
  sendSMS,
  sendWhatsApp,
  sendPushNotification,
  sendBrowserNotification,
};

