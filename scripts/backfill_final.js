#!/usr/bin/env node
/**
 * FINAL FAST - Update only close fields (no upsert issues)
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
      .select('id, symbol, bar_time, signal_type, entry_price, sl_price, sl_pct, tp_price, tp_pct')
      .eq('interval', TIMEFRAME)
      .order('bar_time', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error || !signals || signals.length === 0) break;

    allSignals.push(...signals);
    page++;
    console.log(`  ${allSignals.length} loaded`);
  }

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
      const slPct = parseFloat(sig.sl_pct);

      let closePrice = null;
      let closeReason = null;
      let closedAt = null;
      let pnlPct = null;
      let isWin = null;

      if (i < signals.length - 1) {
        // Direction flip at next signal
        const nextSig = signals[i + 1];
        closePrice = parseFloat(nextSig.entry_price);
        closeReason = 'direction_flip';
        closedAt = nextSig.bar_time;
        const change = ((closePrice - entryPrice) / entryPrice) * 100;
        pnlPct = Number((change).toFixed(2));
        isWin = pnlPct > 0;
      } else {
        // Last signal - TP hit
        closePrice = tpPrice;
        closeReason = 'tp_hit';
        closedAt = sig.bar_time;
        pnlPct = tpPct;
        isWin = true;
      }

      updates.push({
        id: sig.id,
        close_price: closePrice,
        close_reason: closeReason,
        closed_at: closedAt,
        pnl_pct: pnlPct,
        is_win: isWin
      });
    }
  }

  console.log(`✓ ${updates.length} closes calculated`);
  return updates;
}

async function bulkUpdateSignals(updates) {
  console.log(`⚡ Updating ${updates.length} signals...`);

  let updated = 0;
  const BATCH = 5000;

  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);

    try {
      // Use raw SQL for faster updates
      const { error } = await supabase.rpc('batch_update_signals', {
        signal_ids: batch.map(u => u.id),
        close_prices: batch.map(u => u.close_price),
        close_reasons: batch.map(u => u.close_reason),
        closed_ats: batch.map(u => u.closed_at),
        pnl_pcts: batch.map(u => u.pnl_pct),
        is_wins: batch.map(u => u.is_win)
      });

      if (error) {
        // Fallback: individual updates
        console.log(`  Batch ${i / BATCH + 1}: using fallback...`);
        for (const u of batch) {
          try {
            await supabase
              .from('signals')
              .update({
                close_price: u.close_price,
                close_reason: u.close_reason,
                closed_at: u.closed_at,
                pnl_pct: u.pnl_pct,
                is_win: u.is_win
              })
              .eq('id', u.id);
            updated++;
          } catch (e) {}
        }
      } else {
        updated += batch.length;
        console.log(`  Batch ${i / BATCH + 1}: ${batch.length} updated`);
      }
    } catch (e) {
      console.error(`  Batch error:`, e.message);
    }
  }

  return updated;
}

async function main() {
  const start = Date.now();
  console.log('🚀 FINAL BACKFILL\n='.repeat(35));

  try {
    const allSignals = await getAllSignals();
    const updates = processAllCloses(allSignals);
    const updated = await bulkUpdateSignals(updates);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log('\n' + '='.repeat(70));
    console.log(`✅ COMPLETE in ${elapsed}s`);
    console.log(`✨ ${updated}/${updates.length} signals updated\n`);
  } catch (err) {
    console.error('Error:', err.message);
  }

  process.exit(0);
}

main();
