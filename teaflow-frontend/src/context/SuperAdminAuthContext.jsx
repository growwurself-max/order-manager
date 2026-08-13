import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setRoleSession, clearRoleSession } from '../services/api';
import { superAdminLogin as loginApi } from '../services/superAdminApi';

const SuperAdminAuthContext = createContext(null);

export const SuperAdminAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      // Auth is carried by the httpOnly cookie (withCredentials).
      const response = await api.get('/api/super-admin/stats');
      if (response.status === 200) {
        setUser({ role: 'super_admin' });
      } else {
        clearRoleSession('super_admin');
      }
    } catch (err) {
      clearRoleSession('super_admin');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    try {
      const response = await loginApi({ email, password });
      console.log('Login API response:', response);

      const { user: newUser } = response.data;

      if (!newUser) {
        throw new Error('Invalid response from server');
      }

      setRoleSession('super_admin', null);
      setUser(newUser);
      return response.data;
    } catch (error) {
      console.error('Login error in context:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Ignore logout network errors — local state is cleared regardless.
    }
    clearRoleSession('super_admin');
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    checkAuth,
  };

  return <SuperAdminAuthContext.Provider value={value}>{children}</SuperAdminAuthContext.Provider>;
};

export const useSuperAdminAuth = () => {
  const context = useContext(SuperAdminAuthContext);
  if (!context) {
    throw new Error('useSuperAdminAuth must be used within SuperAdminAuthProvider');
  }
  return context;
};

export default SuperAdminAuthContext;
