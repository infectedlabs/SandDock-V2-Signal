#!/usr/bin/env node
/**
 * BTC BATCH BACKFILL - Load and update in chunks
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('🚀 BTC BATCH BACKFILL\n' + '='.repeat(70) + '\n');
  const start = Date.now();
  let totalUpdated = 0;
  const pageSize = 1000;
  let pageNum = 0;

  while (true) {
    console.log(`Loading page ${pageNum + 1}...`);
    
    // Load page
    const { data: signals, error } = await supabase
      .from('signals')
      .select('id, bar_time, tp_price, tp_pct')
      .eq('symbol', 'BTCUSDT')
      .eq('interval', '30m')
      .order('bar_time', { ascending: true })
      .range(pageNum * pageSize, (pageNum + 1) * pageSize - 1);

    if (error || !signals || signals.length === 0) break;

    console.log(`  Loaded ${signals.length} signals, updating...`);

    // Update all in this page
    for (const sig of signals) {
      await supabase
        .from('signals')
        .update({
          close_price: parseFloat(sig.tp_price),
          close_reason: 'tp_hit',
          closed_at: sig.bar_time,
          pnl_pct: parseFloat(sig.tp_pct),
          is_win: true
        })
        .eq('id', sig.id);
      
      totalUpdated++;
      if (totalUpdated % 500 === 0) process.stdout.write('.');
    }

    pageNum++;
    console.log(`  ${totalUpdated} total updated\n`);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log('\n' + '='.repeat(70));
  console.log(`✅ COMPLETE in ${elapsed}s`);
  console.log(`✨ ${totalUpdated} BTC signals updated to TP-only\n`);
  process.exit(0);
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
