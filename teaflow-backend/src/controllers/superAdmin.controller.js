import { HTTP_STATUS } from '../utils/constants.js';
import {
  loginSuperAdmin,
  getSuperAdminStats,
  getAllShops,
  createShop,
  updateShop,
  deleteShop as deleteShopService,
  getShopStats,
  resetShopCredentials,
  updateSubscription,
  getSubscriptionOverview,
  getGlobalSettings,
  updateGlobalSettings,
  getAllOwners,
  createOwner,
  updateOwner,
  resetOwnerPassword,
  deleteOwner as deleteOwnerService,
  getAnalytics,
  getNotifications,
} from '../services/superAdmin.service.js';

// ===========================
// Auth
// ===========================
export const superAdminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log('Super admin login attempt:', email);
    const result = await loginSuperAdmin(email, password);
    console.log('Super admin login successful');

    res.status(HTTP_STATUS.OK).json({
      message: 'Super Admin login successful',
      ...result,
    });
  } catch (error) {
    console.error('Super admin login error:', error.message);
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: error.message || 'Invalid credentials' });
  }
};

// ===========================
// Dashboard
// ===========================
export const getStats = async (req, res, next) => {
  try {
    const stats = await getSuperAdminStats();
    res.status(HTTP_STATUS.OK).json({
      message: 'Super Admin stats fetched successfully',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// Shops
// ===========================
export const getShops = async (req, res, next) => {
  try {
    const filters = {
      search: req.query.search,
      status: req.query.status,
      plan: req.query.plan,
    };
    const shops = await getAllShops(filters);
    res.status(HTTP_STATUS.OK).json({
      message: 'Shops fetched successfully',
      data: shops,
    });
  } catch (error) {
    next(error);
  }
};

export const postShop = async (req, res, next) => {
  try {
    const shopData = req.body;
    // Retrieve origin of client request, fallback to production frontend URL
    const origin = req.headers.origin || process.env.FRONTEND_URL || 'https://order-manager-team.vercel.app';
    console.log('Creating shop with origin:', origin);

    const result = await createShop(shopData, origin);
    console.log('Shop created with customer_url:', result.shop.customer_url);
    res.status(HTTP_STATUS.CREATED).json({
      message: 'Shop and owner account created successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const putShop = async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const updates = req.body;

    const result = await updateShop(shopId, updates);
    res.status(HTTP_STATUS.OK).json({
      message: 'Shop updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteShop = async (req, res, next) => {
  try {
    const { shopId } = req.params;
    await deleteShopService(shopId);
    res.status(HTTP_STATUS.OK).json({
      message: 'Shop and associated settings/owner deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getShopStatsById = async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const result = await getShopStats(shopId);
    res.status(HTTP_STATUS.OK).json({
      message: 'Shop statistics fetched successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const postResetShopCredentials = async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const { password } = req.body;

    if (!password || password.trim().length < 6) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Password must be at least 6 characters long',
      });
    }

    const result = await resetShopCredentials(shopId, password);
    res.status(HTTP_STATUS.OK).json({
      message: 'Shop credentials reset successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// Subscriptions
// ===========================
export const putSubscription = async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const updates = req.body;

    const result = await updateSubscription(shopId, updates);
    res.status(HTTP_STATUS.OK).json({
      message: 'Subscription updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getSubscriptionOverviewData = async (req, res, next) => {
  try {
    const overview = await getSubscriptionOverview();
    res.status(HTTP_STATUS.OK).json({
      message: 'Subscription overview fetched successfully',
      data: overview,
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// Settings
// ===========================
export const getSettings = async (req, res, next) => {
  try {
    const settings = await getGlobalSettings();
    res.status(HTTP_STATUS.OK).json({
      message: 'Global settings fetched successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

export const putSettings = async (req, res, next) => {
  try {
    const updates = req.body;
    const settings = await updateGlobalSettings(updates);
    res.status(HTTP_STATUS.OK).json({
      message: 'Global settings updated successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// Owners
// ===========================
export const getOwners = async (req, res, next) => {
  try {
    const owners = await getAllOwners();
    res.status(HTTP_STATUS.OK).json({
      message: 'Owners fetched successfully',
      data: owners,
    });
  } catch (error) {
    next(error);
  }
};

export const postOwner = async (req, res, next) => {
  try {
    const ownerData = req.body;
    const result = await createOwner(ownerData);
    res.status(HTTP_STATUS.CREATED).json({
      message: 'Owner created successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const putOwner = async (req, res, next) => {
  try {
    const { ownerId } = req.params;
    const updates = req.body;

    const result = await updateOwner(ownerId, updates);
    res.status(HTTP_STATUS.OK).json({
      message: 'Owner updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const postOwnerPasswordReset = async (req, res, next) => {
  try {
    const { ownerId } = req.params;
    const { password } = req.body;

    if (!password || password.trim().length < 6) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Password must be at least 6 characters long',
      });
    }

    const result = await resetOwnerPassword(ownerId, password);
    res.status(HTTP_STATUS.OK).json({
      message: 'Owner password reset successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteOwner = async (req, res, next) => {
  try {
    const { ownerId } = req.params;
    await deleteOwnerService(ownerId);
    res.status(HTTP_STATUS.OK).json({
      message: 'Owner deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// Analytics
// ===========================
export const getAnalyticsData = async (req, res, next) => {
  try {
    const query = {
      days: req.query.days,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const data = await getAnalytics(query);
    res.status(HTTP_STATUS.OK).json({
      message: 'Analytics fetched successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// Notifications
// ===========================
export const getNotificationsData = async (req, res, next) => {
  try {
    const data = await getNotifications();
    res.status(HTTP_STATUS.OK).json({
      message: 'Notifications fetched successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};