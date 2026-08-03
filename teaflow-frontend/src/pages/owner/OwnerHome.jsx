import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, setRoleSession, clearRoleSession, getFrontendUrl } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const PRODUCTION_URL = 'https://order-manager-team.vercel.app';

export default function OwnerHome() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [shopSettings, setShopSettings] = useState(null);
  const [ownerProfile, setOwnerProfile] = useState(null);
  const [error, setError] = useState('');
  const { showToast } = useToast();
  const [theme, setTheme] = useState(() => localStorage.getItem('teaflow-theme') || 'light');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [actionLoading, setActionLoading] = useState(false);

  // Menu Item Form States
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [menuItemForm, setMenuItemForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'milk-tea',
    isAvailable: true,
  });

  // Worker Form States
  const [editingWorker, setEditingWorker] = useState(null);
  const [workerForm, setWorkerForm] = useState({
    username: '',
    name: '',
    pin: '',
    role: 'worker',
  });

  // Shop Settings Form
  const [settingsForm, setSettingsForm] = useState({
    shopName: '',
    orderPrefix: 'TF',
    currency: 'INR',
    allowPreorder: false,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  // Apply theme on mount and when it changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // system theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
    localStorage.setItem('teaflow-theme', theme);
  }, [theme]);

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  useEffect(() => {
    if (isLoggedIn && activeTab) {
      loadTabData(activeTab);
    }
  }, [isLoggedIn, activeTab]);

  const checkAuth = async () => {
    try {
      const response = await api.get('/api/auth/profile');
      setIsLoggedIn(response.data?.data?.role === 'owner');
    } catch (err) {
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTabData = async (tab) => {
    setError('');
    switch (tab) {
      case 'dashboard':
        await fetchDashboardStats();
        break;
      case 'menu':
        await fetchMenu();
        break;
      case 'workers':
        await fetchWorkers();
        break;
      case 'orders':
        await fetchOrders();
        break;
      case 'settings':
        await Promise.all([fetchShopSettings(), fetchOwnerProfile()]);
        break;
      default:
        break;
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/api/orders/dashboard/stats');
      const statsData = response.data.data;
      // Fetch recall stats
      const recallResponse = await api.get('/api/orders/recall-stats');
      const recallData = recallResponse.data.data;
      setDashboardData({
        ...statsData,
        totalRecalledOrders: recallData.totalRecalledOrders || 0,
      });
    } catch (err) {
      showToast('Failed to load dashboard stats', 'error');
    }
  };

  const fetchMenu = async () => {
    try {
      const response = await api.get('/api/menu');
      const data = Array.isArray(response.data) ? response.data : (response.data.data || []);
      setMenuItems(data);
    } catch (err) {
      showToast('Failed to load menu items', 'error');
    }
  };

  const fetchWorkers = async () => {
    try {
      const response = await api.get('/api/workers');
      const data = Array.isArray(response.data) ? response.data : (response.data.data || []);
      setWorkers(data);
    } catch (err) {
      showToast('Failed to load workers', 'error');
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/api/orders');
      const data = Array.isArray(response.data) ? response.data : (response.data.data || []);
      setOrders(data);
    } catch (err) {
      showToast('Failed to load orders', 'error');
    }
  };

  const fetchShopSettings = async () => {
    try {
      const response = await api.get('/api/shop/settings');
      const data = response.data.data;
      console.log('Shop settings data:', data);
      setShopSettings(data);
      setSettingsForm({
        shopName: data.shopName || '',
        orderPrefix: data.settings?.orderPrefix || 'TF',
        currency: data.settings?.currency || 'INR',
        allowPreorder: data.settings?.allowPreorder || false,
      });
    } catch (err) {
      showToast('Failed to load shop settings', 'error');
    }
  };

  const fetchOwnerProfile = async () => {
    try {
      const response = await api.get('/api/auth/profile');
      setOwnerProfile(response.data.data);
    } catch (err) {
      // Silent fail
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      setError('Please enter both email and password');
      return;
    }

    setLoginLoading(true);
    setError('');
    try {
      const response = await api.post('/api/auth/login/owner', {
        email: loginForm.email,
        password: loginForm.password,
      });
      setRoleSession('owner', response.data.token);
      showToast('Login successful', 'success');
      setIsLoggedIn(true);
      setLoginForm({ email: '', password: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      showToast(err.response?.data?.message || 'Login failed', 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
      clearRoleSession('owner');
      setIsLoggedIn(false);
      setDashboardData(null);
      setMenuItems([]);
      setWorkers([]);
      setOrders([]);
      setOwnerProfile(null);
      setShowLogoutConfirm(false);
      showToast('Logged out successfully', 'success');
    } catch (err) {
      showToast('Logout failed', 'error');
    }
  };

  // Menu Item Actions
  const handleSaveMenuItem = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        ...menuItemForm,
        price: parseFloat(menuItemForm.price),
      };

      if (editingMenuItem) {
        await api.put(`/api/menu/${editingMenuItem._id}`, payload);
        showToast('Menu item updated successfully', 'success');
        setEditingMenuItem(null);
      } else {
        await api.post('/api/menu', payload);
        showToast('Menu item added successfully', 'success');
      }
      setMenuItemForm({
        name: '',
        description: '',
        price: '',
        category: 'milk-tea',
        isAvailable: true,
      });
      fetchMenu();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save menu item', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditMenuItem = (item) => {
    setEditingMenuItem(item);
    setMenuItemForm({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category: item.category || 'milk-tea',
      isAvailable: item.isAvailable ?? true,
    });
    setActiveTab('menu');
  };

  const handleDeleteMenuItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    setActionLoading(true);
    try {
      await api.delete(`/api/menu/${itemId}`);
      showToast('Menu item deleted successfully', 'success');
      fetchMenu();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete menu item', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Worker Actions
  const handleSaveWorker = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        username: workerForm.username,
        name: workerForm.name,
        role: 'worker',
      };

      if (editingWorker) {
        await api.put(`/api/workers/${editingWorker._id}`, payload);
        showToast('Worker updated successfully', 'success');
        setEditingWorker(null);
      } else {
        await api.post('/api/workers', { ...payload, pin: workerForm.pin });
        showToast('Worker added successfully', 'success');
      }
      setWorkerForm({ username: '', name: '', pin: '', role: 'worker' });
      fetchWorkers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save worker', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditWorker = (worker) => {
    setEditingWorker(worker);
    setWorkerForm({
      username: worker.username || '',
      name: worker.name,
      pin: '',
      role: 'worker',
    });
    setActiveTab('workers');
  };

  const handleDeleteWorker = async (workerId) => {
    if (!window.confirm('Are you sure you want to delete this worker?')) return;
    setActionLoading(true);
    try {
      await api.delete(`/api/workers/${workerId}`);
      showToast('Worker deleted successfully', 'success');
      fetchWorkers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete worker', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Shop Settings Actions
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        shopName: settingsForm.shopName,
        settings: {
          orderPrefix: settingsForm.orderPrefix,
          currency: settingsForm.currency,
          allowPreorder: settingsForm.allowPreorder,
        },
      };
      await api.put('/api/shop/settings', payload);
      showToast('Shop settings updated successfully', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save settings', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // CSV Export
  const handleExportCSV = async () => {
    try {
      const response = await api.get('/api/orders/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('Orders exported successfully', 'success');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to export orders';
      showToast(errorMsg, 'error');
    }
  };

  // Archive Orders
  const handleArchiveOrders = async () => {
    if (!window.confirm('Are you sure you want to archive all completed orders? This action cannot be undone.')) return;
    setActionLoading(true);
    try {
      await api.post('/api/orders/archive');
      showToast('Orders archived successfully', 'success');
      fetchOrders();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to archive orders', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Update Payment Status
  const handlePaymentStatusToggle = async (orderId, currentStatus) => {
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    if (!window.confirm(`Mark order as ${newStatus}?`)) return;
    setActionLoading(true);
    try {
      await api.patch(`/orders/${orderId}/payment`, { paymentStatus: newStatus });
      showToast(`Order marked as ${newStatus}`, 'success');
      fetchOrders();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update payment status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Recall Customer
  const handleRecallCustomer = async (orderId) => {
    if (!window.confirm('Notify customer to collect their order?')) return;
    setActionLoading(true);
    try {
      await api.post(`/api/orders/${orderId}/recall`);
      // Play notification sound
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
      showToast('Customer notified successfully', 'success');
      fetchOrders();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to notify customer', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOrders = async () => {
    if (!window.confirm('Are you sure you want to permanently delete all archived orders? This action cannot be undone and will free up storage space.')) return;
    setActionLoading(true);
    try {
      await api.post('/api/orders/delete-archived');
      showToast('Archived orders deleted successfully', 'success');
      fetchOrders();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete archived orders', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
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
          className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100"
        >
          <div className="text-center mb-2">
            <span className="text-4xl sm:text-5xl">👨‍🍳</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 text-center">Order Manager - Owner Login</h2>
          <p className="text-gray-600 text-center mb-6 sm:mb-8 text-sm sm:text-base">Login to manage your shop</p>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-xl"
            >
              {error}
            </motion.p>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                placeholder="owner@example.com"
                className="w-full min-h-[44px] px-4 py-3 sm:py-4 rounded-2xl border-2 border-gray-200 focus:border-orange-300 focus:outline-none text-base sm:text-lg"
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
                placeholder="••••••••"
                className="w-full min-h-[44px] px-4 py-3 sm:py-4 rounded-2xl border-2 border-gray-200 focus:border-orange-300 focus:outline-none text-base sm:text-lg"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="min-h-[44px] w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 sm:py-4 rounded-2xl text-base sm:text-lg font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all"
            >
              {loginLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Owner Dashboard</h1>
          <p className="mt-1 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>Manage your tea shop</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('settings')}
            className="min-h-[44px] px-4 py-2 rounded-xl font-semibold transition border-2"
            style={{
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-color)'
            }}
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
          <p className="text-red-600">{error}</p>
          <button onClick={() => loadTabData(activeTab)} className="mt-4 text-orange-600 font-semibold hover:underline">
            Retry
          </button>
        </div>
      )}

      <div className="flex gap-3 sm:gap-4 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {[
          { key: 'dashboard', label: 'Dashboard' },
          { key: 'menu', label: 'Menu Items' },
          { key: 'workers', label: 'Workers' },
          { key: 'orders', label: 'Orders' },
          { key: 'settings', label: 'Settings' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`min-h-[44px] px-4 sm:px-6 py-3 rounded-xl font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-orange-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && dashboardData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          <div className="rounded-2xl p-4 sm:p-6 shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <p className="text-xs sm:text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Total Orders Today</p>
            <p className="text-2xl sm:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>{dashboardData.totalOrders}</p>
          </div>
          <div className="rounded-2xl p-4 sm:p-6 shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <p className="text-xs sm:text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Total Revenue</p>
            <p className="text-2xl sm:text-4xl font-bold text-orange-600">₹{dashboardData.totalRevenue.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl p-4 sm:p-6 shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <p className="text-xs sm:text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Completed Orders</p>
            <p className="text-2xl sm:text-4xl font-bold text-green-600">{dashboardData.completedOrders}</p>
          </div>
          <div className="rounded-2xl p-4 sm:p-6 shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <p className="text-xs sm:text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Pending Payments</p>
            <p className="text-2xl sm:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>₹{dashboardData.pendingPayments.toFixed(2)}</p>
          </div>
        </motion.div>
      )}

      {/* Menu Items Tab */}
      {activeTab === 'menu' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 sm:p-6 shadow-sm border"
          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        >
          <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6" style={{ color: 'var(--text-primary)' }}>Menu Items</h3>
          
          <form onSubmit={handleSaveMenuItem} className="space-y-4 mb-6 sm:mb-8 p-4 sm:p-6 rounded-2xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <h4 className="font-semibold text-base sm:text-lg" style={{ color: 'var(--text-primary)' }}>
              {editingMenuItem ? 'Edit Menu Item' : 'Add New Menu Item'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <input
                type="text"
                value={menuItemForm.name}
                onChange={(e) => setMenuItemForm({ ...menuItemForm, name: e.target.value })}
                placeholder="Item name"
                required
                className="min-h-[44px] px-4 py-3 rounded-2xl border-2 focus:border-orange-300 focus:outline-none"
                style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
              />
              <input
                type="text"
                value={menuItemForm.description}
                onChange={(e) => setMenuItemForm({ ...menuItemForm, description: e.target.value })}
                placeholder="Description"
                className="min-h-[44px] px-4 py-3 rounded-2xl border-2 focus:border-orange-300 focus:outline-none"
                style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
              />
              <input
                type="number"
                step="0.01"
                value={menuItemForm.price}
                onChange={(e) => setMenuItemForm({ ...menuItemForm, price: e.target.value })}
                placeholder="Price"
                required
                className="min-h-[44px] px-4 py-3 rounded-2xl border-2 focus:border-orange-300 focus:outline-none"
                style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
              />
              <select
                value={menuItemForm.category}
                onChange={(e) => setMenuItemForm({ ...menuItemForm, category: e.target.value })}
                className="min-h-[44px] px-4 py-3 rounded-2xl border-2 focus:border-orange-300 focus:outline-none"
                style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
              >
                <option value="milk-tea">Milk Tea</option>
                <option value="fruit-tea">Fruit Tea</option>
                <option value="slush">Slush</option>
                <option value="specialty">Specialty</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAvailable"
                checked={menuItemForm.isAvailable}
                onChange={(e) => setMenuItemForm({ ...menuItemForm, isAvailable: e.target.checked })}
                className="w-5 h-5 rounded border-2 border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <label htmlFor="isAvailable" style={{ color: 'var(--text-primary)' }}>Available</label>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={actionLoading}
                className="min-h-[44px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Saving...' : (editingMenuItem ? 'Update Item' : 'Add Item')}
              </button>
              {editingMenuItem && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingMenuItem(null);
                    setMenuItemForm({ name: '', description: '', price: '', category: 'milk-tea', isAvailable: true });
                  }}
                  className="min-h-[44px] px-6 py-3 rounded-xl font-semibold transition"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="space-y-3">
            {menuItems.map((item) => (
              <div key={item._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>{item.name}</h4>
                  <p className="text-xs sm:text-sm line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
                  <p className="text-orange-600 font-semibold mt-1 text-sm sm:text-base">₹{Number(item.price).toFixed(2)}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleEditMenuItem(item)}
                    className="min-h-[44px] px-3 sm:px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-semibold hover:bg-blue-200 transition text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteMenuItem(item._id)}
                    className="min-h-[44px] px-3 sm:px-4 py-2 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200 transition text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Workers Tab */}
      {activeTab === 'workers' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 sm:p-6 shadow-sm border"
          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        >
          <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6" style={{ color: 'var(--text-primary)' }}>Workers</h3>

          <form onSubmit={handleSaveWorker} className="space-y-4 mb-6 sm:mb-8 p-4 sm:p-6 rounded-2xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <h4 className="font-semibold text-base sm:text-lg" style={{ color: 'var(--text-primary)' }}>
              {editingWorker ? 'Edit Worker' : 'Add New Worker'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <input
                type="text"
                value={workerForm.username}
                onChange={(e) => setWorkerForm({ ...workerForm, username: e.target.value })}
                placeholder="Username"
                required
                className="min-h-[44px] px-4 py-3 rounded-2xl border-2 focus:border-orange-300 focus:outline-none"
                style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
              />
              <input
                type="text"
                value={workerForm.name}
                onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })}
                placeholder="Worker name"
                required
                className="min-h-[44px] px-4 py-3 rounded-2xl border-2 focus:border-orange-300 focus:outline-none"
                style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
              />
              {!editingWorker && (
                <input
                  type="password"
                  value={workerForm.pin}
                  onChange={(e) => setWorkerForm({ ...workerForm, pin: e.target.value })}
                  placeholder="4-digit PIN"
                  maxLength={4}
                  required
                  className="min-h-[44px] px-4 py-3 rounded-2xl border-2 focus:border-orange-300 focus:outline-none"
                  style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                />
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={actionLoading}
                className="min-h-[44px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Saving...' : (editingWorker ? 'Update Worker' : 'Add Worker')}
              </button>
              {editingWorker && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingWorker(null);
                    setWorkerForm({ name: '', pin: '', role: 'worker' });
                  }}
                  className="min-h-[44px] px-6 py-3 rounded-xl font-semibold transition"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="space-y-3">
            {workers.map((worker) => (
              <div key={worker._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>{worker.name}</h4>
                  <p className="text-xs sm:text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>{worker.role}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleEditWorker(worker)}
                    className="min-h-[44px] px-3 sm:px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-semibold hover:bg-blue-200 transition text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteWorker(worker._id)}
                    className="min-h-[44px] px-3 sm:px-4 py-2 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200 transition text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 sm:p-6 shadow-sm border"
          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Orders</h3>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              <button
                onClick={handleExportCSV}
                className="min-h-[44px] px-3 sm:px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-semibold hover:bg-blue-200 transition flex items-center gap-2 flex-shrink-0 text-sm"
              >
                <span>📊</span>
                <span>Export CSV</span>
              </button>
              <button
                onClick={handleArchiveOrders}
                disabled={actionLoading}
                className="min-h-[44px] px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition disabled:opacity-50 flex-shrink-0 text-sm"
              >
                Archive Orders
              </button>
              <button
                onClick={handleDeleteOrders}
                disabled={actionLoading}
                className="min-h-[44px] px-3 sm:px-4 py-2 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200 transition disabled:opacity-50 flex-shrink-0 text-sm"
              >
                Delete Archived
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order._id} className="p-4 border-2 rounded-2xl" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-semibold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>#{order.orderNumber}</h4>
                    <p className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {order.customer?.name} - {order.customer?.phone}
                      {order.customer?.tableNumber && (
                        <span className="ml-2 px-2.5 py-1 bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 rounded-lg text-xs font-bold">
                          {order.customer.tableNumber}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handlePaymentStatusToggle(order._id, order.paymentStatus)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border-2 cursor-pointer hover:opacity-80 transition ${
                        order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                      }`}
                      title="Click to toggle payment status"
                    >
                      {order.paymentStatus === 'paid' ? '✅ Paid' : '💰 Unpaid'}
                    </button>
                    <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border-2 ${
                      order.status === 'completed' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                      order.status === 'ready' ? 'bg-green-100 text-green-700 border-green-200' :
                      order.status === 'preparing' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                      'bg-blue-100 text-blue-700 border-blue-200'
                    }`}>
                      {order.status}
                    </span>
                    {/* Recall badge for recalled orders */}
                    {order.recallCount > 0 && (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold border-2 bg-purple-100 text-purple-700 border-purple-300">
                        🔔 Recalled {order.recallCount}x
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {order.items?.length} item(s) - {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-orange-600 font-bold text-sm sm:text-base">₹{Number(order.totalAmount).toFixed(2)}</p>
                </div>
                {/* Recall Customer button for Ready orders */}
                {order.status === 'ready' && order.customer?.phone && (
                  <button
                    onClick={() => handleRecallCustomer(order._id)}
                    disabled={actionLoading}
                    className="w-full min-h-[44px] bg-gradient-to-r from-purple-500 to-violet-600 text-white py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span>🔔</span>
                    <span>Recall Customer</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Settings Tab - Only Theme and Logout */}
      {activeTab === 'settings' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Shop QR Code Section */}
          {shopSettings && (
            <div className="rounded-2xl p-6 shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
              <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Shop QR Code</h3>
              <p className="text-xs sm:text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Customers can scan this code to browse your menu and place orders.</p>
              
              {/* Shop ID Display */}
              <div className="bg-white/5 rounded-xl p-4 mb-4" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Your Shop ID</p>
                <p className="text-2xl font-mono font-bold text-indigo-500">{shopSettings.shop_identifier || 'N/A'}</p>
                <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                  Share this ID with customers for manual entry
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="bg-white p-3 rounded-xl border border-gray-200">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shopSettings.customer_url || `${PRODUCTION_URL}/customer?shop=${shopSettings.shop_identifier || shopSettings.id}`)}`}
                    alt="Shop QR Code"
                    className="w-36 h-36"
                  />
                </div>
                <div className="space-y-3 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      const url = shopSettings.customer_url || `${PRODUCTION_URL}/customer?shop=${shopSettings.shop_identifier || shopSettings.id}`;
                      navigator.clipboard.writeText(url);
                      showToast('Shop link copied to clipboard', 'success');
                    }}
                    className="w-full sm:w-auto min-h-[44px] bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md transition flex items-center justify-center gap-2"
                  >
                    📋 Copy Link
                  </button>
                  
                  <button
                    onClick={async () => {
                      try {
                        const url = shopSettings.customer_url || `${PRODUCTION_URL}/customer?shop=${shopSettings.shop_identifier || shopSettings.id}`;
                        console.log('QR Download URL:', url);
                        const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(url)}`;
                        const response = await fetch(qrDataUrl);
                        const blob = await response.blob();
                        const blobUrl = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = blobUrl;
                        link.download = `${shopSettings.shop_name.replace(/\s+/g, '_')}_QR.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        showToast('QR Code download started', 'success');
                      } catch (e) {
                        showToast('Failed to download QR code', 'error');
                      }
                    }}
                    className="w-full sm:w-auto min-h-[44px] bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md transition flex items-center justify-center gap-2"
                  >
                    📥 Download PNG
                  </button>
                  
                  <button
                    onClick={() => {
                      const url = shopSettings.customer_url || `${PRODUCTION_URL}/customer?shop=${shopSettings.shop_identifier || shopSettings.id}`;
                      console.log('QR Print URL:', url);
                      const printWindow = window.open('', '_blank');
                      const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
                      const shopName = shopSettings.shop_name;
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>${shopName} - Print QR</title>
                            <style>
                              body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; color: #3E2723; background-color: #FDFBFA; }
                              .card { border: 2px solid #D7CCC8; padding: 30px; border-radius: 20px; max-width: 400px; margin: 0 auto; background-color: white; box-shadow: 0 8px 16px rgba(0,0,0,0.05); }
                              h1 { font-size: 26px; font-weight: 700; color: #3E2723; margin-bottom: 5px; }
                              p { font-size: 15px; color: #6d6d6d; margin-bottom: 25px; }
                              img { margin-bottom: 20px; border: 2px solid #EFEBE9; padding: 10px; border-radius: 12px; background-color: white; }
                              .footer { font-size: 12px; color: #a0a0a0; margin-top: 20px; font-weight: 500; text-transform: uppercase; tracking-wider; }
                            </style>
                          </head>
                          <body>
                            <div class="card">
                              <h1>${shopName}</h1>
                              <p>Scan to Browse Menu & Order</p>
                              <img src="${qrDataUrl}" width="250" height="250" />
                              <div class="footer">Powered by Order Manager</div>
                            </div>
                            <script>
                              window.onload = function() {
                                window.print();
                                setTimeout(function() { window.close(); }, 500);
                              };
                            </script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }}
                    className="w-full sm:w-auto min-h-[44px] bg-gray-700 hover:bg-gray-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md transition flex items-center justify-center gap-2"
                  >
                    🖨️ Print PDF
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Theme Switcher Section */}
          <div className="rounded-2xl p-6 shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6" style={{ color: 'var(--text-primary)' }}>Theme</h3>
            <p className="text-xs sm:text-sm mb-3 sm:mb-4" style={{ color: 'var(--text-secondary)' }}>Choose your preferred appearance</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {['light', 'dark', 'system'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setTheme(mode)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all min-h-[44px] ${
                    theme === mode
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-200'
                  }`}
                  style={theme === mode ? { backgroundColor: 'rgba(255, 107, 0, 0.05)' } : { backgroundColor: 'var(--card-bg)' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl sm:text-2xl">
                      {mode === 'light' ? '☀️' : mode === 'dark' ? '🌙' : '💻'}
                    </span>
                    <div>
                      <p className="font-semibold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {mode === 'light' ? 'Always light' : mode === 'dark' ? 'Always dark' : 'Follow device'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Logout Section */}
          <div className="rounded-2xl p-6 shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6" style={{ color: 'var(--text-primary)' }}>Account</h3>
            <button
              onClick={handleLogoutClick}
              className="min-h-[44px] w-full bg-gradient-to-r from-red-500 to-rose-500 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Logout
            </button>
          </div>
        </motion.div>
      )}

      {/* Logout Confirmation Dialog */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-xl border"
              style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Confirm Logout</h3>
              <p className="mb-4 sm:mb-6 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>Are you sure you want to logout? Your session will be cleared.</p>
              <div className="flex gap-3">
                <button
                  onClick={handleLogout}
                  className="min-h-[44px] flex-1 bg-gradient-to-r from-red-500 to-rose-500 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  Logout
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="min-h-[44px] flex-1 py-3 rounded-xl font-semibold transition border-2"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-color)'
                  }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
