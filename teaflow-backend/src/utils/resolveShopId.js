import { getShopByIdentifier, validateShopIdFormat } from './generateShopId.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (value) => typeof value === 'string' && UUID_REGEX.test(value);

export const resolveShopId = async (shopIdentifier) => {
  if (!shopIdentifier || typeof shopIdentifier !== 'string') {
    return null;
  }

  const normalized = shopIdentifier.trim();
  if (!normalized) {
    return null;
  }

  if (isUuid(normalized)) {
    return normalized;
  }

  if (!validateShopIdFormat(normalized)) {
    return normalized;
  }

  const shop = await getShopByIdentifier(normalized);
  if (!shop) {
    return null;
  }

  return shop.id || normalized;
};
