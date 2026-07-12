#!/usr/bin/env node
/**
 * FIX LIVE SIGNALS IN DATABASE
 * Set closed_at, pnl_pct, is_win to NULL for signals without opposite swings
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixLiveSignals() {
  console.log('🔧 FIXING LIVE SIGNALS IN DATABASE\n' + '='.repeat(70) + '\n');

  // Get all signals
  const { data: allSignals } = await supabase
    .from('signals')
    .select('id, bar_time, signal_type, close_reason')
    .eq('symbol', 'BTCUSDT')
    .eq('interval', '30m')
    .order('bar_time', { ascending: true });

  console.log(`✓ Loaded ${allSignals.length} signals\n`);

  // Find live signals (no opposite swing)
  const liveSignalIds = allSignals
    .filter(s => s.close_reason !== 'swing_opposite')
    .map(s => s.id);

  console.log(`Found ${liveSignalIds.length} live signals (no opposite swing)\n`);

  if (liveSignalIds.length === 0) {
    console.log('✓ All signals are properly closed\n');
    return;
  }

  // Update live signals to clear closed fields
  console.log('⚡ Clearing closed fields for live signals...');

  const batchSize = 50;
  for (let i = 0; i < liveSignalIds.length; i += batchSize) {
    const batch = liveSignalIds.slice(i, i + batchSize);

    await Promise.all(
      batch.map(id =>
        supabase.from('signals').update({
          closed_at: null,
          pnl_pct: null,
          is_win: null,
        }).eq('id', id)
      )
    );

    process.stdout.write('.');
  }

  console.log(`\n✓ ${liveSignalIds.length} live signals fixed\n`);
  console.log('='.repeat(70));
  console.log('✅ COMPLETE - Live signals ready for proper handling\n');
}

fixLiveSignals().then(() => process.exit(0)).catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
