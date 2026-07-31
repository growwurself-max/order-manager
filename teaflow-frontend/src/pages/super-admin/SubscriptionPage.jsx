import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getShops, updateSubscription, getSubscriptionOverview } from '../../services/superAdminApi';
import { useToast } from '../../context/ToastContext';

export default function SubscriptionPage() {
  const { showToast } = useToast();
  const [shops, setShops] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [targetShop, setTargetShop] = useState(null);
  const [form, setForm] = useState({ subscriptionPlan: 'free', subscriptionStatus: 'active', trialDays: '30', subscriptionExpiry: '' });

  const fetchShops = async () => {
    setLoading(true);
    try {
      const [shopsRes, overviewRes] = await Promise.all([
        getShops(),
        getSubscriptionOverview(),
      ]);
      setShops(shopsRes.data.data);
      setOverview(overviewRes.data.data);
    } catch (err) {
      showToast('Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchShops(); }, []);

  const handleManage = (shop) => {
    setTargetShop(shop);
    setForm({
      subscriptionPlan: shop.subscription_plan || 'free',
      subscriptionStatus: shop.subscription_status || 'active',
      trialDays: shop.trial_days?.toString() || '30',
      subscriptionExpiry: shop.subscription_expiry ? new Date(shop.subscription_expiry).toISOString().slice(0, 10) : '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const updates = { ...form };
      if (form.subscriptionExpiry) updates.subscriptionExpiry = new Date(form.subscriptionExpiry).toISOString();
      await updateSubscription(targetShop.id, updates);
      showToast('Subscription updated successfully', 'success');
      setShowModal(false);
      fetchShops();
    } catch (err) {
      showToast('Failed to update subscription', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickActivate = async (shop) => {
    setActionLoading(true);
    try {
      await updateSubscription(shop.id, { subscriptionStatus: 'active' });
      showToast('Shop activated', 'success');
      fetchShops();
    } catch (err) {
      showToast('Failed to activate', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const planColors = { free: 'bg-slate-500/10 text-slate-400', trial: 'bg-blue-500/10 text-blue-400', premium: 'bg-amber-500/10 text-amber-400' };
  const statusColors = { active: 'bg-emerald-500/10 text-emerald-400', trial: 'bg-blue-500/10 text-blue-400', suspended: 'bg-red-500/10 text-red-400', expired: 'bg-amber-500/10 text-amber-400' };

  return (
    <div className="space-y-6">
      <p className="text-slate-400 text-sm">Manage subscription plans and status for all shops</p>

      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Free', count: overview.distribution?.free || 0, color: 'from-slate-500 to-slate-600' },
            { label: 'Trial', count: overview.distribution?.trial || 0, color: 'from-blue-500 to-cyan-600' },
            { label: 'Premium', count: overview.distribution?.premium || 0, color: 'from-amber-500 to-orange-600' },
            { label: 'Active', count: overview.distribution?.active || 0, color: 'from-emerald-500 to-green-600' },
          ].map((card, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
              <div className={'w-10 h-10 rounded-xl bg-gradient-to-br ' + card.color + ' flex items-center justify-center mb-3'}><span className="text-lg">💳</span></div>
              <p className="text-3xl font-bold text-white">{card.count}</p>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{card.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Expiring Trials & Renewal Due */}
      {overview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>⚠️</span> Expiring Trials
            </h3>
            {overview.expiringTrials?.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No trials expiring soon</p>
            ) : (
              <div className="space-y-3">
                {overview.expiringTrials.map((shop) => (
                  <motion.div
                    key={shop.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{shop.shop_name}</p>
                      <p className="text-xs text-slate-400">{shop.daysRemaining} day{shop.daysRemaining !== 1 ? 's' : ''} remaining</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      shop.daysRemaining <= 3 ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {shop.daysRemaining <= 3 ? 'Critical' : 'Warning'}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>📋</span> Revenue by Plan
            </h3>
            {overview.revenueByPlan?.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No revenue data</p>
            ) : (
              <div className="space-y-3">
                {overview.revenueByPlan.map((item) => (
                  <motion.div
                    key={item.plan}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white capitalize">{item.plan}</p>
                      <p className="text-xs text-slate-400">{item.shopCount} shop{item.shopCount !== 1 ? 's' : ''}</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-400">₹{Number(item.revenue).toLocaleString('en-IN')}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="text-xs text-slate-400 uppercase border-b border-white/10"><th className="px-6 py-4">Shop</th><th className="px-6 py-4">Plan</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Trial Days</th><th className="px-6 py-4">Expiry</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {shops.length === 0 ? (<tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">No shops found</td></tr>) : (
                  shops.map((shop) => (
                    <tr key={shop.id} className="hover:bg-white/5 transition">
                      <td className="px-6 py-4 font-semibold text-white">{shop.shop_name}</td>
                      <td className="px-6 py-4"><span className={'text-xs px-2 py-1 rounded-full font-medium capitalize ' + (planColors[shop.subscription_plan] || planColors.free)}>{shop.subscription_plan}</span></td>
                      <td className="px-6 py-4"><span className={'text-xs px-2 py-1 rounded-full font-medium capitalize ' + (statusColors[shop.subscription_status] || statusColors.active)}>{shop.subscription_status}</span></td>
                      <td className="px-6 py-4 text-slate-300">{shop.trial_days || 0}</td>
                      <td className="px-6 py-4 text-slate-400 text-sm">{shop.subscription_expiry ? new Date(shop.subscription_expiry).toLocaleDateString() : '-'}</td>
                      <td className="px-6 py-4 text-right"><div className="flex gap-1.5 justify-end">
                        <button onClick={() => handleManage(shop)} className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-lg transition">Manage</button>
                        {shop.subscription_status === 'suspended' && <button onClick={() => handleQuickActivate(shop)} className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg transition">Activate</button>}
                      </div></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-white">Manage Subscription</h3><button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-xl">✕</button></div>
              <p className="text-sm text-slate-400 mb-6">Shop: <strong className="text-white">{targetShop?.shop_name}</strong></p>
              <form onSubmit={handleSave} className="space-y-4">
                <div><label className="block text-xs font-medium text-slate-400 mb-1">Plan</label><select value={form.subscriptionPlan} onChange={(e) => setForm({ ...form, subscriptionPlan: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500"><option value="free" className="bg-slate-800">Free</option><option value="trial" className="bg-slate-800">Trial</option><option value="premium" className="bg-slate-800">Premium</option></select></div>
                <div><label className="block text-xs font-medium text-slate-400 mb-1">Status</label><select value={form.subscriptionStatus} onChange={(e) => setForm({ ...form, subscriptionStatus: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500"><option value="active" className="bg-slate-800">Active</option><option value="trial" className="bg-slate-800">Trial</option><option value="suspended" className="bg-slate-800">Suspended</option><option value="expired" className="bg-slate-800">Expired</option></select></div>
                <div><label className="block text-xs font-medium text-slate-400 mb-1">Trial Days</label><input type="number" value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500" /></div>
                <div><label className="block text-xs font-medium text-slate-400 mb-1">Expiry Date</label><input type="date" value={form.subscriptionExpiry} onChange={(e) => setForm({ ...form, subscriptionExpiry: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500" /></div>
                <div className="flex gap-3 pt-4"><button type="submit" disabled={actionLoading} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50">{actionLoading ? 'Saving...' : 'Save Subscription'}</button><button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-semibold">Cancel</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
