import { supabase } from '../config/supabase.js';

const getSettingsObject = (settings) => {
  if (!settings) return {};
  if (typeof settings === 'object' && !Array.isArray(settings)) return settings;
  if (typeof settings === 'string') {
    try {
      return JSON.parse(settings);
    } catch {
      return {};
    }
  }
  return {};
};

export function getShopIdentifierFromRow(shop) {
  if (!shop) return null;

  if (typeof shop.shop_identifier === 'string' && shop.shop_identifier.trim()) {
    return shop.shop_identifier;
  }

  const settings = getSettingsObject(shop.settings);
  const identifier = settings.shop_identifier || settings.shopId || settings.shop_id || settings.identifier;

  if (typeof identifier === 'string' && identifier.trim()) {
    return identifier;
  }

  return null;
}

/**
 * Check if a value is a Shop ID (not UUID)
 * @param {string} value - Value to check
 * @returns {boolean} True if it's a Shop ID format
 */
export function isShopId(value) {
  if (!value || typeof value !== 'string') return false;
  return validateShopIdFormat(value.trim());
}

/**
 * Generate a unique sequential Shop ID in format: S#### (e.g., S1001, S1002)
 * @returns {Promise<string>} Unique shop identifier
 */
export async function generateShopId() {
  console.log('=== GENERATE SHOP ID START ===');
  const prefix = 'S';
  
  // Fetch all existing shop IDs to find the highest number
  const { data, error } = await supabase
    .from('shop_settings')
    .select('*')
    .limit(1000);

  if (error) {
    console.error('Error fetching existing shops:', error);
    throw new Error(`Error fetching existing shops: ${error.message}`);
  }

  // Extract all existing shop IDs and find the highest number
  const existingIds = data
    ?.map((row) => getShopIdentifierFromRow(row))
    .filter((id) => id && id.startsWith(prefix))
    .map((id) => parseInt(id.substring(prefix.length)))
    .filter((num) => !isNaN(num)) || [];

  const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 1000;
  const nextId = maxId + 1;
  const shopId = `${prefix}${nextId}`;
  
  console.log(`Generated sequential shop ID: ${shopId} (previous max: ${maxId})`);
  console.log('=== GENERATE SHOP ID SUCCESS ===');
  return shopId;
}

/**
 * Validate shop ID format
 * @param {string} shopId - Shop ID to validate
 * @returns {boolean} True if valid format
 */
export function validateShopIdFormat(shopId) {
  // Format: S or SHA followed by 4 or more digits (e.g., S1001, SHA1001)
  return /^S(HA)?\d{4,}$/.test(shopId);
}

/**
 * Get shop by shop identifier
 * @param {string} shopIdentifier - Shop ID (e.g., S1001)
 * @returns {Promise<Object|null>} Shop data or null
 */
export async function getShopByIdentifier(shopIdentifier) {
  const { data, error } = await supabase
    .from('shop_settings')
    .select('*')
    .limit(1000);

  if (error) {
    throw new Error(`Error fetching shop by identifier: ${error.message}`);
  }

  const matchingShop = data?.find((row) => getShopIdentifierFromRow(row) === shopIdentifier);
  if (!matchingShop) {
    return null;
  }

  return {
    ...matchingShop,
    shop_identifier: getShopIdentifierFromRow(matchingShop),
  };
}