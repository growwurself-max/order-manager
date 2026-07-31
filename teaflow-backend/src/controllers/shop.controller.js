import { HTTP_STATUS } from '../utils/constants.js';
import { addIdAlias } from '../utils/responseFormatter.js';
import { getShopSettingsById, updateShopSettings as updateShopSettingsDB } from '../services/supabase.service.js';

export const getShopSettings = async (req, res, next) => {
  try {
    const shopId = req.user.shopId;

    const shopSettings = await getShopSettingsById(shopId);

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
