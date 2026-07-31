import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getGlobalSettings, updateGlobalSettings } from '../../services/superAdminApi';
import { useToast } from '../../context/ToastContext';

export default function SettingsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    platformName: '',
    logo: '',
    supportEmail: '',
    contactNumber: '',
    announcementBanner: '',
    maintenanceMode: false,
    defaultTrialDays: '30',
    defaultSubscriptionPlan: 'free',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await getGlobalSettings();
        const s = res.data.data;
        setForm({
          platformName: s.platform_name || '',
          logo: s.logo || '',
          supportEmail: s.support_email || '',
          contactNumber: s.contact_number || '',
          announcementBanner: s.announcement_banner || '',
          maintenanceMode: s.maintenance_mode || false,
          defaultTrialDays: s.default_trial_days?.toString() || '30',
          defaultSubscriptionPlan: s.default_subscription_plan || 'free',
        });
      } catch (err) {
        showToast('Failed to load settings', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateGlobalSettings(form);
      showToast('Settings updated successfully', 'success');
    } catch (err) {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const inputClass = 'w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500';
  const labelClass = 'block text-xs font-medium text-slate-400 mb-1';

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">Platform Information</h3>
          <div>
            <label className={labelClass}>Platform Name</label>
            <input type="text" required value={form.platformName} onChange={(e) => setForm({ ...form, platformName: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Logo URL</label>
            <input type="text" value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} placeholder="https://..." className={inputClass} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Support Email</label>
              <input type="email" required value={form.supportEmail} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Contact Number</label>
              <input type="text" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} className={inputClass} />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">Announcement Banner</h3>
          <div>
            <label className={labelClass}>Banner Message</label>
            <textarea value={form.announcementBanner} onChange={(e) => setForm({ ...form, announcementBanner: e.target.value })} rows="3" placeholder="Platform-wide announcement..." className={inputClass} />
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">Default Subscription Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Default Trial Days</label>
              <input type="number" value={form.defaultTrialDays} onChange={(e) => setForm({ ...form, defaultTrialDays: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Default Subscription Plan</label>
              <select value={form.defaultSubscriptionPlan} onChange={(e) => setForm({ ...form, defaultSubscriptionPlan: e.target.value })} className={inputClass}>
                <option value="free" className="bg-slate-800">Free</option>
                <option value="trial" className="bg-slate-800">Trial</option>
                <option value="premium" className="bg-slate-800">Premium</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">Maintenance Mode</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-medium">Enable Maintenance Mode</p>
              <p className="text-xs text-slate-400 mt-1">Temporarily disable customer access to the platform</p>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, maintenanceMode: !form.maintenanceMode })}
              className={'relative w-14 h-7 rounded-full transition ' + (form.maintenanceMode ? 'bg-indigo-500' : 'bg-white/10')}
            >
              <span className={'absolute top-1 w-5 h-5 bg-white rounded-full transition ' + (form.maintenanceMode ? 'left-8' : 'left-1')}></span>
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3.5 rounded-xl font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Platform Settings'}
        </button>
      </form>
    </div>
  );
}