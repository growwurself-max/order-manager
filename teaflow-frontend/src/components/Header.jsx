import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api, getRoleToken } from '../services/api';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAdmin = async () => {
      const token = getRoleToken('super_admin');
      if (!token) {
        setIsAdmin(false);
        return;
      }
      try {
        const response = await api.get('/api/auth/profile');
        if (response.data?.data?.role === 'super_admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (e) {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [location.pathname]); // Re-run check on page transition

  return (
    <header className="bg-cafe-white border-b border-border-warm sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent-warm rounded-lg flex items-center justify-center text-white font-bold">
            O
          </div>
          <span className="text-xl font-semibold text-cafe-dark">Order Manager</span>
        </Link>
        
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
          aria-label="Toggle menu"
        >
          <div className="w-6 h-5 relative flex flex-col justify-between">
            <span className={`block w-full h-0.5 bg-cafe-dark transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
            <span className={`block w-full h-0.5 bg-cafe-dark transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block w-full h-0.5 bg-cafe-dark transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
          </div>
        </button>
        
        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/customer" className="text-sm font-medium text-text-muted hover:text-cafe-dark transition-colors">
            Customer
          </Link>
          <Link to="/worker" className="text-sm font-medium text-text-muted hover:text-cafe-dark transition-colors">
            Worker
          </Link>
          <Link to="/owner" className="text-sm font-medium text-text-muted hover:text-cafe-dark transition-colors">
            Owner
          </Link>
          {isAdmin && (
            <Link to="/super-admin" className="text-sm font-semibold text-accent-warm hover:text-accent-hover transition-colors">
              Super Admin
            </Link>
          )}
        </nav>
      </div>
      
      {/* Mobile navigation dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="md:hidden overflow-hidden border-t border-border-warm"
          >
            <nav className="flex flex-col p-4 gap-2">
              <Link
                to="/customer"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] px-4 py-3 rounded-xl text-sm font-medium text-text-muted hover:text-cafe-dark hover:bg-gray-50 transition-colors"
              >
                Customer
              </Link>
              <Link
                to="/worker"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] px-4 py-3 rounded-xl text-sm font-medium text-text-muted hover:text-cafe-dark hover:bg-gray-50 transition-colors"
              >
                Worker
              </Link>
              <Link
                to="/owner"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] px-4 py-3 rounded-xl text-sm font-medium text-text-muted hover:text-cafe-dark hover:bg-gray-50 transition-colors"
              >
                Owner
              </Link>
              {isAdmin && (
                <Link
                  to="/super-admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] px-4 py-3 rounded-xl text-sm font-semibold text-accent-warm hover:text-accent-hover hover:bg-gray-50 transition-colors"
                >
                  Super Admin
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
