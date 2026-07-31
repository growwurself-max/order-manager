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
import { menuItemToDB, toSnakeCase } from '../utils/mapping.js';

export const createMenu = async (req, res, next) => {
  try {
    const shopId = req.user.shopId;
    const menuData = req.body;

    // Map camelCase from frontend to snake_case for DB
    const dbData = toSnakeCase(menuData, menuItemToDB);

    const menuItem = await createMenuItemService(shopId, dbData);

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Menu item created successfully',
      data: addIdAlias(menuItem),
    });
  } catch (error) {
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
    
    const menuItems = await getMenuByShopId(shopId);

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
    const updates = req.body;

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
    next(error);
  }
};

export const deleteMenu = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deleteMenuItemService(id);

    res.status(HTTP_STATUS.OK).json({
      message: 'Menu item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
