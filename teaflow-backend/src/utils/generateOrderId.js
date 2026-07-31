import { supabase } from '../config/supabase.js';

export const generateOrderNumber = async (shopId) => {
  const { data: shop } = await supabase
    .from('shop_settings')
    .select('settings')
    .eq('id', shopId)
    .single();

  const prefix = shop?.settings?.orderPrefix || 'TF';
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const orderNumber = `${prefix}-${today}-${randomSuffix}`;

  const { data: existing } = await supabase
    .from('orders')
    .select('id')
    .eq('order_number', orderNumber)
    .maybeSingle();

  if (existing) {
    const retrySuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${today}-${retrySuffix}`;
  }

  return orderNumber;
};