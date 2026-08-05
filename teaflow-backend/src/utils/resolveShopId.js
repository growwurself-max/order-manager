import { getShopByIdentifier, validateShopIdFormat, isShopId } from './generateShopId.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (value) => typeof value === 'string' && UUID_REGEX.test(value);

export const resolveShopId = async (shopIdentifier) => {
  console.log('[resolveShopId] Incoming Shop ID:', shopIdentifier);

  if (!shopIdentifier || typeof shopIdentifier !== 'string') {
    console.log('[resolveShopId] Invalid shopIdentifier');
    return null;
  }

  const normalized = shopIdentifier.trim();
  if (!normalized) {
    console.log('[resolveShopId] Empty normalized shopIdentifier');
    return null;
  }

  // If already a UUID, return it
  if (isUuid(normalized)) {
    console.log('[resolveShopId] Already UUID, returning:', normalized);
    return normalized;
  }

  // If valid Shop ID format (S####), resolve to UUID
  if (validateShopIdFormat(normalized)) {
    console.log('[resolveShopId] Valid Shop ID format, resolving to UUID');
    const shop = await getShopByIdentifier(normalized);
    if (!shop) {
      console.log('[resolveShopId] Shop not found for identifier:', normalized);
      return null;
    }

    const resolvedUuid = shop.id;
    console.log('[resolveShopId] Resolved UUID:', resolvedUuid);
    return resolvedUuid;
  }

  // Invalid format - return null instead of passing through
  console.log('[resolveShopId] Invalid Shop ID format:', normalized);
  return null;
};
