import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getAnalytics } from '../../services/superAdminApi';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await getAnalytics({ days });
        setData(res.data.data);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) return <p className="text-slate-400 text-center py-20">Failed to load analytics data.</p>;

  const { summary, ordersPerDay, topShops, platformGrowth, customerGrowth, monthlyTrends } = data;
  const maxOrders = Math.max(...ordersPerDay.map((d) => d.count), 1);
  const maxRevenue = Math.max(...ordersPerDay.map((d) => d.revenue), 1);
  const maxGrowth = Math.max(...platformGrowth.map((d) => d.newShops), 1);
  const maxCustomerGrowth = Math.max(...customerGrowth.map((d) => d.newCustomers), 1);

  const Bar = ({ label, sub, pct, color }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400"><span>{label}</span><span>{sub}</span></div>
      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: pct + '%' }} transition={{ duration: 0.5 }} className={'h-full rounded-full bg-gradient-to-r ' + color} />
      </div>
    </div>
  );

  const cards = [
    { label: 'Total Orders', value: summary.totalOrders, icon: '📦', color: 'from-indigo-500 to-purple-600' },
    { label: 'Revenue', value: '₹' + Number(summary.totalRevenue).toLocaleString('en-IN'), icon: '💰', color: 'from-emerald-500 to-green-600' },
    { label: 'Active Customers', value: summary.activeCustomers, icon: '👥', color: 'from-blue-500 to-cyan-600' },
    { label: 'New Shops', value: summary.newShops, icon: '🏪', color: 'from-amber-500 to-orange-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <p className="text-slate-400 text-sm">Analytics period:</p>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500">
          <option value={7} className="bg-slate-800">Last 7 days</option>
          <option value={30} className="bg-slate-800">Last 30 days</option>
          <option value={90} className="bg-slate-800">Last 90 days</option>
          <option value={365} className="bg-slate-800">Last year</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
            <div className={'w-10 h-10 rounded-xl bg-gradient-to-br ' + card.color + ' flex items-center justify-center mb-3 text-lg'}>{card.icon}</div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{card.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-6">Orders Per Day</h3>
        {ordersPerDay.length === 0 ? <p className="text-slate-500 text-sm text-center py-8">No data available</p> : (
          <div className="space-y-2">
            {ordersPerDay.slice(-15).map((d, i) => <Bar key={i} label={d.date.slice(5)} sub={d.count + ' · ₹' + d.revenue.toFixed(0)} pct={(d.count / maxOrders) * 100} color="from-indigo-500 to-purple-500" />)}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">Revenue Per Day</h3>
          {ordersPerDay.length === 0 ? <p className="text-slate-500 text-sm text-center py-8">No data available</p> : (
            <div className="space-y-2">
              {ordersPerDay.slice(-10).map((d, i) => <Bar key={i} label={d.date.slice(5)} sub={'₹' + d.revenue.toFixed(0)} pct={(d.revenue / maxRevenue) * 100} color="from-emerald-500 to-green-500" />)}
            </div>
          )}
        </div>
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">Top Shops by Orders</h3>
          {topShops.length === 0 ? <p className="text-slate-500 text-sm text-center py-8">No data available</p> : (
            <div className="space-y-3">
              {topShops.map((shop, i) => (
                <motion.div key={shop.shopId} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">{i + 1}</span>
                    <div><p className="text-sm font-semibold text-white">{shop.shopName}</p><p className="text-xs text-slate-400">{shop.orders} orders</p></div>
                  </div>
                  <p className="text-sm font-bold text-emerald-400">₹{shop.revenue.toFixed(0)}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-6">Platform Growth (New Shops)</h3>
        {platformGrowth.length === 0 ? <p className="text-slate-500 text-sm text-center py-8">No new shops in this period</p> : (
          <div className="space-y-2">
            {platformGrowth.map((d, i) => <Bar key={i} label={d.date.slice(5)} sub={d.newShops + ' new'} pct={(d.newShops / maxGrowth) * 100} color="from-amber-500 to-orange-500" />)}
          </div>
        )}
      </div>

      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-6">Customer Growth (New Customers)</h3>
        {customerGrowth.length === 0 ? <p className="text-slate-500 text-sm text-center py-8">No customer data in this period</p> : (
          <div className="space-y-2">
            {customerGrowth.slice(-15).map((d, i) => <Bar key={i} label={d.date.slice(5)} sub={d.newCustomers + ' new'} pct={(d.newCustomers / maxCustomerGrowth) * 100} color="from-violet-500 to-purple-500" />)}
          </div>
        )}
      </div>

      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-6">Monthly Trends</h3>
        {monthlyTrends.length === 0 ? <p className="text-slate-500 text-sm text-center py-8">No monthly data available</p> : (
          <div className="space-y-3">
            {monthlyTrends.map((month, i) => (
              <motion.div key={month.month} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div>
                  <p className="text-sm font-semibold text-white">{month.month}</p>
                  <p className="text-xs text-slate-400">{month.orders} orders</p>
                </div>
                <p className="text-sm font-bold text-emerald-400">₹{month.revenue.toFixed(0)}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}