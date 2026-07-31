import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getOwners,
  createOwner,
  updateOwner,
  resetOwnerPassword,
  deleteOwner,
  getShops,
} from '../../services/superAdminApi';
import { useToast } from '../../context/ToastContext';

const emptyForm = { name: '', email: '', password: '', phone: '', shopId: '' };

export default function OwnerManagementPage() {
  const { showToast } = useToast();
  const [owners, setOwners] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingOwner, setEditingOwner] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ownersRes, shopsRes] = await Promise.all([getOwners(), getShops()]);
      console.log('Owners response:', ownersRes.data);
      console.log('Shops response:', shopsRes.data);
      setOwners(ownersRes.data.data || ownersRes.data || []);
      setShops(shopsRes.data.data || shopsRes.data || []);
    } catch (err) {
      console.error('Fetch data error:', err);
      showToast(err.response?.data?.message || 'Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (editingOwner) {
        console.log('Updating owner:', editingOwner.id, form);
        await updateOwner(editingOwner.id, {
          name: form.name,
          email: form.email,
          phone: form.phone,
        });
        showToast('Owner updated successfully', 'success');
      } else {
        console.log('Creating owner:', form);
        await createOwner(form);
        showToast('Owner created successfully', 'success');
      }
      setShowModal(false);
      setEditingOwner(null);
      setForm(emptyForm);
      fetchData();
    } catch (err) {
      console.error('Save owner error:', err);
      showToast(err.response?.data?.message || err.message || 'Failed to save owner', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (owner) => {
    setEditingOwner(owner);
    setForm({
      name: owner.name || '',
      email: owner.email || '',
      password: '',
      phone: owner.phone || '',
      shopId: owner.shop_id || '',
    });
    setShowModal(true);
  };

  const handleToggleActive = async (owner) => {
    setActionLoading(true);
    try {
      await updateOwner(owner.id, { isActive: !owner.is_active });
      showToast(`Owner ${!owner.is_active ? 'activated' : 'suspended'}`, 'success');
      fetchData();
    } catch (err) {
      showToast('Failed to update owner', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.trim().length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await resetOwnerPassword(resetTarget.id, newPassword);
      showToast('Password reset successfully', 'success');
      setShowResetModal(false);
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      showToast('Failed to reset password', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (ownerId) => {
    if (!window.confirm('Delete this owner? This will cascade delete their shop.')) return;
    setActionLoading(true);
    try {
      await deleteOwner(ownerId);
      showToast('Owner deleted successfully', 'success');
      fetchData();
    } catch (err) {
      showToast('Failed to delete owner', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-slate-400 text-sm">Manage all shop owners on the platform</p>
        <button
          onClick={() => { setEditingOwner(null); setForm(emptyForm); setShowModal(true); }}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium transition"
        >
          + New Owner
        </button>
      </div>

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
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Shop</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {owners.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">No owners found</td>
                  </tr>
                ) : (
                  owners.map((owner) => (
                    <tr key={owner.id} className="hover:bg-white/5 transition">
                      <td className="px-6 py-4 font-semibold text-white">{owner.name}</td>
                      <td className="px-6 py-4 text-slate-300">{owner.email}</td>
                      <td className="px-6 py-4 text-slate-400">{owner.phone || '-'}</td>
                      <td className="px-6 py-4 text-slate-300">{owner.shopName}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          owner.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {owner.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          <button onClick={() => handleEdit(owner)} className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-lg transition">Edit</button>
                          <button onClick={() => { setResetTarget(owner); setShowResetModal(true); }} className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg transition">Reset Pass</button>
                          <button onClick={() => handleToggleActive(owner)} className={`text-xs px-3 py-1.5 rounded-lg transition ${
                            owner.is_active ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {owner.is_active ? 'Suspend' : 'Activate'}
                          </button>
                          <button onClick={() => handleDelete(owner.id)} className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg transition">Delete</button>
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

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">{editingOwner ? 'Edit Owner' : 'Create Owner'}</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Name</label>
                  <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                  <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500" />
                </div>
                {!editingOwner && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
                    <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="min 6 chars" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Phone</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500" />
                </div>
                {!editingOwner && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Assign to Shop</label>
                    <select required value={form.shopId} onChange={(e) => setForm({ ...form, shopId: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500">
                      <option value="" className="bg-slate-800">Select a shop</option>
                      {shops.map((shop) => (
                        <option key={shop.id} value={shop.id} className="bg-slate-800">{shop.shop_name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={actionLoading} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50">
                    {actionLoading ? 'Saving...' : editingOwner ? 'Save Updates' : 'Create Owner'}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-semibold">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-white mb-2">Reset Password</h3>
              <p className="text-sm text-slate-400 mb-6">Set a new password for <strong className="text-white">{resetTarget?.name}</strong> ({resetTarget?.email}).</p>
              <form onSubmit={handleResetPassword} className="space-y-4">
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
    </div>
  );
}