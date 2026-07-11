#!/usr/bin/env node
/**
 * Cleanup and Rebuild Signals Database
 *
 * IMPORTANT: This script:
 * 1. DELETES all old V1 signals from database
 * 2. Rebuilds with ONLY V2 quality signals
 * 3. Ensures database purity (no mixed versions)
 *
 * Run BEFORE backfill_signals_v2.js if database has V1 data
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
const INTERVALS = ['15m', '30m', '1h', '4h'];

async function cleanupDatabase() {
  console.log('🧹 Cleaning up signals database...');
  console.log('====================================');
  console.log('WARNING: This will DELETE all existing signals!');
  console.log('To proceed, ensure you have a backup.\n');

  let totalDeleted = 0;

  for (const symbol of SYMBOLS) {
    for (const interval of INTERVALS) {
      try {
        console.log(`Deleting old signals: ${symbol} ${interval}...`);

        // Get count before deletion
        const { count: countBefore, error: countError } = await supabaseAdmin
          .from('signals')
          .select('id', { count: 'exact', head: true })
          .eq('symbol', symbol.toUpperCase())
          .eq('interval', interval);

        if (countError) {
          console.warn(`  ⚠️  Error counting: ${countError.message}`);
          continue;
        }

        console.log(`  Current count: ${countBefore} signals`);

        // Delete all signals for this symbol/interval
        const { error: deleteError, count: deleted } = await supabaseAdmin
          .from('signals')
          .delete()
          .eq('symbol', symbol.toUpperCase())
          .eq('interval', interval);

        if (deleteError) {
          console.error(`  ❌ Delete error: ${deleteError.message}`);
          continue;
        }

        console.log(`  ✓ Deleted ${deleted} signals`);
        totalDeleted += deleted || 0;
      } catch (err) {
        console.error(`Error cleaning ${symbol} ${interval}: ${err.message}`);
      }
    }
  }

  console.log(`\n✓ Total signals deleted: ${totalDeleted}`);
  console.log('✓ Database ready for V2 quality backfill\n');
}

async function clearOHLCVCache() {
  console.log('🧹 Clearing OHLCV cache...');

  try {
    const { error: deleteError, count: deleted } = await supabaseAdmin
      .from('ohlcv_cache')
      .delete()
      .gt('id', 0); // Delete all records

    if (deleteError) {
      console.error(`❌ Error clearing OHLCV: ${deleteError.message}`);
    } else {
      console.log(`✓ Cleared ${deleted} OHLCV cache records\n`);
    }
  } catch (err) {
    console.error(`Error clearing OHLCV: ${err.message}`);
  }
}

async function verifyCleanup() {
  console.log('📊 Verifying cleanup...');
  console.log('====================================\n');

  let totalSignals = 0;

  for (const symbol of SYMBOLS) {
    let symbolTotal = 0;
    for (const interval of INTERVALS) {
      const { count, error } = await supabaseAdmin
        .from('signals')
        .select('id', { count: 'exact', head: true })
        .eq('symbol', symbol.toUpperCase())
        .eq('interval', interval);

      if (!error) {
        console.log(`${symbol} ${interval}: ${count} signals`);
        symbolTotal += count || 0;
      }
    }
    console.log(`${symbol} Total: ${symbolTotal}\n`);
    totalSignals += symbolTotal;
  }

  console.log('====================================');
  console.log(`Total signals in database: ${totalSignals}`);

  if (totalSignals === 0) {
    console.log('✅ Database is CLEAN and ready for V2 backfill\n');
  } else {
    console.log(`⚠️  Database still has ${totalSignals} signals\n`);
  }
}

async function main() {
  console.log('🚀 Database Cleanup & Rebuild Script');
  console.log('====================================\n');

  try {
    // Step 1: Clean signals
    await cleanupDatabase();

    // Step 2: Clear OHLCV cache
    await clearOHLCVCache();

    // Step 3: Verify cleanup
    await verifyCleanup();

    console.log('✅ Cleanup complete!');
    console.log('📝 Next step: Run backfill_signals_v2.js to rebuild with quality signals\n');
    console.log('Command: node scripts/backfill_signals_v2.js\n');
  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
}

main();
