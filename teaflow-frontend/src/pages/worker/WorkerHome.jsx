import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, setRoleSession, clearRoleSession } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function WorkerHome() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const { showToast } = useToast();
  const pollingRef = useRef(null);

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    checkAuth();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchActiveOrders();
      startPolling();
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isLoggedIn]);

  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // Audio not supported, silent fallback
    }
  }, []);

  const startPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const response = await api.get('/orders/active');
        console.log('Polling orders response:', response.data);
        const newOrders = Array.isArray(response.data.data) ? response.data.data : [];
        setOrders(prev => {
          // Check for new orders
          const hasNewOrders = newOrders.length > prev.length;
          if (hasNewOrders) {
            const newOrderIds = newOrders.filter(
              n => !prev.some(o => o._id === n._id)
            );
            if (newOrderIds.length > 0) {
              playNotificationSound();
              showToast(`${newOrderIds.length} new order(s) received!`, 'info');
            }
          }
          
          // Merge updated orders: API data takes precedence over local state
          // This ensures status updates from other workers/owners appear instantly
          return newOrders.map(newOrder => {
            const existingOrder = prev.find(o => o._id === newOrder._id);
            // API data (newOrder) should override local state to show latest status
            return existingOrder ? { ...existingOrder, ...newOrder } : newOrder;
          });
        });
      } catch (err) {
        console.error('Polling error:', err);
        // Silent fail for polling
      }
    }, 8000);
  };

  const checkAuth = async () => {
    try {
      const response = await api.get('/auth/profile');
      setIsLoggedIn(response.data?.data?.role === 'worker');
    } catch (err) {
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActiveOrders = async () => {
    setError('');
    setIsLoading(true);
    try {
      const response = await api.get('/orders/active');
      console.log('Orders response:', response.data);
      const ordersData = response.data.data || response.data || [];
      console.log('Orders data:', ordersData);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (err) {
      console.error('Fetch orders error:', err);
      setError(err.response?.data?.message || 'Failed to fetch orders');
      showToast(err.response?.data?.message || 'Failed to fetch orders', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.username || !loginForm.password) {
      setError('Please enter both Username and Password');
      return;
    }

    setLoginLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login/worker', {
        username: loginForm.username,
        password: loginForm.password,
      });
      setRoleSession('worker', response.data.token);
      showToast('Login successful', 'success');
      setIsLoggedIn(true);
      setLoginForm({ username: '', password: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      showToast(err.response?.data?.message || 'Login failed', 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    setError('');
    try {
      const response = await api.patch(`/orders/${orderId}/status`, {
        status: newStatus,
      });
      showToast(`Order marked as ${newStatus}`, 'success');
      setOrders(prev => {
        const updated = prev.map(order =>
          order._id === orderId ? { ...order, status: response.data.data.status } : order
        );
        // Remove completed orders from active view
        if (newStatus === 'completed') {
          return updated.filter(o => o._id !== orderId);
        }
        return updated;
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || `Failed to update order to ${newStatus}`;
      setError(errorMsg);
      showToast(errorMsg, 'error');
    }
  };

  const updatePaymentStatus = async (orderId, currentStatus) => {
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    if (!window.confirm(`Mark order as ${newStatus}?`)) return;
    setError('');
    try {
      const response = await api.patch(`/orders/${orderId}/payment`, { paymentStatus: newStatus });
      showToast(`Order marked as ${newStatus}`, 'success');
      setOrders(prev => {
        const updated = prev.map(order =>
          order._id === orderId ? { ...order, paymentStatus: response.data.data.paymentStatus } : order
        );
        return updated;
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to update payment status';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    }
  };

  const recallCustomer = async (orderId) => {
    setError('');
    try {
      const response = await api.post(`/orders/${orderId}/recall`);
      playNotificationSound();
      showToast('Customer notified successfully', 'success');
      setOrders(prev => {
        const updated = prev.map(order =>
          order._id === orderId ? { ...order, recallCount: response.data.data.recallCount, lastRecallAt: response.data.data.lastRecallAt } : order
        );
        return updated;
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to notify customer';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      clearRoleSession('worker');
      setIsLoggedIn(false);
      setOrders([]);
      showToast('Logged out successfully', 'success');
      if (pollingRef.current) clearInterval(pollingRef.current);
    } catch (err) {
      showToast('Logout failed', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'placed':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'preparing':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'ready':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'completed':
        return 'bg-gray-100 text-gray-500 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusEmoji = (status) => {
    switch (status) {
      case 'placed': return '📋';
      case 'preparing': return '👨‍🍳';
      case 'ready': return '✅';
      case 'completed': return '✔️';
      default: return '📋';
    }
  };

  const getNextActions = (currentStatus) => {
    switch (currentStatus) {
      case 'placed':
        return ['ready'];
      case 'preparing':
        return ['ready'];
      case 'ready':
        return ['completed'];
      default:
        return [];
    }
  };

  const orderStats = {
    placed: orders.filter(o => o.status === 'placed').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    total: orders.length,
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-lg text-gray-600">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-100"
        >
          <div className="text-center mb-2">
            <span className="text-5xl">👨‍🍳</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 text-center">Order Manager - Worker Login</h2>
          <p className="text-gray-600 text-center mb-6 sm:mb-8 text-sm sm:text-base">Enter your Username and PIN to access the worker dashboard</p>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-xl border border-red-200"
            >
              {error}
            </motion.p>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                placeholder="Enter your username"
                className="w-full min-h-[44px] px-4 py-3 sm:py-4 rounded-2xl border-2 border-gray-200 focus:border-orange-300 focus:outline-none text-base sm:text-lg transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="Enter your password"
                className="w-full min-h-[44px] px-4 py-3 sm:py-4 rounded-2xl border-2 border-gray-200 focus:border-orange-300 focus:outline-none text-base sm:text-lg text-center tracking-widest transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="min-h-[44px] w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 sm:py-4 rounded-2xl text-base sm:text-lg font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {loginLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Logging in...
                </span>
              ) : 'Login'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Worker Dashboard</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage active orders</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={fetchActiveOrders}
            className="flex-1 sm:flex-none min-h-[44px] bg-white border-2 border-orange-200 text-orange-600 px-4 py-2.5 rounded-xl font-semibold hover:bg-orange-50 hover:border-orange-300 transition flex items-center justify-center gap-2 shadow-sm"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 sm:flex-none min-h-[44px] bg-white border-2 border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition shadow-sm"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Order Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Active</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{orderStats.total}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 shadow-sm border border-blue-100 text-center">
          <p className="text-xs text-blue-600 uppercase tracking-wider font-semibold">Placed</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{orderStats.placed}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 shadow-sm border border-yellow-100 text-center">
          <p className="text-xs text-yellow-600 uppercase tracking-wider font-semibold">Preparing</p>
          <p className="text-2xl font-bold text-yellow-700 mt-1">{orderStats.preparing}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-100 text-center">
          <p className="text-xs text-green-600 uppercase tracking-wider font-semibold">Ready</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{orderStats.ready}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchActiveOrders} className="mt-4 text-orange-600 font-semibold hover:underline">
            Retry
          </button>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <p className="text-6xl mb-4">✅</p>
          <p className="text-gray-600 text-lg">No active orders</p>
          <p className="text-gray-500 mt-2">All orders have been completed!</p>
          <p className="text-gray-400 text-sm mt-1">Auto-refreshing every 8 seconds...</p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-4">
            {orders.map((order, index) => {
              const nextActions = getNextActions(order.status);
              return (
                <motion.div
                  key={order._id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100, transition: { duration: 0.3 } }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                          #{order.orderNumber}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border-2 flex items-center gap-1.5 ${getStatusColor(order.status)}`}>
                          <span>{getStatusEmoji(order.status)}</span>
                          <span>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                        </span>
                        {/* Waiting for Pickup badge — shown when ready order exceeds recall timer */}
                        {order.waitingForPickup && order.status === 'ready' && (
                          <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border-2 bg-purple-100 text-purple-700 border-purple-300 animate-pulse">
                            ⏳ Waiting for Pickup
                          </span>
                        )}
                        <button
                          onClick={() => updatePaymentStatus(order._id, order.paymentStatus)}
                          className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border-2 cursor-pointer hover:opacity-80 transition ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}`}
                          title="Click to toggle payment status"
                        >
                          {order.paymentStatus === 'paid' ? '✅ Paid' : '💰 Unpaid'}
                        </button>
                      </div>
                      <p className="text-gray-600 text-sm sm:text-base flex items-center gap-2 flex-wrap">
                        Customer: <span className="font-semibold">{order.customer?.name || 'Guest'}</span>
                        {order.customer?.tableNumber && (
                          <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 rounded-md text-xs font-bold">
                            {order.customer.tableNumber}
                          </span>
                        )}
                      </p>
                      {order.customer?.phone && (
                        <p className="text-gray-500 text-sm">{order.customer.phone}</p>
                      )}
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xl sm:text-2xl font-bold text-orange-600">
                        ₹{Number(order.totalAmount).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1 flex sm:justify-end items-center gap-1">
                        <span>🕐</span>
                        <span>
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-3 sm:pt-4 mb-3 sm:mb-4">
                    <h4 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Order Items</h4>
                    <div className="space-y-2">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm gap-2">
                          <span className="text-gray-700 flex-1 min-w-0">
                            <span className="font-medium">{item.quantity}x</span> <span className="truncate">{item.name}</span>
                          </span>
                          <span className="font-semibold text-gray-900 flex-shrink-0">
                            ₹{(item.totalPrice || (item.unitPrice * item.quantity)).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {nextActions.length > 0 && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      {nextActions.includes('ready') && (
                        <button
                          onClick={() => updateOrderStatus(order._id, 'ready')}
                          className="flex-1 min-h-[44px] bg-gradient-to-r from-green-400 to-emerald-400 text-white py-3 rounded-xl font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                          ✅ Mark Ready
                        </button>
                      )}
                      {nextActions.includes('completed') && (
                        <button
                          onClick={() => updateOrderStatus(order._id, 'completed')}
                          className="flex-1 min-h-[44px] bg-gradient-to-r from-gray-400 to-gray-500 text-white py-3 rounded-xl font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                          ✔️ Complete Order
                        </button>
                      )}
                    </div>
                  )}

                  {/* Recall Customer button for Ready orders */}
                  {order.status === 'ready' && order.customer?.phone && (
                    <button
                      onClick={() => recallCustomer(order._id)}
                      className="w-full min-h-[44px] mt-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white py-3 rounded-xl font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <span>🔔</span>
                      <span>Recall Customer</span>
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
