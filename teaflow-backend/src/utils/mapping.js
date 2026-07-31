/**
 * Mapping utility for converting between camelCase (frontend API) 
 * and snake_case (Supabase/PostgreSQL) field names.
 */

// Menu item field mappings
export const menuItemToDB = {
  basePrice: 'base_price',
  isAvailable: 'is_available',
  displayOrder: 'display_order',
  imageUrl: 'image_url',
};

export const menuItemFromDB = {
  base_price: 'basePrice',
  is_available: 'isAvailable',
  display_order: 'displayOrder',
  image_url: 'imageUrl',
};

// Worker field mappings
export const workerToDB = {
  isActive: 'is_active',
};

export const workerFromDB = {
  is_active: 'isActive',
};

// Shop settings field mappings
export const shopSettingsToDB = {
  shopName: 'shop_name',
  isActive: 'is_active',
  orderPrefix: 'orderPrefix',
  allowPreorder: 'allowPreorder',
  taxRate: 'taxRate',
  primaryColor: 'primaryColor',
};

export const shopSettingsFromDB = {
  shop_name: 'shopName',
  is_active: 'isActive',
};

/**
 * Convert an object's keys from camelCase to snake_case using a mapping
 */
export const toSnakeCase = (obj, mapping) => {
  const result = { ...obj };
  for (const [camel, snake] of Object.entries(mapping)) {
    if (camel in result) {
      result[snake] = result[camel];
      delete result[camel];
    }
  }
  return result;
};

/**
 * Convert an object's keys from snake_case to camelCase using a mapping
 */
export const toCamelCase = (obj, mapping) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = { ...obj };
  for (const [snake, camel] of Object.entries(mapping)) {
    if (snake in result) {
      result[camel] = result[snake];
      delete result[snake];
    }
  }
  return result;
};

