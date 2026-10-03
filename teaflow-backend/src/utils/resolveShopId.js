import { getShopByIdentifier, validateShopIdFormat } from './generateShopId.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (value) => typeof value === 'string' && UUID_REGEX.test(value);

// ---------------------------------------------------------------------------
// Shop identifier -> UUID resolution cache
//
// Every public customer request (menu, shop status, payment options, active
// orders, place order) resolves the S#### shop id from the URL. Without a cache
// that means one extra Supabase round trip per request. Shop identifiers are
// immutable and assigned at creation time, so a short TTL is enough to remove
// almost all of those lookups. The cache is invalidated explicitly whenever a
// shop is created, renamed or deleted.
// ---------------------------------------------------------------------------
const SHOP_ID_CACHE_TTL_MS = Number(process.env.SHOP_ID_CACHE_TTL_MS) || 5 * 60 * 1000;
const SHOP_ID_CACHE_MAX_ENTRIES = 500;

const shopIdCache = new Map();

const readCache = (key) => {
  const entry = shopIdCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    shopIdCache.delete(key);
    return undefined;
  }
  // Refresh LRU position.
  shopIdCache.delete(key);
  shopIdCache.set(key, entry);
  return entry.value;
};

const writeCache = (key, value) => {
  if (shopIdCache.size >= SHOP_ID_CACHE_MAX_ENTRIES) {
    const oldestKey = shopIdCache.keys().next().value;
    if (oldestKey !== undefined) shopIdCache.delete(oldestKey);
  }
  shopIdCache.set(key, { value, expiresAt: Date.now() + SHOP_ID_CACHE_TTL_MS });
};

/**
 * Drop cached identifier -> UUID mappings.
 * @param {string} [shopIdentifier] - Clear only this identifier (or all when omitted).
 */
export const clearShopIdCache = (shopIdentifier) => {
  if (!shopIdentifier) {
    shopIdCache.clear();
    return;
  }
  shopIdCache.delete(String(shopIdentifier).trim());
};

export const resolveShopId = async (shopIdentifier) => {
  if (!shopIdentifier || typeof shopIdentifier !== 'string') {
    return null;
  }

  const normalized = shopIdentifier.trim();
  if (!normalized) {
    return null;
  }

  // If already a UUID, return it
  if (isUuid(normalized)) {
    return normalized;
  }

  // Only valid Shop ID format (S#### / SHA####) needs a database lookup.
  if (!validateShopIdFormat(normalized)) {
    return null;
  }

  const cached = readCache(normalized);
  if (cached !== undefined) {
    return cached;
  }

  const shop = await getShopByIdentifier(normalized);
  if (!shop) {
    return null;
  }

  // Defensive: the identifier must round-trip, otherwise a legacy fallback match
  // on a different key could leak another tenant's shop.
  if (getIdentifierOf(shop) !== normalized) {
    return null;
  }

  writeCache(normalized, shop.id);
  return shop.id;
};

function getIdentifierOf(shop) {
  const identifier = shop?.shop_identifier;
  if (identifier === undefined || identifier === null) return null;
  return String(identifier).trim();
}