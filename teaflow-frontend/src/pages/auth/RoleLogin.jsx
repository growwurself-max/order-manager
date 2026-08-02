import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, getRoleToken, setRoleSession } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const CONFIG = {
  owner: {
    title: 'Owner Login',
    subtitle: 'Manage menu, workers, orders, shop settings, QR, subscriptions, and reports',
    endpoint: '/api/auth/login/owner',
    target: '/owner',
    fields: [
      { name: 'email', label: 'Email', type: 'email', placeholder: 'owner@demo.com' },
      { name: 'password', label: 'Password', type: 'password', placeholder: 'Owner@12345' },
    ],
  },
  worker: {
    title: 'Worker Login',
    subtitle: 'View orders and mark them ready or complete',
    endpoint: '/api/auth/login/worker',
    target: '/worker',
    fields: [
      { name: 'username', label: 'Username', type: 'text', placeholder: 'worker@demo.com' },
      { name: 'password', label: 'Password', type: 'password', placeholder: 'Worker@12345' },
    ],
  },
};

export default function RoleLogin({ role }) {
  const config = CONFIG[role];
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getRoleToken(role);
    if (!token) return;

    api
      .get('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (response.data?.data?.role === role) setAuthenticated(true);
      })
      .catch(() => {});
  }, [role]);

  if (authenticated) return <Navigate to={config.target} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Trim form values to prevent whitespace issues
      const trimmedForm = {};
      Object.keys(form).forEach(key => {
        trimmedForm[key] = form[key] ? form[key].trim() : '';
      });

      const response = await api.post(config.endpoint, trimmedForm);
      setRoleSession(role, response.data.token);
      showToast('Login successful', 'success');
      navigate(config.target, { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-emerald-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-950 text-center">{config.title}</h1>
        <p className="text-gray-600 text-center mt-2 mb-6 text-sm">{config.subtitle}</p>

        {error && <p className="text-red-600 text-sm mb-4 bg-red-50 p-3 rounded-lg">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {config.fields.map((field) => (
            <label key={field.name} className="block">
              <span className="block text-sm font-medium text-gray-700 mb-2">{field.label}</span>
              <input
                type={field.type}
                value={form[field.name] || ''}
                onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                placeholder={field.placeholder}
                className="w-full min-h-[44px] px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-400 focus:outline-none"
                required
              />
            </label>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
