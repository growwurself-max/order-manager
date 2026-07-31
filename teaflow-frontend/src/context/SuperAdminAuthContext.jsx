import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getRoleToken, setRoleSession, clearRoleSession } from '../services/api';
import { superAdminLogin as loginApi } from '../services/superAdminApi';

const SuperAdminAuthContext = createContext(null);

export const SuperAdminAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const storedToken = getRoleToken('super_admin');
    if (!storedToken) {
      setLoading(false);
      return;
    }
    try {
      const response = await api.get('/auth/profile', {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      if (response.data?.data?.role === 'super_admin') {
        setUser(response.data.data);
        setToken(storedToken);
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
      
      const { token: newToken, user: newUser } = response.data;
      
      if (!newToken || !newUser) {
        throw new Error('Invalid response from server');
      }
      
      setRoleSession('super_admin', newToken);
      setToken(newToken);
      setUser(newUser);
      return response.data;
    } catch (error) {
      console.error('Login error in context:', error);
      throw error;
    }
  };

  const logout = () => {
    clearRoleSession('super_admin');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token,
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
