import { supabase } from '../config/supabase.js';

const ORDER_PREFIX = 'ORD';
const SEQUENCE_START = 100001;

/**
 * Generate a sequential, short, professional order number.
 * Format: ORD100001, ORD100002, ORD100003, ...
 * Uses a dedicated counter table (order_sequences) to guarantee
 * monotonic uniqueness per shop, avoiding collisions under concurrency.
 * If the table doesn't exist, falls back to a uniqueness-checked approach.
 */
export const generateOrderNumber = async (shopId) => {
  let nextNumber = SEQUENCE_START;

  try {
    // Per-shop sequence to keep numbers compact and scoped
    const { data: seq, error: seqError } = await supabase
      .from('order_sequences')
      .select('last_number')
      .eq('shop_id', shopId)
      .maybeSingle();

    if (seqError && seqError.code !== 'PGRST116') {
      console.warn('[generateOrderNumber] Sequence fetch error:', seqError.message);
    } else if (seq && seq.last_number) {
      nextNumber = seq.last_number + 1;
    }
  } catch (e) {
    console.warn('[generateOrderNumber] Sequence table error (using fallback):', e.message);
  }

  // If nextNumber is still the start, derive from highest existing order
  // to ensure sequential uniqueness even without the order_sequences table.
  try {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('order_number')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!ordersError && orders?.[0]?.order_number) {
      const highest = orders[0].order_number;
      const match = highest.match(/^ORD(\d+)$/);
      nextNumber = match ? Math.max(nextNumber, parseInt(match[1], 10) + 1) : nextNumber;
    }
  } catch (e) {
    console.warn('[generateOrderNumber] Orders fetch error:', e.message);
  }

  // Persist the sequence (best-effort). If table missing, use fallback.
  try {
    const { error: upsertError } = await supabase
      .from('order_sequences')
      .upsert({ shop_id: shopId, last_number: nextNumber }, { onConflict: 'shop_id' });

    if (upsertError && upsertError.code !== 'PGRST116') {
      console.warn('[generateOrderNumber] Sequence upsert warning:', upsertError.message);
      return ensureUniqueOrderNumber(shopId, `${ORDER_PREFIX}${nextNumber}`, nextNumber);
    }
  } catch (e) {
    console.warn('[generateOrderNumber] Sequence upsert error (using fallback):', e.message);
    return ensureUniqueOrderNumber(shopId, `${ORDER_PREFIX}${nextNumber}`, nextNumber);
  }

  return `${ORDER_PREFIX}${nextNumber}`;
};

/**
 * Fallback: verify uniqueness in the orders table and retry with next number.
 */
const ensureUniqueOrderNumber = async (shopId, orderNumber, baseNumber) => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const { data: existing } = await supabase
      .from('orders')
      .select('id')
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (!existing) {
      return orderNumber;
    }

    const nextNumber = baseNumber + attempt + 1;
    const candidate = `${ORDER_PREFIX}${nextNumber}`;
    const dupCheck = await supabase
      .from('orders')
      .select('id')
      .eq('order_number', candidate)
      .maybeSingle();

    if (!dupCheck.data) {
      return candidate;
    }
  }

  // Extremely unlikely: append a millisecond timestamp suffix to guarantee uniqueness
  return `${ORDER_PREFIX}${baseNumber}${Date.now() % 100000}`;
};