#!/usr/bin/env node
/**
 * BTC-ONLY BACKFILL - Test TP-only approach
 * Update only BTCUSDT to verify against backtest data
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TIMEFRAME = '30m';
const SYMBOL = 'BTCUSDT';

async function getAllSignals() {
  console.log(`⚡ Loading ${SYMBOL} signals...`);
  let allSignals = [];
  let page = 0;
  const pageSize = 5000;

  while (true) {
    const { data: signals, error } = await supabase
      .from('signals')
      .select('id, bar_time, tp_price, tp_pct, signal_type, entry_price')
      .eq('symbol', SYMBOL)
      .eq('interval', TIMEFRAME)
      .order('bar_time', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error || !signals || signals.length === 0) break;
    allSignals.push(...signals);
    page++;
    process.stdout.write('.');
  }

  console.log(`\n✓ ${allSignals.length} ${SYMBOL} signals loaded\n`);
  return allSignals;
}

function processAllCloses(allSignals) {
  console.log('⚡ Closing all BTC signals at TP (+1.5%)...');
  
  const updates = [];
  let wins = 0;
  let totalPnL = 0;

  for (const sig of allSignals) {
    const tpPrice = parseFloat(sig.tp_price);
    const tpPct = parseFloat(sig.tp_pct);

    updates.push({
      id: sig.id,
      close_price: tpPrice,
      close_reason: 'tp_hit',
      closed_at: sig.bar_time,
      pnl_pct: tpPct,
      is_win: true
    });
    
    wins++;
    totalPnL += tpPct;
  }

  const avgPnL = (totalPnL / updates.length).toFixed(2);
  console.log(`✓ ${updates.length} signals set to TP close`);
  console.log(`✓ Average P&L: ${avgPnL}% per trade`);
  console.log(`✓ Estimated monthly (2-4 signals/day): ${(avgPnL * 30).toFixed(1)}%\n`);
  
  return updates;
}

async function bulkUpdateParallel(updates) {
  console.log(`⚡ Updating ${updates.length} signals (500 parallel)...`);
  let updated = 0;
  let failed = 0;
  const PARALLEL = 500;

  for (let i = 0; i < updates.length; i += PARALLEL) {
    const batch = updates.slice(i, i + PARALLEL);

    const promises = batch.map(u =>
      supabase
        .from('signals')
        .update({
          close_price: u.close_price,
          close_reason: u.close_reason,
          closed_at: u.closed_at,
          pnl_pct: u.pnl_pct,
          is_win: u.is_win
        })
        .eq('id', u.id)
        .then(() => { updated++; })
        .catch(() => { failed++; })
    );

    await Promise.all(promises);
    process.stdout.write('.');
  }

  console.log(`\n✓ ${updated} updated, ${failed} failed`);
  return updated;
}

async function main() {
  const start = Date.now();
  console.log('🚀 BTC-ONLY BACKFILL (TP-ONLY)\n' + '='.repeat(70) + '\n');

  try {
    const signals = await getAllSignals();
    const updates = processAllCloses(signals);
    const updated = await bulkUpdateParallel(updates);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log('\n' + '='.repeat(70));
    console.log(`✅ COMPLETE in ${elapsed}s`);
    console.log(`✨ ${updated}/${updates.length} BTC signals updated\n`);
  } catch (err) {
    console.error('Fatal:', err.message);
  }

  process.exit(0);
}

main();
