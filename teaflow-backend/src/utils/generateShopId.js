import { supabase } from '../config/supabase.js';

/**
 * Generate a unique Shop ID in format: SHA#### (e.g., SHA1001, SHA1123)
 * @returns {Promise<string>} Unique shop identifier
 */
export async function generateShopId() {
  const prefix = 'SHA';
  let shopId;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 100;

  while (!isUnique && attempts < maxAttempts) {
    // Generate a random 4-digit number (1000-9999)
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    shopId = `${prefix}${randomNum}`;

    // Check if this ID already exists
    const { data, error } = await supabase
      .from('shop_settings')
      .select('shop_identifier')
      .eq('shop_identifier', shopId)
      .maybeSingle();

    if (error) {
      throw new Error(`Error checking shop ID uniqueness: ${error.message}`);
    }

    if (!data) {
      isUnique = true;
    }

    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique shop ID after maximum attempts');
  }

  return shopId;
}

/**
 * Validate shop ID format
 * @param {string} shopId - Shop ID to validate
 * @returns {boolean} True if valid format
 */
export function validateShopIdFormat(shopId) {
  // Format: SHA followed by exactly 4 digits
  return /^SHA\d{4}$/.test(shopId);
}

/**
 * Get shop by shop identifier
 * @param {string} shopIdentifier - Shop ID (e.g., SHA1001)
 * @returns {Promise<Object|null>} Shop data or null
 */
export async function getShopByIdentifier(shopIdentifier) {
  const { data, error } = await supabase
    .from('shop_settings')
    .select('*')
    .eq('shop_identifier', shopIdentifier)
    .maybeSingle();

  if (error) {
    throw new Error(`Error fetching shop by identifier: ${error.message}`);
  }

  return data;
}