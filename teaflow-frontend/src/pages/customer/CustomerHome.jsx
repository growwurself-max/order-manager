import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { useOrderNotification } from '../../context/OrderNotificationContext';

const STORAGE_KEYS = {
  CUSTOMER_INFO: 'teaflow_customer',
  ACTIVE_ORDERS: 'teaflow_active_orders',
};

export default function CustomerHome() {
  const [step, setStep] = useState('welcome');
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', tableNumber: 'Takeaway' });
  const [shopId, setShopId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const shopFromUrl = params.get('shop');
    console.log('Shop ID from URL:', shopFromUrl);
    if (shopFromUrl) {
      localStorage.setItem('shopId', shopFromUrl);
      return shopFromUrl;
    }
    const storedShopId = localStorage.getItem('shopId');
    console.log('Shop ID from localStorage:', storedShopId);
    return storedShopId || '';
  });
  const [manualShopId, setManualShopId] = useState('');
  const [shopValidating, setShopValidating] = useState(false);
  const [shopName, setShopName] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [orderResult, setOrderResult] = useState(null);
  const [trackingOrders, setTrackingOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [error, setError] = useState('');
  const [initializing, setInitializing] = useState(true);
  const [recallBanner, setRecallBanner] = useState(null);
  const pollingRef = useRef(null);
  const prevStatusMapRef = useRef({});
  const { connectToOrderEvents, disconnectFromOrderEvents } = useOrderNotification();

  const notifyCustomerOfReadyOrder = useCallback((order, type = 'order_ready') => {
    const payload = {
      type,
      orderId: order?._id || order?.orderId || order?.id,
      orderNumber: order?.orderNumber || order?.order_number,
      message: '🔔 Your order is ready!\nPlease collect it from the counter.',
      order,
    };

    if (payload.orderId || payload.orderNumber) {
      window.dispatchEvent(new CustomEvent('order-recall', { detail: payload }));
      localStorage.setItem('teaflow_recall_alert', JSON.stringify(payload));
    }
  }, []);

  // On mount: restore customer session and check for active orders
  useEffect(() => {
    const initSession = async () => {
      const savedCustomer = localStorage.getItem(STORAGE_KEYS.CUSTOMER_INFO);
      if (savedCustomer) {
        try {
          const parsed = JSON.parse(savedCustomer);
          setCustomerInfo(parsed);

          // Check if this customer has active orders
          if (parsed.phone) {
            try {
              const url = `/api/orders/active-order/${encodeURIComponent(parsed.phone.trim())}` + (shopId ? `?shopId=${shopId}` : '');
              const response = await api.get(url);
              const data = response.data;
              if (data.data && Array.isArray(data.data) && data.data.length > 0) {
                // Restore active orders and go straight to tracking
                setTrackingOrders(data.data);
                setStep('track');
                setInitializing(false);
                return;
              }
            } catch (err) {
              // No active orders, proceed to menu
            }
          }

          // No active orders but customer info exists - go to menu
          setStep('menu');
        } catch (e) {
          // Invalid saved data, ignore
        }
      }
      setInitializing(false);
    };

    initSession();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!customerInfo.phone) return;
    connectToOrderEvents(customerInfo.phone);
    return () => disconnectFromOrderEvents();
  }, [customerInfo.phone, connectToOrderEvents, disconnectFromOrderEvents]);

  // Start polling when we have tracking orders
  useEffect(() => {
    if (step === 'track' && trackingOrders.length > 0) {
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      // Clear any existing polling
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }

      // Poll all active orders
      pollingRef.current = setInterval(() => {
        fetchAllOrdersStatus(trackingOrders);
      }, 5000);

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      };
    }
  }, [step, trackingOrders.length]);

  useEffect(() => {
    if (step === 'menu' && menuItems.length === 0) {
      fetchMenu();
    }
  }, [step]);

  useEffect(() => {
    const handleRecallEvent = (event) => {
      const payload = event.detail || {};
      const { orderId, orderNumber, message } = payload;
      if (!orderId && !orderNumber) return;

      const bannerMessage = message || '🔔 Your order is ready!\nPlease collect it from the counter.';
      setRecallBanner({ orderId, orderNumber, message: bannerMessage });
    };

    const handleStorageEvent = (event) => {
      if (event.key !== 'teaflow_recall_alert') return;
      try {
        handleRecallEvent({ detail: JSON.parse(event.newValue || '{}') });
      } catch (e) {}
    };

    window.addEventListener('order-recall', handleRecallEvent);
    window.addEventListener('storage', handleStorageEvent);
    return () => {
      window.removeEventListener('order-recall', handleRecallEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  useEffect(() => {
    if (!recallBanner) return;
    const timer = window.setTimeout(() => setRecallBanner(null), 6000);
    return () => window.clearTimeout(timer);
  }, [recallBanner]);

  const fetchMenu = async () => {
    setMenuLoading(true);
    setError('');
    try {
      const url = '/api/menu' + (shopId ? `?shopId=${shopId}` : '');
      console.log('Fetching menu from:', url);
      console.log('API base URL:', import.meta.env.VITE_API_URL);
      const response = await api.get(url);
      console.log('Menu response:', response.data);
      const menuData = Array.isArray(response.data) ? response.data : (response.data.data || []);
      console.log('Menu items count:', menuData.length);
      setMenuItems(menuData);
    } catch (err) {
      console.error('Menu fetch error:', err);
      console.error('Error response:', err.response);
      setError(err.response?.data?.message || 'Failed to load menu. Please try again.');
    } finally {
      setMenuLoading(false);
    }
  };

  const fetchAllOrdersStatus = async (orders) => {
    const updatedOrders = [];
    let hasChanges = false;

    for (const order of orders) {
      try {
        const response = await api.get(`/api/orders/${order._id || order.orderId}/status`);
        const data = response.data.data || response.data;
        updatedOrders.push(data);

        const orderKey = data._id || data.orderId;
        const prevStatus = prevStatusMapRef.current[orderKey];

        if (data.status === 'ready' && prevStatus && prevStatus !== 'ready') {
          notifyCustomerOfReadyOrder(data);
        }

        if (prevStatus !== data.status) {
          hasChanges = true;
        }
        prevStatusMapRef.current[orderKey] = data.status;
      } catch (err) {
        // Keep the order as-is if fetch fails
        updatedOrders.push(order);
      }
    }

    setTrackingOrders(updatedOrders);

    // If all orders are completed, stop polling
    const allCompleted = updatedOrders.every(
      o => o.status === 'completed'
    );
    if (allCompleted && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleContinue = async (e) => {
    e.preventDefault();
    if (!customerInfo.name.trim() || !customerInfo.phone.trim()) {
      setError('Please enter both name and phone number');
      return;
    }
    if (!/^\+?[\d\s-]{10,15}$/.test(customerInfo.phone)) {
      setError('Please enter a valid phone number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // ALWAYS persist customer info to localStorage
      localStorage.setItem(STORAGE_KEYS.CUSTOMER_INFO, JSON.stringify({
        name: customerInfo.name.trim(),
        phone: customerInfo.phone.trim(),
        tableNumber: customerInfo.tableNumber || 'Takeaway'
      }));

      // Check if customer has active orders
      const url = `/api/orders/active-order/${encodeURIComponent(customerInfo.phone.trim())}` + (shopId ? `?shopId=${shopId}` : '');
      const response = await api.get(url);
      const data = response.data;
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        // Active orders found, show tracking
        setTrackingOrders(data.data);
        setStep('track');
        return;
      }
      setStep('menu');
    } catch (err) {
      // No active order found, proceed to menu
      setStep('menu');
    } finally {
      setLoading(false);
    }
  };

  const handleManualShopIdEntry = async (e) => {
    e.preventDefault();
    if (!manualShopId.trim()) {
      setError('Please enter a Shop ID');
      return;
    }
    
    // Validate Shop ID format (S####)
    if (!/^S\d{4,}$/.test(manualShopId.trim())) {
      setError('Invalid Shop ID format. Please enter a valid Shop ID (e.g., S1001)');
      return;
    }

    setShopValidating(true);
    setError('');
    try {
      const response = await api.get(`/api/shop/validate/${manualShopId.trim()}`);
      const data = response.data.data;
      
      // Store the validated shop ID
      setShopId(manualShopId.trim());
      setShopName(data.shopName);
      localStorage.setItem('shopId', manualShopId.trim());
      
      // Move to customer info step
      setStep('info');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid Shop ID. Please check and try again.');
    } finally {
      setShopValidating(false);
    }
  };

  const addToCart = (item) => {
    setCart(prev => {
      const totalQuantity = prev.reduce((sum, i) => sum + i.quantity, 0);
      if (totalQuantity >= 15) {
        setError('Maximum 15 items are allowed per order.');
        return prev;
      }
      const existing = prev.find(i => i._id === item._id);
      if (existing) {
        if (totalQuantity + 1 > 15) {
          setError('Maximum 15 items are allowed per order.');
          return prev;
        }
        return prev.map(i => i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(i => i._id !== itemId));
  };

  const updateQuantity = (itemId, delta) => {
    setCart(prev => {
      const currentItem = prev.find(i => i._id === itemId);
      if (!currentItem) return prev;
      
      const totalQuantity = prev.reduce((sum, i) => sum + i.quantity, 0);
      const newQty = currentItem.quantity + delta;
      
      if (delta > 0 && totalQuantity >= 15) {
        setError('Maximum 15 items are allowed per order.');
        return prev;
      }
      
      return prev.map(i => {
        if (i._id === itemId) {
          const updatedQty = Math.max(0, newQty);
          return { ...i, quantity: updatedQty };
        }
        return i;
      }).filter(i => i.quantity > 0);
    });
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;
    
    const totalQuantity = cart.reduce((sum, i) => sum + i.quantity, 0);
    if (totalQuantity > 15) {
      setError('Maximum 15 items are allowed per order.');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const url = '/api/orders' + (shopId ? `?shopId=${shopId}` : '');
      const response = await api.post(url, {
        customer: customerInfo,
        items: cart.map(i => ({
          menuItemId: i._id,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
        })),
        totalAmount: cart.reduce((sum, i) => sum + (i.price * i.quantity), 0),
      });
      const newOrder = response.data.data;
      setOrderResult(newOrder);
      setCart([]);
      setStep('success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startTracking = () => {
    if (orderResult) {
      // Fetch full order details for tracking
      api.get(`/api/orders/${orderResult.orderId}/status`).then(response => {
        const data = response.data.data || response.data;
        setTrackingOrders([data]);
        setStep('track');
      }).catch(() => {
        // Fallback: use the order result directly
        setTrackingOrders([orderResult]);
        setStep('track');
      });
    }
  };

  const reset = () => {
    setStep('welcome');
    setCustomerInfo({ name: '', phone: '', tableNumber: 'Takeaway' });
    setCart([]);
    setOrderResult(null);
    setTrackingOrders([]);
    setError('');
    // Clear saved session on explicit logout
    localStorage.removeItem(STORAGE_KEYS.CUSTOMER_INFO);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ORDERS);
    prevStatusMapRef.current = {};
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const continueOrdering = () => {
    setCart([]);
    setOrderResult(null);
    setTrackingOrders([]);
    setError('');
    setStep('menu');
    // Keep customerInfo and localStorage intact
    prevStatusMapRef.current = {};
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
  };

  const statusColors = {
    placed: 'bg-blue-100 text-blue-700 border-blue-200',
    preparing: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    ready: 'bg-green-100 text-green-700 border-green-200',
    completed: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const statusLabels = {
    placed: 'Order Placed',
    preparing: 'Preparing',
    ready: 'Ready for Pickup',
    completed: 'Completed',
  };

  // Show loading spinner while initializing
  if (initializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 pb-20 sm:pb-24">
      <AnimatePresence>
        {recallBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-orange-200 bg-orange-600 px-4 py-4 text-white shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔔</span>
              <div className="flex-1">
                <p className="text-lg font-semibold">Your order is ready!</p>
                <p className="mt-1 text-sm text-orange-100">Please collect it from the counter.</p>
                {recallBanner.orderNumber && (
                  <p className="mt-2 text-xs text-orange-100">Order #{recallBanner.orderNumber}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="min-h-screen flex flex-col items-center justify-center px-6 py-8"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
              className="text-5xl sm:text-6xl mb-4 sm:mb-6"
            >
              ☕
            </motion.div>
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-3 sm:mb-4"
            >
              Welcome
            </motion.h1>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-600 text-center text-base sm:text-lg mb-8 sm:mb-12 max-w-sm px-4"
            >
              Handcrafted beverages made with love. Order now and enjoy!
            </motion.p>
            <div className="space-y-4 w-full max-w-xs">
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setStep('info')}
                className="w-full min-h-[44px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 sm:px-12 py-4 rounded-full text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Start Ordering
              </motion.button>
              {!shopId && (
                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStep('shopIdEntry')}
                  className="w-full min-h-[44px] bg-white text-gray-700 px-8 sm:px-12 py-4 rounded-full text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all border-2 border-gray-200"
                >
                  Enter Shop ID
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step === 'shopIdEntry' && (
          <motion.div
            key="shopIdEntry"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="min-h-screen flex flex-col items-center justify-center px-6 py-8"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
              className="text-5xl sm:text-6xl mb-4 sm:mb-6"
            >
              🏪
            </motion.div>
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-3 sm:mb-4"
            >
              Enter Shop ID
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-600 text-center text-base sm:text-lg mb-8 sm:mb-12 max-w-sm px-4"
            >
              Enter the Shop ID provided by the restaurant (e.g., S1001)
            </motion.p>
            <motion.form
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              onSubmit={handleManualShopIdEntry}
              className="w-full max-w-xs space-y-4"
            >
              <input
                type="text"
                value={manualShopId}
                onChange={(e) => {
                  setManualShopId(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="Enter Shop ID"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-amber-500 focus:outline-none text-center text-lg font-semibold tracking-wider"
                maxLength={10}
              />
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-500 text-sm text-center"
                >
                  {error}
                </motion.p>
              )}
              <motion.button
                type="submit"
                disabled={shopValidating}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full min-h-[44px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 sm:px-12 py-4 rounded-full text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {shopValidating ? 'Validating...' : 'Continue'}
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setStep('welcome');
                  setManualShopId('');
                  setError('');
                }}
                className="w-full min-h-[44px] bg-white text-gray-700 px-8 sm:px-12 py-4 rounded-full text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all border-2 border-gray-200"
              >
                Back
              </motion.button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step === 'info' && (
          <motion.div
            key="info"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="max-w-md mx-auto px-6 pt-12 sm:pt-16"
          >
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2"
            >
              Your Details
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-gray-600 mb-6 sm:mb-8"
            >
              We need a few details to get started
            </motion.p>

            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onSubmit={handleContinue}
              className="space-y-4 sm:space-y-6"
            >
              {shopName && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center"
                >
                  <p className="text-sm text-amber-800">
                    <span className="font-semibold">Ordering from:</span> {shopName}
                  </p>
                </motion.div>
 )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  placeholder="Enter Your Name"
                  className="w-full min-h-[44px] px-4 py-3 sm:py-4 rounded-2xl border-2 border-gray-200 focus:border-orange-300 focus:outline-none text-base sm:text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  placeholder="Enter Mobile Number"
                  className="w-full min-h-[44px] px-4 py-3 sm:py-4 rounded-2xl border-2 border-gray-200 focus:border-orange-300 focus:outline-none text-base sm:text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Table Number
                </label>
                <select
                  value={customerInfo.tableNumber || 'Takeaway'}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, tableNumber: e.target.value })}
                  className="w-full min-h-[44px] px-4 py-3 sm:py-4 rounded-2xl border-2 border-gray-200 focus:border-orange-300 focus:outline-none text-base sm:text-lg bg-white"
                >
                  <option value="Takeaway">Takeaway</option>
                  {[...Array(20).keys()].map(n => (
                    <option key={n + 1} value={`Table ${n + 1}`}>Table {n + 1}</option>
                  ))}
                </select>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm"
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="min-h-[44px] w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 sm:py-4 rounded-2xl text-base sm:text-lg font-semibold shadow-lg disabled:opacity-50"
              >
                {loading ? 'Checking...' : 'Continue'}
              </motion.button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step === 'menu' && (
          <motion.div
            key="menu"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="max-w-2xl mx-auto px-6 pt-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Our Menu</h2>
                <p className="text-gray-600 mt-1 text-sm sm:text-base">Select your favorites</p>
              </div>
            </div>

            {cart.length > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setStep('cart')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-white border-2 border-orange-200 text-orange-600 py-3 sm:py-4 rounded-2xl font-semibold mb-4 sm:mb-6 flex items-center justify-center gap-2 shadow-sm min-h-[44px]"
              >
                <span>🛒</span>
                <span>View Cart ({cart.reduce((sum, i) => sum + i.quantity, 0)})</span>
              </motion.button>
            )}

            {menuLoading ? (
              <div className="space-y-3 sm:space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm animate-pulse">
                    <div className="h-5 sm:h-6 bg-gray-200 rounded w-3/4 mb-2 sm:mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center">
                <p className="text-red-600">{error}</p>
                <button onClick={fetchMenu} className="mt-4 text-orange-600 font-semibold">
                  Try Again
                </button>
              </div>
            ) : menuItems.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <p className="text-5xl sm:text-6xl mb-4">🍽️</p>
                <p className="text-gray-600">Our menu is being prepared. Please check back soon!</p>
              </div>
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                className="space-y-3 sm:space-y-4"
              >
                {menuItems.map((item, index) => (
                  <motion.div
                    key={item._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }}
                    className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">{item.name}</h3>
                        <p className="text-gray-600 text-sm line-clamp-2">{item.description}</p>
                      </div>
                      <div className="text-xl sm:text-2xl ml-2 sm:ml-4 flex-shrink-0">🥤</div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
                      <span className="text-xl sm:text-2xl font-bold text-orange-600">
                        ₹{Number(item.price).toFixed(2)}
                      </span>
                      <div className="flex gap-2 w-full sm:w-auto">
                        {cart.find(i => i._id === item._id) ? (
                          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => updateQuantity(item._id, -1)}
                              className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center font-bold text-gray-700 hover:border-orange-300 hover:text-orange-600 transition shadow-sm"
                            >
                              −
                            </motion.button>
                            <span className="font-bold text-lg w-8 text-center text-gray-900">
                              {cart.find(i => i._id === item._id)?.quantity || 0}
                            </span>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => updateQuantity(item._id, 1)}
                              className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold hover:shadow-md transition"
                            >
                              +
                            </motion.button>
                          </div>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => addToCart(item)}
                            className="w-full sm:flex-1 min-h-[44px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 rounded-xl font-semibold shadow-md"
                          >
                            Add to Cart
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step === 'cart' && (
          <motion.div
            key="cart"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="max-w-2xl mx-auto px-6 pt-8"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Your Cart</h2>

            {cart.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <p className="text-5xl sm:text-6xl mb-4">🛒</p>
                <p className="text-gray-600 text-base sm:text-lg mb-6">Your cart is empty</p>
                <button
                  onClick={() => setStep('menu')}
                  className="text-orange-600 font-semibold"
                >
                  Browse Menu
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4 sm:mb-6">
                  {cart.map((item) => (
                    <motion.div
                      key={item._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{item.name}</h3>
                          <p className="text-orange-600 font-semibold text-sm sm:text-base">₹{Number(item.price).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <button
                            onClick={() => updateQuantity(item._id, -1)}
                            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-200 transition"
                          >
                            -
                          </button>
                          <span className="font-bold text-lg w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item._id, 1)}
                            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-700 hover:bg-orange-200 transition"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-4 sm:mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 text-sm sm:text-base">Subtotal</span>
                    <span className="font-semibold text-sm sm:text-base">₹{cart.reduce((sum, i) => sum + (i.price * i.quantity), 0).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-center">
                    <span className="text-base sm:text-lg font-bold">Total</span>
                    <span className="text-xl sm:text-2xl font-bold text-orange-600">
                      ₹{cart.reduce((sum, i) => sum + (i.price * i.quantity), 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-500 text-sm mb-4"
                  >
                    {error}
                  </motion.p>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={placeOrder}
                  disabled={loading}
                  className="min-h-[44px] w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 sm:py-4 rounded-2xl text-base sm:text-lg font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Placing Order...' : 'Place Order'}
                </motion.button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step === 'success' && orderResult && (
          <motion.div
            key="success"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="max-w-md mx-auto px-6 pt-16 sm:pt-20"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
              className="text-6xl sm:text-7xl md:text-8xl text-center mb-4 sm:mb-6"
            >
              ✅
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-3 sm:mb-4"
            >
              Order Confirmed!
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 sm:mb-8"
            >
              <div className="text-center mb-4">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Order ID</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">#{orderResult.orderNumber}</p>
              </div>
              <div className="text-center">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Estimated Time</p>
                <p className="text-base sm:text-lg font-semibold text-orange-600">15-20 minutes</p>
              </div>
            </motion.div>
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startTracking}
              className="min-h-[44px] w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 sm:py-4 rounded-2xl text-base sm:text-lg font-semibold shadow-lg mb-3 sm:mb-4"
            >
              Track Order
            </motion.button>
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              onClick={continueOrdering}
              className="min-h-[44px] w-full text-gray-600 py-3 font-semibold"
            >
              Continue Ordering
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step === 'track' && trackingOrders.length > 0 && (
          <motion.div
            key="track"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="max-w-2xl mx-auto px-6 pt-6 sm:pt-8"
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {trackingOrders.length > 1 ? 'Your Orders' : 'Track Order'}
              </h2>
              {trackingOrders.length > 1 && (
                <span className="text-xs sm:text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
                  {trackingOrders.length} active
                </span>
              )}
            </div>

            {trackingOrders.map((order, orderIdx) => (
              <motion.div
                key={order._id || order.orderId || orderIdx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(orderIdx * 0.1, 0.5), duration: 0.3 }}
                className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-4 sm:mb-6"
              >
                <div className="text-center mb-4">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Order ID</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">#{order.orderNumber}</p>
                </div>

                <div className={`inline-flex items-center min-h-[44px] px-4 py-2 rounded-full border-2 mx-auto block w-fit mb-3 sm:mb-4 ${statusColors[order.status] || statusColors.placed}`}>
                  <span className="font-semibold text-sm sm:text-base">{statusLabels[order.status] || order.status}</span>
                </div>

                {/* Recall / Pickup Messages */}
                {order.status === 'ready' && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 mb-4 text-center">
                    <p className="text-green-800 font-semibold text-base sm:text-lg">
                      🎉 Your order is ready. Please collect it from the counter.
                    </p>
                    {order.recallCount > 0 && (
                      <p className="text-purple-700 font-semibold text-sm sm:text-base mt-2">
                        🔔 Reminder: Your order is waiting at the counter.
                      </p>
                    )}
                  </div>
                )}

                <div className="border-t border-gray-200 pt-3 sm:pt-4 mt-3 sm:mt-4">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3">Order Items</h3>
                  <div className="space-y-2">
                    {order.items && order.items.map((item) => (
                      <div key={item._id || item.menuItemId} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900 text-sm sm:text-base">{item.name}</p>
                          <p className="text-xs sm:text-sm text-gray-600">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">₹{(item.price || item.unitPrice || 0) * item.quantity}</p>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between items-center">
                    <span className="text-base sm:text-lg font-bold">Total</span>
                    <span className="text-xl sm:text-2xl font-bold text-orange-600">₹{Number(order.totalAmount).toFixed(2)}</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-3 sm:pt-4 mt-3 sm:mt-4">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Status Timeline</h3>
                  <div className="space-y-3 sm:space-y-4">
                    {['placed', 'preparing', 'ready', 'completed'].map((status, idx) => {
                      const statusOrder = ['placed', 'preparing', 'ready', 'completed'];
                      const currentIdx = statusOrder.indexOf(order.status);
                      return (
                        <div key={status} className="flex items-center gap-3 sm:gap-4">
                          <div className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center ${currentIdx >= idx ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            {idx + 1}
                          </div>
                          <span className={currentIdx >= idx ? 'text-gray-900 font-medium text-sm sm:text-base' : 'text-gray-400 text-sm sm:text-base'}>{statusLabels[status]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ))}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={trackingOrders.every(o => o.status === 'completed') ? continueOrdering : reset}
              className="min-h-[44px] w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 sm:py-4 rounded-2xl text-base sm:text-lg font-semibold shadow-lg"
            >
              {trackingOrders.every(o => o.status === 'completed') ? 'Continue Ordering' : 'Continue Order'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}