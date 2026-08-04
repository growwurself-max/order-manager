import { HTTP_STATUS } from '../utils/constants.js';
import { addIdAlias } from '../utils/responseFormatter.js';
import { getShopSettingsById, updateShopSettings as updateShopSettingsDB } from '../services/supabase.service.js';
import { getShopByIdentifier, validateShopIdFormat } from '../utils/generateShopId.js';

export const getShopSettings = async (req, res, next) => {
  try {
    const shopId = req.user.shopId;
    console.log('Fetching shop settings for shopId:', shopId);

    const shopSettings = await getShopSettingsById(shopId);
    console.log('Shop settings data:', shopSettings);

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
    const shopId = req.user.shopId;
    const updates = req.body;

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