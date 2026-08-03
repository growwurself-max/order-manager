import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setRoleSession } from '../../services/api';
import toast from 'react-hot-toast';

export default function WorkerLogin() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/login/worker', {
        username: username.trim(),
        password: pin.trim(),
      });
      setRoleSession('worker', response.data.token);
      toast.success('Login successful');
      navigate('/worker', { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-emerald-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-950 text-center">Worker Login</h1>
        <p className="text-gray-600 text-center mt-2 mb-6 text-sm">
          View orders and mark them ready or complete
        </p>

        {error && <p className="text-red-600 text-sm mb-4 bg-red-50 p-3 rounded-lg">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-2">Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter Username"
              className="w-full min-h-[44px] px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-400 focus:outline-none"
              required
            />
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-2">PIN</span>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              className="w-full min-h-[44px] px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-400 focus:outline-none"
              required
            />
          </label>

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
