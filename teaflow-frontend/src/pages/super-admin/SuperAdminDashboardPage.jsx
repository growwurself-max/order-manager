import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getDashboardStats } from '../../services/superAdminApi';

const StatCard = ({ label, value, icon, gradient, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:border-white/20 transition"
  >
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-lg`}>
        {icon}
      </div>
    </div>
    <p className="text-3xl font-bold text-white">{value}</p>
    <p className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wider">{label}</p>
  </motion.div>
);

const BarChart = ({ data, title }) => {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-6">{title}</h3>
      <div className="space-y-3">
        {data.map((bar, i) => {
          const pct = (bar.count / max) * 100;
          return (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-slate-400">
                <span>{bar.label}</span>
                <span>{bar.count}</span>
              </div>
              <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                  className={`h-full rounded-full bg-gradient-to-r ${bar.color}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LineChart = ({ data, title }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
        <p className="text-slate-500 text-sm text-center py-8">No data available</p>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * 100;
      const y = 100 - (d.count / max) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-6">{title}</h3>
      <div className="relative h-48">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(99,102,241,0.3)" />
              <stop offset="100%" stopColor="rgba(99,102,241,0)" />
            </linearGradient>
          </defs>
          <polygon points={`0,100 ${points} 100,100`} fill="url(#lineGradient)" />
          <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="flex justify-between mt-2 text-xs text-slate-500">
        <span>{data[0]?.date?.slice(5) || ''}</span>
        <span>{data[data.length - 1]?.date?.slice(5) || ''}</span>
      </div>
    </div>
  );
};

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getDashboardStats();
        setStats(res.data.data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-slate-400 text-center py-20">Failed to load dashboard data.</p>;
  }

  const subscriptionData = [
    { label: 'Active', count: stats.activeShops, color: 'from-emerald-500 to-green-500' },
    { label: 'Trial', count: stats.trialShops, color: 'from-blue-500 to-cyan-500' },
    { label: 'Suspended', count: stats.suspendedShops, color: 'from-red-500 to-rose-500' },
    { label: 'Premium', count: stats.premiumShops, color: 'from-amber-500 to-orange-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Platform Overview - Shop Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Shops" value={stats.totalShops} icon="🏪" gradient="from-indigo-500 to-purple-600" delay={0} />
        <StatCard label="Active Shops" value={stats.activeShops} icon="✅" gradient="from-emerald-500 to-green-600" delay={0.05} />
        <StatCard label="Trial Shops" value={stats.trialShops} icon="🕒" gradient="from-blue-500 to-cyan-600" delay={0.1} />
        <StatCard label="Expired Shops" value={stats.expiredShops} icon="⚠️" gradient="from-red-500 to-rose-600" delay={0.15} />
        <StatCard label="Suspended" value={stats.suspendedShops} icon="⏸️" gradient="from-orange-500 to-amber-600" delay={0.2} />
        <StatCard label="Premium" value={stats.premiumShops} icon="⭐" gradient="from-amber-500 to-yellow-600" delay={0.25} />
        <StatCard label="Free" value={stats.freeShops} icon="🆓" gradient="from-slate-500 to-gray-600" delay={0.3} />
        <StatCard label="New This Month" value={stats.newShopsThisMonth} icon="🆕" gradient="from-green-500 to-emerald-600" delay={0.35} />
      </div>

      {/* Platform Users */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Owners" value={stats.totalOwners} icon="👤" gradient="from-purple-500 to-pink-600" delay={0.4} />
        <StatCard label="Total Workers" value={stats.totalWorkers} icon="👷" gradient="from-teal-500 to-cyan-600" delay={0.45} />
        <StatCard label="Active Subscriptions" value={stats.activeSubscriptions} icon="�" gradient="from-violet-500 to-purple-600" delay={0.5} />
      </div>

      {/* Platform Revenue (SaaS Metrics) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/20 rounded-2xl p-6"
        >
          <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Monthly Recurring Revenue</p>
          <p className="text-3xl font-bold text-white mt-2">₹{Number(stats.mrr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-emerald-400/70 mt-2">Platform earnings</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20 rounded-2xl p-6"
        >
          <p className="text-xs text-violet-400 font-bold uppercase tracking-wider">Annual Recurring Revenue</p>
          <p className="text-3xl font-bold text-white mt-2">₹{Number(stats.arr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-violet-400/70 mt-2">Projected annual</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-6"
        >
          <p className="text-xs text-amber-400 font-bold uppercase tracking-wider">Premium Subscriptions</p>
          <p className="text-3xl font-bold text-white mt-2">{stats.premiumShops}</p>
          <p className="text-xs text-amber-400/70 mt-2">₹999/month each</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gradient-to-br from-cyan-500/10 to-teal-500/5 border border-cyan-500/20 rounded-2xl p-6"
        >
          <p className="text-xs text-cyan-400 font-bold uppercase tracking-wider">Total Shops</p>
          <p className="text-3xl font-bold text-white mt-2">{stats.totalShops}</p>
          <p className="text-xs text-cyan-400/70 mt-2">All time</p>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChart data={subscriptionData} title="Shop Distribution by Subscription" />
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Recent Shop Registrations</h3>
          <div className="space-y-3">
            {(stats.recentShopRegistrations || []).length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No recent registrations</p>
            ) : (
              stats.recentShopRegistrations.map((shop, i) => (
                <motion.div
                  key={shop.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{shop.shop_name}</p>
                    <p className="text-xs text-slate-400">{new Date(shop.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    shop.subscription_status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                    shop.subscription_status === 'trial' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    {shop.subscription_status}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}