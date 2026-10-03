import assert from 'node:assert/strict';
import { validateShopIdFormat, isShopId, getShopIdentifierFromRow } from '../src/utils/generateShopId.js';
import { resolveShopId, isUuid, clearShopIdCache } from '../src/utils/resolveShopId.js';

const test = async () => {
  // validateShopIdFormat
  assert.equal(validateShopIdFormat('S1001'), true);
  assert.equal(validateShopIdFormat('SHA1001'), true);
  assert.equal(validateShopIdFormat('S100'), false);
  assert.equal(validateShopIdFormat('S1'), false);
  assert.equal(validateShopIdFormat('X1001'), false);
  assert.equal(validateShopIdFormat('S1001abc'), false);
  assert.equal(validateShopIdFormat(''), false);
  assert.equal(validateShopIdFormat(null), false);

  // isShopId (also guards non-string input)
  assert.equal(isShopId('S1002'), true);
  assert.equal(isShopId('  S1003  '), true);
  assert.equal(isShopId('ordermanager-u5vu.onrender.com'), false);
  assert.equal(isShopId(42), false);
  assert.equal(isShopId(undefined), false);

  // getShopIdentifierFromRow (reads identifier from column or settings JSON)
  assert.equal(getShopIdentifierFromRow({ shop_identifier: 'S1004' }), 'S1004');
  assert.equal(getShopIdentifierFromRow({ settings: { shop_identifier: 'S1005' } }), 'S1005');
  assert.equal(getShopIdentifierFromRow({ settings: JSON.stringify({ shopId: 'S1006' }) }), 'S1006');
  assert.equal(getShopIdentifierFromRow({}), null);
  assert.equal(getShopIdentifierFromRow(null), null);

  // isUuid
  const uuid = '550e8400-e29b-41d4-a716-446655440000';
  assert.equal(isUuid(uuid), true);
  assert.equal(isUuid('S1001'), false);
  assert.equal(isUuid(123), false);

  // resolveShopId short-circuits without touching the database:
  // a UUID passes straight through and invalid identifiers are rejected.
  assert.equal(await resolveShopId(uuid), uuid);
  assert.equal(await resolveShopId(`  ${uuid}  `), uuid);
  assert.equal(await resolveShopId('S100'), null);
  assert.equal(await resolveShopId(''), null);
  assert.equal(await resolveShopId(null), null);
  assert.equal(await resolveShopId(undefined), null);
  assert.equal(await resolveShopId(12345), null);

  // Cache invalidation helpers must be safe to call with no arguments.
  clearShopIdCache();
  clearShopIdCache('S1001');

  console.log('shop id helpers ok');
};

test().catch((error) => {
  console.error(error);
  process.exit(1);
});
