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

// The API lives on a free-tier host that sleeps when idle, so the first
// request after an idle period can take tens of seconds. Give it room, and let
// the retry logic below cover the cold-start window instead of failing fast.
export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 20000;
const GET_MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [1200, 3000];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // send the httpOnly auth cookie on every request
  timeout: API_TIMEOUT_MS,
});

// NOTE: deliberately no default 'Content-Type' header here.
// `application/json` is not a CORS-safelisted header value, so sending it on
// bodyless requests made the browser issue an OPTIONS preflight for *every*
// GET — doubling round trips to the API. It is attached per-request below only
// when there is a body to describe.

// Collapse identical concurrent GETs into a single network call. Several
// components ask for the same resource on mount (e.g. /api/auth/profile), and
// polling timers can fire while a slow request is still in flight.
const inflightGets = new Map();
const baseAdapter = api.defaults.adapter;

const dedupingAdapter = (config) => {
  const method = (config.method || 'get').toLowerCase();
  if (method !== 'get') return baseAdapter(config);

  const key = `${config.baseURL || ''}${config.url}|${JSON.stringify(config.params || null)}`;
  const existing = inflightGets.get(key);
  if (existing) return existing;

  const pending = baseAdapter(config).finally(() => {
    if (inflightGets.get(key) === pending) inflightGets.delete(key);
  });
  inflightGets.set(key, pending);
  return pending;
};

api.defaults.adapter = dedupingAdapter;

api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  const hasBody = config.data !== undefined && config.data !== null && config.data !== '';
  if (hasBody && !config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    const method = (config.method || 'get').toLowerCase();

    // Only safe, idempotent reads are replayed automatically. Writes are never
    // retried automatically to avoid duplicate orders or double charges.
    const status = error.response?.status;
    const networkIssue = !error.response || error.code === 'ECONNABORTED';
    const serverIssue = status >= 500;
    const maxRetries = method === 'get' ? GET_MAX_RETRIES : networkIssue ? 1 : 0;

    const attempt = config.__retryAttempt || 0;
    if ((networkIssue || serverIssue) && attempt < maxRetries) {
      config.__retryAttempt = attempt + 1;
      await sleep(RETRY_DELAYS_MS[attempt] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]);
      return api.request(config);
    }

    if (status === 401) {
      const role = getRoleFromPath();
      if (role) clearRoleSession(role);
      else localStorage.removeItem('teaflow_active_role');
    }
    return Promise.reject(error);
  }
);

/**
 * Wake a sleeping server instance before the app issues real requests.
 * Fire-and-forget, once per browser session, using fetch so it bypasses the
 * retry/dedupe machinery and can never delay first paint.
 */
const warmUpBackend = () => {
  if (typeof window === 'undefined' || !API_BASE_URL) return;
  const flag = 'teaflow_warmed';
  try {
    if (sessionStorage.getItem(flag)) return;
    sessionStorage.setItem(flag, '1');
  } catch {
    return; // storage unavailable (private mode) — skip warm-up
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  fetch(`${API_BASE_URL}/api/health/ping`, { mode: 'cors', credentials: 'omit', signal: controller.signal })
    .catch(() => {})
    .finally(() => clearTimeout(timer));
};

warmUpBackend();

// Payment API helpers — Razorpay TEST MODE (defined after api to avoid TDZ)
export const createRazorpayOrder = (payload) => api.post('/api/payment/order', payload);
export const verifyRazorpayPayment = (payload) => api.post('/api/payment/verify', payload);
export const getRazorpayConfig = () => api.get('/api/payment/config');

export const apiPayment = {
  createOrder: createRazorpayOrder,
  verify: verifyRazorpayPayment,
  config: getRazorpayConfig,
};

export default api;
