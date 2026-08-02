import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, getRoleToken, clearRoleSession } from '../services/api';

const LOGIN_PATHS = {
  super_admin: '/super-admin/login',
  owner: '/owner/login',
  worker: '/worker/login',
};

export default function RoleProtectedRoute({ role, children }) {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const token = getRoleToken(role);
      if (!token) {
        setStatus('denied');
        return;
      }

      try {
        const response = await api.get('/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const profileRole = response.data?.data?.role;
        if (!cancelled) setStatus(profileRole === role ? 'allowed' : 'denied');
      } catch {
        clearRoleSession(role);
        if (!cancelled) setStatus('denied');
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [role]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'denied') {
    return <Navigate to={LOGIN_PATHS[role]} replace />;
  }

  return children;
}
