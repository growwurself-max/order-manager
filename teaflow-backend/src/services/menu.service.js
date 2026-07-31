import {
  createMenuItem as createMenuItemDB,
  getMenuByShopId as getMenuByShopIdDB,
  getMenuById as getMenuByIdDB,
  updateMenuItem as updateMenuItemDB,
  deleteMenuItem as deleteMenuItemDB,
} from '../services/supabase.service.js';

export const createMenuItem = async (shopId, menuData) => {
  const item = await createMenuItemDB(shopId, menuData);
  return item;
};

export const getMenuByShopId = async (shopId) => {
  const items = await getMenuByShopIdDB(shopId);
  return items;
};

export const getMenuById = async (menuItemId) => {
  const item = await getMenuByIdDB(menuItemId);
  return item;
};

export const updateMenuItem = async (menuItemId, updates) => {
  const item = await updateMenuItemDB(menuItemId, updates);
  return item;
};

export const deleteMenuItem = async (menuItemId) => {
  await deleteMenuItemDB(menuItemId);
};