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

// Only the columns needed to derive an identifier. Selecting `*` here would
// ship every settings/branding/payment blob for the whole platform.
const IDENTIFIER_COLUMNS = 'id, shop_identifier, settings';

/**
 * Generate a unique sequential Shop ID in format: S#### (e.g., S1001, S1002)
 * @returns {Promise<string>} Unique shop identifier
 */
export async function generateShopId() {
  const prefix = 'S';

  // Fetch only the identifier columns to find the highest number.
  const { data, error } = await supabase
    .from('shop_settings')
    .select(IDENTIFIER_COLUMNS)
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
 *
 * Performance: this runs on every public (customer) request, so it must never
 * scan the whole shop_settings table. `shop_identifier` is a UNIQUE indexed
 * column, so we hit that index directly. Legacy shops that only stored the
 * identifier inside the `settings` JSONB blob are resolved with a small set of
 * indexed jsonb lookups, in parallel.
 *
 * @param {string} shopIdentifier - Shop ID (e.g., S1001)
 * @returns {Promise<Object|null>} Shop data or null
 */
export async function getShopByIdentifier(shopIdentifier) {
  if (shopIdentifier === undefined || shopIdentifier === null) return null;

  const trimmed = String(shopIdentifier).trim();
  if (!trimmed) return null;

  // Guard against PostgREST filter injection: identifiers are always S####
  // (see validateShopIdFormat) but this function is also reachable directly.
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(trimmed)) return null;

  // Fast path — indexed UNIQUE column lookup (one tiny row).
  const { data: direct, error: directError } = await supabase
    .from('shop_settings')
    .select('*')
    .eq('shop_identifier', trimmed)
    .limit(1);

  if (directError) {
    throw new Error(`Error fetching shop by identifier: ${directError.message}`);
  }

  if (direct && direct.length > 0) {
    return {
      ...direct[0],
      shop_identifier: getShopIdentifierFromRow(direct[0]),
    };
  }

  // Legacy fallback — identifier stored inside the settings JSONB column.
  const legacyKeys = ['shop_identifier', 'shopId', 'shop_id', 'identifier'];
  const legacyResults = await Promise.all(
    legacyKeys.map((key) =>
      supabase
        .from('shop_settings')
        .select('*')
        .eq(`settings->>${key}`, trimmed)
        .limit(1)
    )
  );

  for (const result of legacyResults) {
    if (result.error) continue;
    const row = result.data && result.data[0];
    if (row) {
      return {
        ...row,
        shop_identifier: getShopIdentifierFromRow(row),
      };
    }
  }

  return null;
}