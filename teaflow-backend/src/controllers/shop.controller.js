import { HTTP_STATUS } from '../utils/constants.js';
import { addIdAlias } from '../utils/responseFormatter.js';
import { getShopSettingsById, updateShopSettings as updateShopSettingsDB, getPaymentSettingsForShop } from '../services/supabase.service.js';
import { getShopByIdentifier, validateShopIdFormat, isShopId } from '../utils/generateShopId.js';
import { resolveShopId } from '../utils/resolveShopId.js';
import { uploadImage, deleteImage } from '../services/image.service.js';

export const getShopSettings = async (req, res, next) => {
  try {
    let shopId = req.user.shopId;
    console.log('[getShopSettings] Incoming shopId from user:', shopId);

    // Resolve Shop ID to UUID if needed
    if (shopId && isShopId(shopId)) {
      console.log('[getShopSettings] Shop ID detected, resolving to UUID');
      const resolvedShopId = await resolveShopId(shopId);
      if (!resolvedShopId) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          message: 'Shop not found',
        });
      }
      shopId = resolvedShopId;
      console.log('[getShopSettings] Resolved UUID:', shopId);
    }

    const shopSettings = await getShopSettingsById(shopId);
    console.log('[getShopSettings] Shop settings data:', shopSettings);

    if (!shopSettings) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Shop settings not found',
      });
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Shop settings fetched successfully',
      data: addIdAlias(shopSettings),
    });
  } catch (error) {
    next(error);
  }
};

export const updateShopSettings = async (req, res, next) => {
  try {
    let shopId = req.user.shopId;
    console.log('[updateShopSettings] Incoming shopId from user:', shopId);

    // Resolve Shop ID to UUID if needed
    if (shopId && isShopId(shopId)) {
      console.log('[updateShopSettings] Shop ID detected, resolving to UUID');
      const resolvedShopId = await resolveShopId(shopId);
      if (!resolvedShopId) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          message: 'Shop not found',
        });
      }
      shopId = resolvedShopId;
      console.log('[updateShopSettings] Resolved UUID:', shopId);
    }

    const body = req.body;

    // Strict whitelist: only owner-editable fields may be written.
    // Unknown keys (e.g., owner_id, subscription_plan, is_active) are dropped.
    const updates = {};
    if (body.shopName !== undefined) updates.shop_name = body.shopName;
    if (body.address !== undefined) updates.address = body.address;
    if (body.contact !== undefined) updates.contact = body.contact;
    if (body.settings !== undefined) updates.settings = body.settings;
    if (body.branding !== undefined) updates.branding = body.branding;

    if (Object.keys(updates).length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'No valid settings provided',
      });
    }

    const shopSettings = await updateShopSettingsDB(shopId, updates);

    if (!shopSettings) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Shop settings not found',
      });
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Shop settings updated successfully',
      data: addIdAlias(shopSettings),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Validate Shop ID and return shop details
 * Used for customer entry via Shop ID
 */
export const validateShopId = async (req, res, next) => {
  try {
    const { shopId } = req.params;

    // Validate format
    if (!validateShopIdFormat(shopId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Invalid Shop ID format. Must be in format S#### (e.g., S1001)',
      });
    }

    // Fetch shop by identifier
    const shop = await getShopByIdentifier(shopId);

    if (!shop) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Shop not found with this Shop ID',
      });
    }

    // Check if shop is active
    if (shop.subscription_status === 'suspended' || shop.subscription_status === 'expired') {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: 'This shop is currently not accepting orders',
      });
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Shop ID validated successfully',
      data: {
        id: shop.id,
        shopName: shop.shop_name,
        shopIdentifier: shop.shop_identifier,
        customerUrl: shop.customer_url,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get shop status (public endpoint for customers)
 * Returns shop open/closed status and worker availability
 */
export const getShopStatus = async (req, res, next) => {
  try {
    const { shopId } = req.params;
    let resolvedShopId = shopId;

    // Resolve Shop ID to UUID if needed
    if (shopId && isShopId(shopId)) {
      resolvedShopId = await resolveShopId(shopId);
      if (!resolvedShopId) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          message: 'Shop not found',
        });
      }
    }

    const shopSettings = await getShopSettingsById(resolvedShopId);

    if (!shopSettings) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Shop settings not found',
      });
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Shop status fetched successfully',
      data: {
        isOpenForOrders: shopSettings.is_open_for_orders !== false, // Default to true if null
        workersAvailable: shopSettings.workers_available !== false, // Default to true if null
        shopName: shopSettings.shop_name,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update shop open/closed status (owner only)
 */
export const updateShopOpenStatus = async (req, res, next) => {
  try {
    let shopId = req.user.shopId;

    // Resolve Shop ID to UUID if needed
    if (shopId && isShopId(shopId)) {
      const resolvedShopId = await resolveShopId(shopId);
      if (!resolvedShopId) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          message: 'Shop not found',
        });
      }
      shopId = resolvedShopId;
    }

    const { isOpenForOrders } = req.body;

    if (typeof isOpenForOrders !== 'boolean') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'isOpenForOrders must be a boolean',
      });
    }

    const shopSettings = await updateShopSettingsDB(shopId, {
      is_open_for_orders: isOpenForOrders,
    });

    if (!shopSettings) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Shop settings not found',
      });
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Shop open status updated successfully',
      data: {
        isOpenForOrders: shopSettings.is_open_for_orders,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update worker availability status (owner only)
 */
export const updateWorkerAvailability = async (req, res, next) => {
  try {
    let shopId = req.user.shopId;

    // Resolve Shop ID to UUID if needed
    if (shopId && isShopId(shopId)) {
      const resolvedShopId = await resolveShopId(shopId);
      if (!resolvedShopId) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          message: 'Shop not found',
        });
      }
      shopId = resolvedShopId;
    }

    const { workersAvailable } = req.body;

    if (typeof workersAvailable !== 'boolean') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'workersAvailable must be a boolean',
      });
    }

    const shopSettings = await updateShopSettingsDB(shopId, {
      workers_available: workersAvailable,
    });

    if (!shopSettings) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Shop settings not found',
      });
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Worker availability updated successfully',
      data: {
        workersAvailable: shopSettings.workers_available,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// Payment Settings (Owner per-shop)
// ===========================

export const getPaymentSettings = async (req, res, next) => {
  try {
    let shopId = req.user.shopId;
    if (shopId && isShopId(shopId)) {
      const resolved = await resolveShopId(shopId);
      if (!resolved) return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Shop not found' });
      shopId = resolved;
    }
    const shop = await getShopSettingsById(shopId);
    if (!shop) return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Shop settings not found' });
    const payment = getPaymentSettingsForShop(shop);
    res.status(HTTP_STATUS.OK).json({
      message: 'Payment settings fetched successfully',
      data: { shopId: shop.id, shopIdentifier: shop.shop_identifier, shopName: shop.shop_name, ...payment },
    });
  } catch (error) { next(error); }
};

export const updatePaymentSettings = async (req, res, next) => {
  try {
    let shopId = req.user.shopId;
    if (shopId && isShopId(shopId)) {
      const resolved = await resolveShopId(shopId);
      if (!resolved) return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Shop not found' });
      shopId = resolved;
    }
    const { payNowEnabled, payLaterEnabled, upiQrEnabled, paymentUpiVpaId, upiVpaId } = req.body;
    const rawVpa = paymentUpiVpaId !== undefined ? paymentUpiVpaId : upiVpaId;
    const updates = {};
    if (payNowEnabled !== undefined) {
      if (typeof payNowEnabled !== 'boolean') return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'payNowEnabled must be a boolean' });
      updates.payment_pay_now_enabled = payNowEnabled;
    }
    if (payLaterEnabled !== undefined) {
      if (typeof payLaterEnabled !== 'boolean') return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'payLaterEnabled must be a boolean' });
      updates.payment_pay_later_enabled = payLaterEnabled;
    }
    if (upiQrEnabled !== undefined) {
      if (typeof upiQrEnabled !== 'boolean') return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'upiQrEnabled must be a boolean' });
      updates.payment_upi_qr_enabled = upiQrEnabled;
    }
    if (rawVpa !== undefined) {
      if (typeof rawVpa !== 'string') return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'paymentUpiVpaId must be a string' });
      const vpa = rawVpa.trim();
      if (vpa.length > 100) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'UPI VPA too long (max 100 chars)' });
      // Validate format: e.g. shop@upi, 9876543210@paytm — allow lowercase/numbers/dots/hyphens before @, and letters after
      if (vpa !== '' && !/^[\w.\-]{2,64}@[a-zA-Z0-9.\-]{2,64}$/.test(vpa)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Invalid UPI VPA format. Example: shop@upi or 9876543210@paytm' });
      }
      updates.payment_upi_vpa_id = vpa.toLowerCase();
    }
    if (Object.keys(updates).length === 0) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'No valid payment settings provided' });
    const updated = await updateShopSettingsDB(shopId, updates);
    if (!updated) return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Shop settings not found' });
    const payment = getPaymentSettingsForShop(updated);
    res.status(HTTP_STATUS.OK).json({ message: 'Payment settings updated successfully', data: payment });
  } catch (error) { next(error); }
};

export const uploadPaymentQr = async (req, res, next) => {
  try {
    let shopId = req.user.shopId;
    if (shopId && isShopId(shopId)) {
      const resolved = await resolveShopId(shopId);
      if (!resolved) return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Shop not found' });
      shopId = resolved;
    }
    const { imageData } = req.body;
    if (!imageData || typeof imageData !== 'string') return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'imageData is required (base64 image)' });
    const shop = await getShopSettingsById(shopId);
    if (!shop) return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Shop not found' });
    if (shop.payment_upi_qr_image_url) await deleteImage(shop.payment_upi_qr_image_url);
    const imageUrl = await uploadImage(imageData, `teaflow/payment-qr/${shopId}`);
    const updated = await updateShopSettingsDB(shopId, { payment_upi_qr_image_url: imageUrl });
    const payment = getPaymentSettingsForShop(updated);
    res.status(HTTP_STATUS.OK).json({ message: 'QR image uploaded successfully', data: payment });
  } catch (error) {
    if (error.message && error.message.includes('Image')) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message });
    next(error);
  }
};

export const removePaymentQr = async (req, res, next) => {
  try {
    let shopId = req.user.shopId;
    if (shopId && isShopId(shopId)) {
      const resolved = await resolveShopId(shopId);
      if (!resolved) return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Shop not found' });
      shopId = resolved;
    }
    const shop = await getShopSettingsById(shopId);
    if (!shop) return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Shop not found' });
    if (shop.payment_upi_qr_image_url) await deleteImage(shop.payment_upi_qr_image_url);
    const updated = await updateShopSettingsDB(shopId, { payment_upi_qr_image_url: '' });
    const payment = getPaymentSettingsForShop(updated);
    res.status(HTTP_STATUS.OK).json({ message: 'QR image removed successfully', data: payment });
  } catch (error) { next(error); }
};

export const getPaymentOptions = async (req, res, next) => {
  try {
    const rawShopId = req.params.shopId || req.query.shopId;
    if (!rawShopId) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Shop ID is required' });
    let resolvedShopId = rawShopId;
    if (isShopId(rawShopId)) {
      resolvedShopId = await resolveShopId(rawShopId);
      if (!resolvedShopId) return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Shop not found' });
    } else {
      const maybeResolved = await resolveShopId(rawShopId);
      if (maybeResolved) resolvedShopId = maybeResolved;
    }
    const shop = await getShopSettingsById(resolvedShopId);
    if (!shop) return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Shop not found' });
    const payment = getPaymentSettingsForShop(shop);
    const response = {
      shopId: shop.id,
      shopIdentifier: shop.shop_identifier,
      shopName: shop.shop_name,
      payNowEnabled: payment.payNowEnabled,
      payLaterEnabled: payment.payLaterEnabled,
      upiQrEnabled: payment.upiQrEnabled,
      qrImageUrl: payment.upiQrEnabled ? payment.qrImageUrl : '',
      upiVpaId: payment.upiVpaId || '',
    };
    res.status(HTTP_STATUS.OK).json({ message: 'Payment options fetched successfully', data: response });
  } catch (error) { next(error); }
};