import { api } from './api';

// ===========================
// Auth
// ===========================
export const superAdminLogin = (credentials) =>
  api.post('/api/super-admin/auth/login', credentials);

// ===========================
// Dashboard
// ===========================
export const getDashboardStats = () => api.get('/api/super-admin/stats');

// ===========================
// Analytics
// ===========================
export const getAnalytics = (params = {}) =>
  api.get('/api/super-admin/analytics', { params });

// ===========================
// Notifications
// ===========================
export const getNotifications = () =>
  api.get('/api/super-admin/notifications');

// ===========================
// Settings
// ===========================
export const getGlobalSettings = () => api.get('/api/super-admin/settings');
export const updateGlobalSettings = (settings) => api.put('/api/super-admin/settings', settings);

// ===========================
// Shops
// ===========================
export const getShops = (params = {}) => api.get('/api/super-admin/shops', { params });
export const createShop = (shopData) => api.post('/api/super-admin/shops', shopData);
export const updateShop = (shopId, updates) => api.put(`/api/super-admin/shops/${shopId}`, updates);
export const deleteShop = (shopId) => api.delete(`/api/super-admin/shops/${shopId}`);
export const getShopStats = (shopId) => api.get(`/api/super-admin/shops/${shopId}`);
export const resetShopCredentials = (shopId, password) =>
  api.post(`/api/super-admin/shops/${shopId}/reset-credentials`, { password });

// ===========================
// Subscriptions
// ===========================
export const updateSubscription = (shopId, updates) =>
  api.put(`/api/super-admin/shops/${shopId}/subscription`, updates);
export const getSubscriptionOverview = () =>
  api.get('/api/super-admin/subscriptions/overview');

// ===========================
// Owners
// ===========================
export const getOwners = () => api.get('/api/super-admin/owners');
export const createOwner = (ownerData) => api.post('/api/super-admin/owners', ownerData);
export const updateOwner = (ownerId, updates) => api.put(`/api/super-admin/owners/${ownerId}`, updates);
export const resetOwnerPassword = (ownerId, password) =>
  api.post(`/api/super-admin/owners/${ownerId}/reset-password`, { password });
export const deleteOwner = (ownerId) => api.delete(`/api/super-admin/owners/${ownerId}`);

export default {
  superAdminLogin,
  getDashboardStats,
  getAnalytics,
  getGlobalSettings,
  updateGlobalSettings,
  getShops,
  createShop,
  updateShop,
  deleteShop,
  getShopStats,
  resetShopCredentials,
  updateSubscription,
  getOwners,
  createOwner,
  updateOwner,
  resetOwnerPassword,
  deleteOwner,
};