import { generateShopId } from './src/utils/generateShopId.js';
import { supabase } from './src/config/supabase.js';

/**
 * Migration script to generate Shop IDs for existing shops
 * Run this after adding the shop_identifier column to the database
 */
async function migrateShopIds() {
  console.log('Starting Shop ID migration...');

  try {
    // Fetch all shops that don't have a shop_identifier
    const { data: shops, error } = await supabase
      .from('shop_settings')
      .select('id, shop_name')
      .is('shop_identifier', null);

    if (error) {
      throw error;
    }

    console.log(`Found ${shops.length} shops without Shop IDs`);

    for (const shop of shops) {
      try {
        const shopId = await generateShopId();
        console.log(`Generated Shop ID ${shopId} for shop: ${shop.shop_name} (${shop.id})`);

        const { error: updateError } = await supabase
          .from('shop_settings')
          .update({ shop_identifier: shopId })
          .eq('id', shop.id);

        if (updateError) {
          console.error(`Failed to update shop ${shop.id}:`, updateError.message);
        } else {
          console.log(`✓ Successfully assigned Shop ID ${shopId} to ${shop.shop_name}`);
        }
      } catch (err) {
        console.error(`Failed to generate Shop ID for shop ${shop.id}:`, err.message);
      }
    }

    console.log('Migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateShopIds();