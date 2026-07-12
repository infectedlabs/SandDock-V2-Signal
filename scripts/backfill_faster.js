#!/usr/bin/env node
/**
 * FASTER BACKFILL - Increased parallelization (500 concurrent)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TIMEFRAME = '30m';

async function getAllSignals() {
  console.log('⚡ Loading ALL signals...');
  let allSignals = [];
  let page = 0;
  const pageSize = 5000;

  while (true) {
    const { data: signals, error } = await supabase
      .from('signals')
      .select('id, symbol, bar_time, signal_type, entry_price, sl_pct, tp_pct, tp_price')
      .eq('interval', TIMEFRAME)
      .is('close_price', null)
      .order('bar_time', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error || !signals || signals.length === 0) break;
    allSignals.push(...signals);
    page++;
    process.stdout.write('.');
  }

  console.log(`\n✓ ${allSignals.length} open signals loaded\n`);
  return allSignals;
}

function processAllCloses(allSignals) {
  console.log('⚡ Calculating closes...');
  const bySymbol = {};

  for (const sig of allSignals) {
    if (!bySymbol[sig.symbol]) bySymbol[sig.symbol] = [];
    bySymbol[sig.symbol].push(sig);
  }

  const updates = [];

  for (const symbol in bySymbol) {
    const signals = bySymbol[symbol].sort((a, b) =>
      new Date(a.bar_time) - new Date(b.bar_time)
    );

    for (let i = 0; i < signals.length; i++) {
      const sig = signals[i];
      const entryPrice = parseFloat(sig.entry_price);
      const tpPrice = parseFloat(sig.tp_price);
      const tpPct = parseFloat(sig.tp_pct);

      let closePrice, closeReason, closedAt, pnlPct, isWin;

      if (i < signals.length - 1) {
        const nextSig = signals[i + 1];
        closePrice = parseFloat(nextSig.entry_price);
        closeReason = 'direction_flip';
        closedAt = nextSig.bar_time;
        const change = ((closePrice - entryPrice) / entryPrice) * 100;
        pnlPct = Number(change.toFixed(2));
        isWin = pnlPct > 0;
      } else {
        closePrice = tpPrice;
        closeReason = 'tp_hit';
        closedAt = sig.bar_time;
        pnlPct = tpPct;
        isWin = true;
      }

      updates.push({ id: sig.id, closePrice, closeReason, closedAt, pnlPct, isWin });
    }
  }

  console.log(`✓ ${updates.length} closes calculated\n`);
  return updates;
}

async function bulkUpdateParallel(updates) {
  console.log(`⚡ Updating ${updates.length} signals (500 parallel)...`);
  let updated = 0;
  let failed = 0;
  const PARALLEL = 500; // Aggressive parallelization

  for (let i = 0; i < updates.length; i += PARALLEL) {
    const batch = updates.slice(i, i + PARALLEL);

    const promises = batch.map(u =>
      supabase
        .from('signals')
        .update({
          close_price: u.closePrice,
          close_reason: u.closeReason,
          closed_at: u.closedAt,
          pnl_pct: u.pnlPct,
          is_win: u.isWin
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
  console.log('🚀 FASTER BACKFILL (500 PARALLEL)\n' + '='.repeat(70) + '\n');

  try {
    const signals = await getAllSignals();
    const updates = processAllCloses(signals);
    const updated = await bulkUpdateParallel(updates);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log('\n' + '='.repeat(70));
    console.log(`✅ COMPLETE in ${elapsed}s`);
    console.log(`✨ ${updated}/${updates.length} signals updated with P&L\n`);
  } catch (err) {
    console.error('Fatal:', err.message);
  }

  process.exit(0);
}

main();
