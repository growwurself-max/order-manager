import axios from 'axios';

// Production-only configuration
const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || 'https://ordermanager-u5vu.onrender.com';
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL?.trim() || 'https://order-manager-team.vercel.app';

export const roleTokenKey = (role) => `teaflow_${role}_token`;

export const getFrontendUrl = () => FRONTEND_URL;

// Auth now relies on an httpOnly cookie set by the backend. The JWT is no
// longer persisted in localStorage (mitigates XSS token theft). Only a
// non-sensitive role flag is kept for routing/UX.
const LEGACY_TOKEN_KEYS = ['teaflow_owner_token', 'teaflow_worker_token', 'teaflow_super_admin_token', 'token'];

const clearLegacyTokens = () => {
  LEGACY_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
};

export const setRoleSession = (role, _token) => {
  localStorage.setItem('teaflow_active_role', role);
  clearLegacyTokens();
};

export const clearRoleSession = (role) => {
  clearLegacyTokens();
  if (localStorage.getItem('teaflow_active_role') === role) {
    localStorage.removeItem('teaflow_active_role');
  }
};

export const getRoleFromPath = () => {
  const pathname = window.location.pathname;
  if (pathname.startsWith('/super-admin')) return 'super_admin';
  if (pathname.startsWith('/owner')) return 'owner';
  if (pathname.startsWith('/worker')) return 'worker';
  return localStorage.getItem('teaflow_active_role');
};

export const getRoleToken = () => null;

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // send the httpOnly auth cookie on every request
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const role = getRoleFromPath();
      if (role) clearRoleSession(role);
      else localStorage.removeItem('teaflow_active_role');
    }
    return Promise.reject(error);
  }
);

export default api;
