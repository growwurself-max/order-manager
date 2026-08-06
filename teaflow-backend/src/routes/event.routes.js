import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Store active SSE connections by phone number
const sseClients = new Map();

// SSE endpoint for customers to receive real-time order updates
router.get('/order-status/:phone', (req, res) => {
  const phone = req.params.phone;
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', phone })}\n\n`);

  // Store client connection
  if (!sseClients.has(phone)) {
    sseClients.set(phone, new Set());
  }
  sseClients.get(phone).add(res);

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`:heartbeat\n\n`);
    } catch (e) {
      clearInterval(heartbeat);
    }
  }, 30000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    if (sseClients.has(phone)) {
      sseClients.get(phone).delete(res);
      if (sseClients.get(phone).size === 0) {
        sseClients.delete(phone);
      }
    }
  });
});

// Helper function to broadcast order status changes to a specific customer
export const broadcastOrderStatus = (phone, eventData) => {
  if (sseClients.has(phone)) {
    const clients = sseClients.get(phone);
    const message = `data: ${JSON.stringify(eventData)}\n\n`;
    for (const client of clients) {
      try {
        client.write(message);
      } catch (e) {
        clients.delete(client);
      }
    }
    if (clients.size === 0) {
      sseClients.delete(phone);
    }
  }
};

/**
 * Subscribe to Supabase Realtime for order changes
 * This will broadcast status changes to SSE clients
 */
export const setupOrderRealtimeSubscription = () => {
  const channel = supabase
    .channel('orders-realtime')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `status=eq.ready`,
      },
      async (payload) => {
        const order = payload.new;
        const customerPhone = order.customer?.phone;
        
        if (customerPhone) {
          broadcastOrderStatus(customerPhone, {
            type: 'order_ready',
            order: {
              id: order.id,
              orderNumber: order.order_number,
              status: order.status,
              customer: order.customer,
              items: order.items,
              totalAmount: order.total_amount,
              recallCount: order.recall_count,
              readyAt: order.ready_at,
            },
          });
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `status=eq.completed`,
      },
      async (payload) => {
        const order = payload.new;
        const customerPhone = order.customer?.phone;
        
        if (customerPhone) {
          broadcastOrderStatus(customerPhone, {
            type: 'order_completed',
            order: {
              id: order.id,
              orderNumber: order.order_number,
              status: order.status,
            },
          });
          // Clean up SSE connection after a delay
          setTimeout(() => {
            broadcastOrderStatus(customerPhone, {
              type: 'cleanup',
            });
          }, 5000);
        }
      }
    )
    .subscribe();

  console.log('Supabase Realtime subscription active for order changes');
  return channel;
};

/**
 * Broadcast shop status changes to all connected SSE clients
 */
export const broadcastShopStatus = (shopId, statusData) => {
  const message = `data: ${JSON.stringify({ type: 'shop_status', shopId, ...statusData })}\n\n`;
  
  // Broadcast to all connected clients
  for (const [phone, clients] of sseClients.entries()) {
    for (const client of clients) {
      try {
        client.write(message);
      } catch (e) {
        clients.delete(client);
      }
    }
    if (clients.size === 0) {
      sseClients.delete(phone);
    }
  }
};

/**
 * Subscribe to Supabase Realtime for shop status changes
 * This will broadcast shop open/closed and worker availability changes
 */
export const setupShopStatusRealtimeSubscription = () => {
  const channel = supabase
    .channel('shop-status-realtime')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'shop_settings',
      },
      async (payload) => {
        const shop = payload.new;
        const oldShop = payload.old;
        
        // Only broadcast if relevant fields changed
        if (oldShop.is_open_for_orders !== shop.is_open_for_orders || 
            oldShop.workers_available !== shop.workers_available) {
          broadcastShopStatus(shop.id, {
            isOpenForOrders: shop.is_open_for_orders,
            workersAvailable: shop.workers_available,
          });
        }
      }
    )
    .subscribe();

  console.log('Supabase Realtime subscription active for shop status changes');
  return channel;
};

export default router;
