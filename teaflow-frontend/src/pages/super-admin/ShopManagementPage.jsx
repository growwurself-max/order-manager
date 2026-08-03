import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getShops,
  createShop,
  updateShop,
  deleteShop,
  getShopStats,
  resetShopCredentials,
} from '../../services/superAdminApi';
import { useToast } from '../../context/ToastContext';

const emptyForm = {
  shopName: '',
  ownerName: '',
  ownerEmail: '',
  ownerPassword: '',
  phoneNumber: '',
  streetAddress: '',
  trialDays: '30',
  subscriptionPlan: 'free',
  shopIdentifier: '',
};

const PRODUCTION_URL = 'https://order-manager-team.vercel.app';

export default function ShopManagementPage() {
  const { showToast } = useToast();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: 'all', plan: 'all' });

  const [showShopModal, setShowShopModal] = useState(false);
  const [editingShop, setEditingShop] = useState(null);
  const [shopForm, setShopForm] = useState(emptyForm);

  const [showStatsModal, setShowStatsModal] = useState(false);
  const [shopStats, setShopStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showShopIdModal, setShowShopIdModal] = useState(false);
  const [shopIdTarget, setShopIdTarget] = useState(null);
  const [shopIdForm, setShopIdForm] = useState({ shopIdentifier: '', regenerate: false });

  const fetchShops = async () => {
    setLoading(true);
    try {
      const res = await getShops(filters);
      console.log('Shops response:', res.data);
      setShops(res.data.data || res.data || []);
    } catch (err) {
      console.error('Fetch shops error:', err);
      showToast(err.response?.data?.message || 'Failed to fetch shops', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const handleSaveShop = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (editingShop) {
        const updates = {
          shopName: shopForm.shopName,
          address: { street: shopForm.streetAddress },
          contact: { phone: shopForm.phoneNumber, email: shopForm.ownerEmail },
          subscriptionPlan: shopForm.subscriptionPlan,
          subscriptionStatus: editingShop.subscription_status,
          trialDays: shopForm.trialDays,
        };
        console.log('Updating shop:', editingShop.id, updates);
        await updateShop(editingShop.id, updates);
        showToast('Shop updated successfully', 'success');
      } else {
        // Validate phone number for new shop
        if (!shopForm.phoneNumber || shopForm.phoneNumber.trim() === '') {
          showToast('Phone number is required', 'error');
          setActionLoading(false);
          return;
        }
        console.log('Creating shop:', shopForm);
        await createShop(shopForm);
        showToast('Shop and owner created successfully!', 'success');
      }
      setShowShopModal(false);
      setEditingShop(null);
      setShopForm(emptyForm);
      fetchShops();
    } catch (err) {
      console.error('Save shop error:', err);
      showToast(err.response?.data?.message || err.message || 'Failed to save shop', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditShop = (shop) => {
    setEditingShop(shop);
    setShopForm({
      shopName: shop.shop_name || '',
      ownerName: shop.owner?.name || '',
      ownerEmail: shop.owner?.email || shop.contact?.email || '',
      ownerPassword: '',
      phoneNumber: shop.contact?.phone || '',
      streetAddress: shop.address?.street || '',
      trialDays: shop.trial_days?.toString() || '30',
      subscriptionPlan: shop.subscription_plan || 'free',
    });
    setShowShopModal(true);
  };

  const handleToggleStatus = async (shop, targetStatus) => {
    setActionLoading(true);
    try {
      await updateShop(shop.id, {
        shopName: shop.shop_name,
        subscriptionStatus: targetStatus,
      });
      showToast(`Shop ${targetStatus === 'active' ? 'activated' : 'suspended'}`, 'success');
      fetchShops();
    } catch (err) {
      showToast('Failed to update status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteShop = async (shopId) => {
    if (!window.confirm('Delete this shop? This will cascade delete all associated data.')) return;
    setActionLoading(true);
    try {
      await deleteShop(shopId);
      showToast('Shop deleted successfully', 'success');
      fetchShops();
    } catch (err) {
      showToast('Failed to delete shop', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewStats = async (shopId) => {
    setStatsLoading(true);
    setShowStatsModal(true);
    try {
      const res = await getShopStats(shopId);
      console.log('Shop stats response:', res.data);
      setShopStats(res.data.data || res.data);
    } catch (err) {
      console.error('View stats error:', err);
      showToast(err.response?.data?.message || 'Failed to load shop stats', 'error');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleResetCredentials = async (e) => {
    e.preventDefault();
    if (newPassword.trim().length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await resetShopCredentials(resetTarget.id, newPassword);
      showToast('Shop credentials reset successfully', 'success');
      setShowResetModal(false);
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      showToast('Failed to reset credentials', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditShopId = (shop) => {
    setShopIdTarget(shop);
    setShopIdForm({ shopIdentifier: shop.shop_identifier || '', regenerate: false });
    setShowShopIdModal(true);
  };

  const handleSaveShopId = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (shopIdForm.regenerate) {
        if (!window.confirm('Are you sure you want to regenerate the Shop ID? This will update the QR code and customer access link.')) {
          setActionLoading(false);
          return;
        }
        await updateShop(shopIdTarget.id, { regenerateShopId: true });
        showToast('Shop ID regenerated successfully', 'success');
      } else {
        if (!/^SHA\d{4}$/.test(shopIdForm.shopIdentifier)) {
          showToast('Invalid Shop ID format. Must be SHA#### (e.g., SHA1001)', 'error');
          setActionLoading(false);
          return;
        }
        await updateShop(shopIdTarget.id, { shopIdentifier: shopIdForm.shopIdentifier });
        showToast('Shop ID updated successfully', 'success');
      }
      setShowShopIdModal(false);
      setShopIdTarget(null);
      setShopIdForm({ shopIdentifier: '', regenerate: false });
      fetchShops();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update Shop ID', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const copyShopLink = (shop) => {
    const link = shop.customer_url || `${PRODUCTION_URL}/customer?shop=${shop.shop_identifier || shop.id}`;
    navigator.clipboard.writeText(link);
    showToast('Shop link copied to clipboard', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by shop name or email..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && fetchShops()}
          className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="all" className="bg-slate-800">All Status</option>
          <option value="active" className="bg-slate-800">Active</option>
          <option value="trial" className="bg-slate-800">Trial</option>
          <option value="suspended" className="bg-slate-800">Suspended</option>
          <option value="expired" className="bg-slate-800">Expired</option>
        </select>
        <select
          value={filters.plan}
          onChange={(e) => setFilters({ ...filters, plan: e.target.value })}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="all" className="bg-slate-800">All Plans</option>
          <option value="free" className="bg-slate-800">Free</option>
          <option value="trial" className="bg-slate-800">Trial</option>
          <option value="premium" className="bg-slate-800">Premium</option>
        </select>
        <button
          onClick={fetchShops}
          className="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition"
        >
          Filter
        </button>
        <button
          onClick={() => { setEditingShop(null); setShopForm(emptyForm); setShowShopModal(true); }}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium transition whitespace-nowrap"
        >
          + New Shop
        </button>
      </div>

      {/* Shops table */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-slate-400 uppercase border-b border-white/10">
                  <th className="px-6 py-4">Shop</th>
                  <th className="px-6 py-4">Shop ID</th>
                  <th className="px-6 py-4">Owner</th>
                  <th className="px-6 py-4">Subscription</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shops.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">No shops found</td>
                  </tr>
                ) : (
                  shops.map((shop) => (
                    <tr key={shop.id} className="hover:bg-white/5 transition">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-white">{shop.shop_name}</p>
                        <p className="text-xs text-slate-400">{shop.address?.street || 'No address'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-mono text-indigo-400">{shop.shop_identifier || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-white">{shop.owner?.name || 'No owner'}</p>
                        <p className="text-xs text-slate-400">{shop.owner?.email || shop.contact?.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          shop.subscription_status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                          shop.subscription_status === 'trial' ? 'bg-blue-500/10 text-blue-400' :
                          shop.subscription_status === 'suspended' ? 'bg-red-500/10 text-red-400' :
                          'bg-amber-500/10 text-amber-400'
                        }`}>
                          {shop.subscription_status}
                        </span>
                        <p className="text-xs text-slate-500 mt-1 capitalize">{shop.subscription_plan}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          <button onClick={() => copyShopLink(shop)} className="text-xs bg-white/5 hover:bg-white/10 text-slate-300 px-3 py-1.5 rounded-lg transition">Copy Link</button>
                          <button onClick={() => handleEditShopId(shop)} className="text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 px-3 py-1.5 rounded-lg transition">Shop ID</button>
                          <button onClick={() => handleViewStats(shop.id)} className="text-xs bg-white/5 hover:bg-white/10 text-slate-300 px-3 py-1.5 rounded-lg transition">Stats</button>
                          <button onClick={() => handleEditShop(shop)} className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-lg transition">Edit</button>
                          <button onClick={() => { setResetTarget(shop); setShowResetModal(true); }} className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg transition">Reset</button>
                          {shop.subscription_status === 'suspended' ? (
                            <button onClick={() => handleToggleStatus(shop, 'active')} className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg transition">Activate</button>
                          ) : (
                            <button onClick={() => handleToggleStatus(shop, 'suspended')} className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg transition">Suspend</button>
                          )}
                          <button onClick={() => handleDeleteShop(shop.id)} className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg transition">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Shop Modal */}
      <AnimatePresence>
        {showShopModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">{editingShop ? 'Edit Shop' : 'Create New Shop'}</h3>
                <button onClick={() => setShowShopModal(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
              </div>
              <form onSubmit={handleSaveShop} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Shop Name</label>
                  <input type="text" required value={shopForm.shopName} onChange={(e) => setShopForm({ ...shopForm, shopName: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Owner Name</label>
                  <input type="text" required value={shopForm.ownerName} onChange={(e) => setShopForm({ ...shopForm, ownerName: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Owner Email</label>
                  <input type="email" required value={shopForm.ownerEmail} onChange={(e) => setShopForm({ ...shopForm, ownerEmail: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500" />
                </div>
                {!editingShop && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Owner Password</label>
                    <input type="password" required value={shopForm.ownerPassword} onChange={(e) => setShopForm({ ...shopForm, ownerPassword: e.target.value })} placeholder="min 6 chars" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Phone *</label>
                    <input type="text" required value={shopForm.phoneNumber} onChange={(e) => setShopForm({ ...shopForm, phoneNumber: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Trial Days</label>
                    <input type="number" value={shopForm.trialDays} onChange={(e) => setShopForm({ ...shopForm, trialDays: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Street Address</label>
                  <input type="text" value={shopForm.streetAddress} onChange={(e) => setShopForm({ ...shopForm, streetAddress: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Subscription Plan</label>
                  <select value={shopForm.subscriptionPlan} onChange={(e) => setShopForm({ ...shopForm, subscriptionPlan: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500">
                    <option value="free" className="bg-slate-800">Free</option>
                    <option value="trial" className="bg-slate-800">Trial</option>
                    <option value="premium" className="bg-slate-800">Premium</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={actionLoading} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50">
                    {actionLoading ? 'Saving...' : editingShop ? 'Save Updates' : 'Create Shop'}
                  </button>
                  <button type="button" onClick={() => setShowShopModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-semibold">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stats Modal */}
      <AnimatePresence>
        {showStatsModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Shop Statistics</h3>
                <button onClick={() => { setShowStatsModal(false); setShopStats(null); }} className="text-slate-400 hover:text-white text-xl">✕</button>
              </div>
              {statsLoading ? (
                <div className="flex justify-center py-10">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
                </div>
              ) : shopStats ? (
                <div className="space-y-4">
                  <div className="text-center pb-4 border-b border-white/10">
                    <p className="text-lg font-bold text-white">{shopStats.shop_name}</p>
                    <p className="text-xs text-slate-400">{shopStats.owner?.email}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Total Orders', value: shopStats.stats?.totalOrders, color: 'text-indigo-400' },
                      { label: 'Revenue', value: `₹${Number(shopStats.stats?.totalRevenue || 0).toFixed(0)}`, color: 'text-emerald-400' },
                      { label: 'Customers', value: shopStats.stats?.totalCustomers, color: 'text-purple-400' },
                      { label: 'Menu Items', value: shopStats.stats?.menuItems, color: 'text-amber-400' },
                      { label: 'Workers', value: shopStats.stats?.workers, color: 'text-cyan-400' },
                      { label: 'Plan', value: shopStats.subscription_plan, color: 'text-pink-400' },
                    ].map((stat, i) => (
                      <div key={i} className="bg-white/5 rounded-xl p-3">
                        <p className="text-xs text-slate-400 uppercase">{stat.label}</p>
                        <p className={`text-xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-center py-6">No data available</p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Credentials Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-white mb-2">Reset Shop Credentials</h3>
              <p className="text-sm text-slate-400 mb-6">Set a new password for the owner of <strong className="text-white">{resetTarget?.shop_name}</strong>.</p>
              <form onSubmit={handleResetCredentials} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">New Password</label>
                  <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="min 6 characters" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={actionLoading} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50">
                    {actionLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                  <button type="button" onClick={() => { setShowResetModal(false); setResetTarget(null); setNewPassword(''); }} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-semibold">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Shop ID Management Modal */}
      <AnimatePresence>
        {showShopIdModal && shopIdTarget && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Manage Shop ID</h3>
                <button onClick={() => { setShowShopIdModal(false); setShopIdTarget(null); setShopIdForm({ shopIdentifier: '', regenerate: false }); }} className="text-slate-400 hover:text-white text-xl">✕</button>
              </div>
              
              <div className="bg-white/5 rounded-xl p-4 mb-6">
                <p className="text-sm text-slate-400 mb-1">Current Shop ID</p>
                <p className="text-2xl font-mono font-bold text-indigo-400">{shopIdTarget.shop_identifier || 'Not assigned'}</p>
                <p className="text-xs text-slate-500 mt-2">{shopIdTarget.shop_name}</p>
              </div>

              <form onSubmit={handleSaveShopId} className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="regenerate"
                    checked={shopIdForm.regenerate}
                    onChange={(e) => {
                      setShopIdForm({ ...shopIdForm, regenerate: e.target.checked, shopIdentifier: '' });
                    }}
                    className="w-4 h-4 rounded border-white/10 bg-white/5 text-indigo-500 focus:ring-indigo-500"
                  />
                  <label htmlFor="regenerate" className="text-sm text-white">Generate new Shop ID</label>
                </div>

                {!shopIdForm.regenerate && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">New Shop ID</label>
                    <input
                      type="text"
                      value={shopIdForm.shopIdentifier}
                      onChange={(e) => setShopIdForm({ ...shopIdForm, shopIdentifier: e.target.value.toUpperCase() })}
                      placeholder="SHA#### (e.g., SHA1001)"
                      maxLength={7}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500 font-mono uppercase"
                    />
                    <p className="text-xs text-slate-500 mt-1">Format: SHA followed by 4 digits</p>
                  </div>
                )}

                {shopIdForm.regenerate && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    <p className="text-sm text-amber-400">
                      ⚠️ A new random Shop ID will be generated. The QR code and customer access link will be updated automatically.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={actionLoading} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50">
                    {actionLoading ? 'Saving...' : shopIdForm.regenerate ? 'Generate New ID' : 'Update Shop ID'}
                  </button>
                  <button type="button" onClick={() => { setShowShopIdModal(false); setShopIdTarget(null); setShopIdForm({ shopIdentifier: '', regenerate: false }); }} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-semibold">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}