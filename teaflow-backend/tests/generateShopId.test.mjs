import assert from 'node:assert/strict';
import { validateShopIdFormat, isShopId, getShopIdentifierFromRow } from '../src/utils/generateShopId.js';

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

  console.log('shop id helpers ok');
};

test().catch((error) => {
  console.error(error);
  process.exit(1);
});
