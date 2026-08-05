import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSuperAdminAuth } from '../../context/SuperAdminAuthContext';
import toast from 'react-hot-toast';
import Mascot from '../../components/login/Mascot';

export default function SuperAdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mascotState, setMascotState] = useState('idle');
  const [loginError, setLoginError] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { login } = useSuperAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMascotState('loading');
    setLoginError(false);

    try {
      const result = await login(email.trim(), password.trim());
      console.log('Login result:', result);
      setMascotState('success');
      setShowConfetti(true);
      toast.success('Login successful');
      setTimeout(() => {
        navigate('/super-admin/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Invalid credentials';
      setMascotState('error');
      setLoginError(true);
      toast.error(errorMessage);
      setTimeout(() => {
        setMascotState('idle');
        setLoginError(false);
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Confetti Animation */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-50"
            onAnimationComplete={() => setShowConfetti(false)}
          >
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: '50%',
                  y: '50%',
                  scale: 0,
                  rotate: Math.random() * 360
                }}
                animate={{
                  x: `${Math.random() * 100}%`,
                  y: `${Math.random() * 100}%`,
                  scale: [0, 1, 0],
                  rotate: Math.random() * 720
                }}
                transition={{
                  duration: 1.5 + Math.random(),
                  ease: 'easeOut'
                }}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'][Math.floor(Math.random() * 7)]
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Mascot */}
        <div className="flex justify-center mb-6">
          <Mascot state={mascotState} size={180} />
        </div>

        <motion.div
          animate={loginError ? {
            x: [0, -10, 10, -10, 10, 0]
          } : {}}
          transition={{ duration: 0.4 }}
          className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-8"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">Super Admin Login</h1>
            <p className="text-slate-400 mt-2">Access platform administration</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setMascotState('username')}
                onBlur={() => setMascotState('idle')}
                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="Enter Admin Email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setMascotState(showPassword ? 'peek' : 'password')}
                  onBlur={() => setMascotState('idle')}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition pr-12"
                  placeholder="Enter Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowPassword(!showPassword);
                    setMascotState(showPassword ? 'password' : 'peek');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">
              Contact system administrator for credentials
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
