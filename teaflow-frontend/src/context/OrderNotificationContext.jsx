import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';

const OrderNotificationContext = createContext(null);

const READY_ORDERS_KEY = 'teaflow_ready_orders';
const API_BASE = (api.defaults.baseURL || 'https://ordermanager-backend-30x2.onrender.com').replace(/\/$/, '');

function createAudioContext(audioContextRef) {
  if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContextRef.current;
}

function vibrateDevice() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([500, 300, 500, 300, 500]);
  }
}

function playLoudAlert(audioContextRef) {
  try {
    const ctx = createAudioContext(audioContextRef);
    if (!ctx) return;
    ctx.resume().catch(() => {});

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.5, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 4);
    masterGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 5);
    masterGain.connect(ctx.destination);

    const frequencies = [440, 554.37, 659.25, 880];
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i % 2 === 0 ? 'square' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      for (let t = 0; t < 5; t += 0.5) {
        gain.gain.setValueAtTime(0.4, ctx.currentTime + t);
        gain.gain.setValueAtTime(0.1, ctx.currentTime + t + 0.25);
      }
      gain.gain.setValueAtTime(0.3, ctx.currentTime + 4);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 5);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + 5);
    });

    const siren = ctx.createOscillator();
    const sirenGain = ctx.createGain();
    siren.type = 'sine';
    siren.frequency.setValueAtTime(800, ctx.currentTime);
    siren.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.5);
    siren.frequency.linearRampToValueAtTime(800, ctx.currentTime + 1);
    sirenGain.gain.setValueAtTime(0.2, ctx.currentTime);
    sirenGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 5);
    siren.connect(sirenGain);
    sirenGain.connect(masterGain);
    siren.start(ctx.currentTime);
    siren.stop(ctx.currentTime + 5);
  } catch (e) {
    console.warn('Audio playback failed:', e.message);
  }
}

export function OrderNotificationProvider({ children }) {
  const [readyOrders, setReadyOrders] = useState({});
  const [showPopup, setShowPopup] = useState(false);
  const [popupOrder, setPopupOrder] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const eventSourceRef = useRef(null);
  const audioContextRef = useRef(null);
  const notifiedOrderIds = useRef(new Set());
  const customerPhoneRef = useRef(null);

  useEffect(() => {
    const unlockAudio = () => {
      const ctx = createAudioContext(audioContextRef);
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    };

    const handleRecallEvent = (event) => {
      const payload = event.detail || {};
      if (!payload.orderId && !payload.orderNumber) return;
      showNotification({ type: payload.type || 'order_recall', order: payload.order || { id: payload.orderId, orderNumber: payload.orderNumber }, orderId: payload.orderId, orderNumber: payload.orderNumber });
    };

    const handleStorageEvent = (event) => {
      if (event.key !== 'teaflow_recall_alert') return;
      try {
        const payload = JSON.parse(event.newValue || '{}');
        handleRecallEvent({ detail: payload });
      } catch (e) {}
    };

    const events = ['pointerdown', 'touchstart', 'keydown'];
    events.forEach((eventName) => window.addEventListener(eventName, unlockAudio, { once: true }));
    window.addEventListener('order-recall', handleRecallEvent);
    window.addEventListener('storage', handleStorageEvent);
    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, unlockAudio));
      window.removeEventListener('order-recall', handleRecallEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [showNotification]);

  // Restore ready orders from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(READY_ORDERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setReadyOrders(parsed);
      }
    } catch (e) {}
  }, []);

  // Persist ready orders
  useEffect(() => {
    localStorage.setItem(READY_ORDERS_KEY, JSON.stringify(readyOrders));
  }, [readyOrders]);

  const showNotification = useCallback((payload) => {
    const type = payload.type || 'order_recall';
    const order = payload.order || {};
    const orderId = order.id || payload.orderId || order._id || order.orderId;
    const orderNumber = order.orderNumber || payload.orderNumber || order.order_number;
    const notificationKey = `${type}:${orderId || orderNumber || 'generic'}`;

    if (!orderId && !orderNumber) return;
    if (notifiedOrderIds.current.has(notificationKey)) return;

    notifiedOrderIds.current.add(notificationKey);

    if (orderId) {
      setReadyOrders(function(prev) {
        const next = {};
        for (const k in prev) next[k] = prev[k];
        next[orderId] = { ...order, id: orderId, orderNumber };
        return next;
      });
    }

    setShowPopup(true);
    setPopupOrder({ ...order, id: orderId, orderNumber });

    if (!isMuted) {
      playLoudAlert(audioContextRef);
    }
    vibrateDevice();
  }, [isMuted]);

  const connectToOrderEvents = useCallback((phone) => {
    if (!phone) return;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    customerPhoneRef.current = phone;

    try {
      const saved = localStorage.getItem(READY_ORDERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.values(parsed).forEach((order) => {
          if (order && order.customer && order.customer.phone === phone) {
            showNotification({ type: 'order_ready', order });
          }
        });
      }
    } catch (e) {}

    try {
      const es = new EventSource(API_BASE + '/events/order-status/' + encodeURIComponent(phone));
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'order_ready') {
            showNotification({ type: 'order_ready', order: data.order });
          } else if (data.type === 'order_completed') {
            const orderId = data.order?.id;
            setReadyOrders(function(prev) {
              const next = {};
              for (const k in prev) {
                if (k !== orderId) next[k] = prev[k];
              }
              return next;
            });
            if (popupOrder && popupOrder.id === orderId) {
              setShowPopup(false);
              setPopupOrder(null);
            }
            notifiedOrderIds.current.delete(`order_ready:${orderId}`);
            notifiedOrderIds.current.delete(`order_recall:${orderId}`);
          }
        } catch (e) {}
      };

      es.onerror = function() {
        setTimeout(function() {
          if (customerPhoneRef.current) connectToOrderEvents(customerPhoneRef.current);
        }, 3000);
      };
    } catch (e) {
      console.warn('SSE connection failed:', e.message);
    }
  }, [popupOrder, showNotification]);

  const disconnectFromOrderEvents = useCallback(function() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    customerPhoneRef.current = null;
  }, []);

  const dismissPopup = useCallback(function() {
    setShowPopup(false);
    setPopupOrder(null);
  }, []);

  const toggleMute = useCallback(function() {
    setIsMuted(function(prev) { return !prev; });
  }, []);

  const clearReadyOrder = useCallback(function(orderId) {
    setReadyOrders(function(prev) {
      const next = {};
      for (const k in prev) {
        if (k !== orderId) next[k] = prev[k];
      }
      return next;
    });
    notifiedOrderIds.current.delete(orderId);
  }, []);

  useEffect(function() {
    return function() {
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(function() {});
      }
    };
  }, []);

  const ctxValue = {
    readyOrders: readyOrders,
    showPopup: showPopup,
    popupOrder: popupOrder,
    isMuted: isMuted,
    connectToOrderEvents: connectToOrderEvents,
    disconnectFromOrderEvents: disconnectFromOrderEvents,
    dismissPopup: dismissPopup,
    toggleMute: toggleMute,
    clearReadyOrder: clearReadyOrder,
  };

  return React.createElement(
    OrderNotificationContext.Provider,
    { value: ctxValue },
    children,
    showPopup && popupOrder ? React.createElement('div', {
      key: 'popup',
      style: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }
    }, React.createElement('div', {
      style: { backgroundColor: 'white', borderRadius: '1.5rem', padding: '2rem', maxWidth: '28rem', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '4px solid #fb923c' }
    }, React.createElement('div', { style: { textAlign: 'center' } },
      React.createElement('div', { style: { fontSize: '4rem', marginBottom: '1rem' } }, '\uD83C\uDF89'),
      React.createElement('h2', { style: { fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' } }, 'Your Order is Ready!'),
      React.createElement('p', { style: { fontSize: '1.125rem', color: '#4b5563', marginBottom: '0.25rem' } }, 'Order ', React.createElement('span', { style: { fontWeight: 'bold', color: '#ea580c' } }, '#' + (popupOrder.orderNumber || 'N/A'))),
      React.createElement('p', { style: { color: '#6b7280', marginBottom: '1.5rem' } }, 'Please collect your order at the counter.'),
      React.createElement('div', { style: { backgroundColor: '#fff7ed', borderRadius: '1rem', padding: '1rem', marginBottom: '1.5rem', border: '2px solid #fed7aa' } },
        React.createElement('p', { style: { color: '#9a3412', fontWeight: 600, fontSize: '0.875rem' } }, 'Please collect within 10 minutes')
      ),
      React.createElement('button', {
        onClick: dismissPopup,
        style: { minHeight: '48px', width: '100%', background: 'linear-gradient(to right, #f59e0b, #f97316)', color: 'white', padding: '1rem', borderRadius: '1rem', fontSize: '1.125rem', fontWeight: 600, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: 'none', cursor: 'pointer' }
      }, 'Dismiss'),
      React.createElement('button', {
        onClick: toggleMute,
        style: { marginTop: '0.75rem', color: '#6b7280', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', display: 'block', width: '100%', textAlign: 'center' }
      }, isMuted ? 'Unmute notifications' : 'Mute notifications')
    ))) : null
  );
}

export function useOrderNotification() {
  const ctx = useContext(OrderNotificationContext);
  if (!ctx) {
    throw new Error('useOrderNotification must be used within OrderNotificationProvider');
  }
  return ctx;
}

export default OrderNotificationContext;
