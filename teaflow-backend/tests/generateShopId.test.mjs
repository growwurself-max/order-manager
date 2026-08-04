import assert from 'node:assert/strict';
import { generateShopIdSequence } from '../src/utils/generateShopId.js';

const test = async () => {
  const ids = await generateShopIdSequence(3);
  assert.ok(Array.isArray(ids));
  assert.equal(ids.length, 3);
  assert.match(ids[0], /^S\d{4}$/);
  assert.match(ids[1], /^S\d{4}$/);
  assert.match(ids[2], /^S\d{4}$/);
  console.log('shop id sequence ok', ids);
};

test().catch((error) => {
  console.error(error);
  process.exit(1);
});
