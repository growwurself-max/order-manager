import { api } from './api';

// ===========================
// Auth
// ===========================
export const superAdminLogin = (credentials) =>
  api.post('/super-admin/auth/login', credentials);

// ===========================
// Dashboard
// ===========================
export const getDashboardStats = () => api.get('/super-admin/stats');

// ===========================
// Analytics
// ===========================
export const getAnalytics = (params = {}) =>
  api.get('/super-admin/analytics', { params });

// ===========================
// Notifications
// ===========================
export const getNotifications = () =>
  api.get('/super-admin/notifications');

// ===========================
// Settings
// ===========================
export const getGlobalSettings = () => api.get('/super-admin/settings');
export const updateGlobalSettings = (settings) => api.put('/super-admin/settings', settings);

// ===========================
// Shops
// ===========================
export const getShops = (params = {}) => api.get('/super-admin/shops', { params });
export const createShop = (shopData) => api.post('/super-admin/shops', shopData);
export const updateShop = (shopId, updates) => api.put(`/super-admin/shops/${shopId}`, updates);
export const deleteShop = (shopId) => api.delete(`/super-admin/shops/${shopId}`);
export const getShopStats = (shopId) => api.get(`/super-admin/shops/${shopId}`);
export const resetShopCredentials = (shopId, password) =>
  api.post(`/super-admin/shops/${shopId}/reset-credentials`, { password });

// ===========================
// Subscriptions
// ===========================
export const updateSubscription = (shopId, updates) =>
  api.put(`/super-admin/shops/${shopId}/subscription`, updates);
export const getSubscriptionOverview = () =>
  api.get('/super-admin/subscriptions/overview');

// ===========================
// Owners
// ===========================
export const getOwners = () => api.get('/super-admin/owners');
export const createOwner = (ownerData) => api.post('/super-admin/owners', ownerData);
export const updateOwner = (ownerId, updates) => api.put(`/super-admin/owners/${ownerId}`, updates);
export const resetOwnerPassword = (ownerId, password) =>
  api.post(`/super-admin/owners/${ownerId}/reset-password`, { password });
export const deleteOwner = (ownerId) => api.delete(`/super-admin/owners/${ownerId}`);

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