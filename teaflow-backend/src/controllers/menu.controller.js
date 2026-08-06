import { HTTP_STATUS } from '../utils/constants.js';
import { addIdAlias } from '../utils/responseFormatter.js';
import {
  createMenuItem as createMenuItemService,
  getMenuByShopId,
  getMenuById,
  updateMenuItem as updateMenuItemService,
  deleteMenuItem as deleteMenuItemService,
  getFirstActiveShop,
} from '../services/supabase.service.js';
import { uploadImage, deleteImage } from '../services/image.service.js';
import { menuItemToDB, toSnakeCase } from '../utils/mapping.js';
import { getShopByIdentifier, validateShopIdFormat, isShopId } from '../utils/generateShopId.js';
import { resolveShopId } from '../utils/resolveShopId.js';
import { AppError } from '../utils/AppError.js';

export const createMenu = async (req, res, next) => {
  try {
    let shopId = req.user.shopId;
    console.log('[createMenu] Incoming shopId from user:', shopId);

    // Resolve Shop ID to UUID if needed
    if (shopId && isShopId(shopId)) {
      console.log('[createMenu] Shop ID detected, resolving to UUID');
      const resolvedShopId = await resolveShopId(shopId);
      if (!resolvedShopId) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          message: 'Shop not found',
        });
      }
      shopId = resolvedShopId;
      console.log('[createMenu] Resolved UUID:', shopId);
    }

    const { imageData, ...menuData } = req.body;
    console.log('[createMenu] Image data present:', !!imageData);
    console.log('[createMenu] Image data type:', typeof imageData);
    console.log('[createMenu] Image data length:', imageData?.length || 0);

    if (imageData) {
      try {
        console.log('[createMenu] Starting image upload...');
        menuData.imageUrl = await uploadImage(imageData, `teaflow/menu/${shopId}`);
        console.log('[createMenu] Image upload successful:', menuData.imageUrl);
      } catch (err) {
        console.error('[createMenu] Image upload error:', err);
        console.error('[createMenu] Error details:', JSON.stringify(err, null, 2));
        throw new AppError(`Failed to upload image: ${err.message}`, HTTP_STATUS.BAD_REQUEST);
      }
    }

    // Map camelCase from frontend to snake_case for DB
    const dbData = toSnakeCase(menuData, menuItemToDB);

    const menuItem = await createMenuItemService(shopId, dbData);

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Menu item created successfully',
      data: addIdAlias(menuItem),
    });
  } catch (error) {
    console.error('[createMenu] General error:', error);
    next(error);
  }
};

export const getMenu = async (req, res, next) => {
  try {
    let shopId = req.user?.shopId;
    
    if (!shopId) {
      shopId = req.query.shopId;
      
      if (!shopId) {
        const shop = await getFirstActiveShop();
        if (!shop) {
          return res.status(HTTP_STATUS.NOT_FOUND).json({
            message: 'No active shop found',
          });
        }
        shopId = shop.id;
      }
    }

    const resolvedShopId = await resolveShopId(shopId);
    if (!resolvedShopId) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Shop not found with this Shop ID',
      });
    }
    
    const menuItems = await getMenuByShopId(resolvedShopId);

    res.status(HTTP_STATUS.OK).json({
      message: 'Menu fetched successfully',
      data: addIdAlias(menuItems),
      count: menuItems.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const menuItem = await getMenuById(id);

    if (!menuItem) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Menu item not found',
      });
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Menu item fetched successfully',
      data: addIdAlias(menuItem),
    });
  } catch (error) {
    next(error);
  }
};

export const updateMenu = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { imageData, removeImage, ...updates } = req.body;
    console.log('[updateMenu] Updating menu item:', id);
    console.log('[updateMenu] Image data present:', !!imageData);
    console.log('[updateMenu] Remove image flag:', removeImage);

    const existingItem = await getMenuById(id);
    if (!existingItem) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Menu item not found',
      });
    }

    if (removeImage) {
      if (existingItem.image_url) {
        console.log('[updateMenu] Deleting existing image:', existingItem.image_url);
        await deleteImage(existingItem.image_url);
      }
      updates.imageUrl = null;
    } else if (imageData) {
      if (existingItem.image_url) {
        console.log('[updateMenu] Deleting old image before upload:', existingItem.image_url);
        await deleteImage(existingItem.image_url);
      }
      try {
        console.log('[updateMenu] Starting new image upload...');
        updates.imageUrl = await uploadImage(
          imageData,
          `teaflow/menu/${existingItem.shop_id}`
        );
        console.log('[updateMenu] New image upload successful:', updates.imageUrl);
      } catch (err) {
        console.error('[updateMenu] Image upload error:', err);
        console.error('[updateMenu] Error details:', JSON.stringify(err, null, 2));
        throw new AppError(`Failed to upload image: ${err.message}`, HTTP_STATUS.BAD_REQUEST);
      }
    }

    // Map camelCase from frontend to snake_case for DB
    const dbUpdates = toSnakeCase(updates, menuItemToDB);

    const menuItem = await updateMenuItemService(id, dbUpdates);

    if (!menuItem) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Menu item not found',
      });
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Menu item updated successfully',
      data: addIdAlias(menuItem),
    });
  } catch (error) {
    console.error('[updateMenu] General error:', error);
    next(error);
  }
};

export const deleteMenu = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingItem = await getMenuById(id);
    if (existingItem?.image_url) {
      await deleteImage(existingItem.image_url);
    }

    await deleteMenuItemService(id);

    res.status(HTTP_STATUS.OK).json({
      message: 'Menu item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
