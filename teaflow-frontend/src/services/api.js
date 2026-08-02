import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ordermanager-backend-30x2.onrender.com';
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'https://ordermanager.vercel.app';

export const roleTokenKey = (role) => `teaflow_${role}_token`;

export const getFrontendUrl = () => FRONTEND_URL;

export const setRoleSession = (role, token) => {
  localStorage.setItem(roleTokenKey(role), token);
  localStorage.setItem('teaflow_active_role', role);
  localStorage.setItem('token', token);
};

export const clearRoleSession = (role) => {
  localStorage.removeItem(roleTokenKey(role));
  if (localStorage.getItem('teaflow_active_role') === role) {
    localStorage.removeItem('teaflow_active_role');
  }
  localStorage.removeItem('token');
};

export const getRoleFromPath = () => {
  const pathname = window.location.pathname;
  if (pathname.startsWith('/super-admin')) return 'super_admin';
  if (pathname.startsWith('/owner')) return 'owner';
  if (pathname.startsWith('/worker')) return 'worker';
  return localStorage.getItem('teaflow_active_role');
};

export const getRoleToken = (role = getRoleFromPath()) => {
  if (!role) return localStorage.getItem('token');
  return localStorage.getItem(roleTokenKey(role)) || localStorage.getItem('token');
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getRoleToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const role = getRoleFromPath();
      if (role) clearRoleSession(role);
      else localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export default api;
