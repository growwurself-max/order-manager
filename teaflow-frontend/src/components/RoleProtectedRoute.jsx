import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, clearRoleSession } from '../services/api';

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
      try {
        // Auth is carried by the httpOnly cookie (withCredentials on the
        // axios instance), so no token is needed here.
        const response = await api.get('/api/auth/profile');
        const profileRole = response.data?.data?.role;
        if (!cancelled) setStatus(profileRole === role ? 'allowed' : 'denied');
      } catch (error) {
        if (cancelled) return;

        // Only an actual 401/403 from the server means "not signed in".
        // Timeouts and offline errors are transient (the API host sleeps when
        // idle) and must NOT log the user out or bounce them to /login.
        const statusCode = error?.response?.status;
        if (statusCode === 401 || statusCode === 403) {
          clearRoleSession(role);
          setStatus('denied');
          return;
        }

        setStatus('unavailable');
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

  if (status === 'unavailable') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-gray-700 mb-4">We&apos;re having trouble reaching the server. It may be waking up — please try again.</p>
          <button
            type="button"
            onClick={() => setStatus('checking')}
            className="px-5 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return <Navigate to={LOGIN_PATHS[role]} replace />;
  }

  return children;
}
