#!/usr/bin/env node
/**
 * FIX SIGNAL CLOSES - Properly recalculate closes using actual candlestick data
 * For signals without next opposite swing, find actual close from candlestick highs/lows
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const BINANCE_API = 'https://api.binance.com/api/v3';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SYMBOL = 'BTCUSDT';
const TIMEFRAME = '30m';

async function fetchCandles(startDate, endDate) {
  console.log(`⚡ Fetching candles from ${startDate} to ${endDate}...`);
  let allCandles = [];
  let endTime = new Date(endDate).getTime();
  const startTime = new Date(startDate).getTime();

  for (let i = 0; i < 150; i++) {
    try {
      const { data } = await axios.get(`${BINANCE_API}/klines`, {
        params: {
          symbol: SYMBOL,
          interval: TIMEFRAME,
          endTime,
          limit: 1000
        }
      });

      if (!data || data.length === 0) break;

      allCandles.unshift(...data.map(k => ({
        time: +k[0],
        open: +k[1],
        high: +k[2],
        low: +k[3],
        close: +k[4]
      })));

      if (data[0][0] <= startTime) {
        allCandles = allCandles.filter(c => c.time >= startTime);
        break;
      }

      endTime = +data[0][0] - 1;
      process.stdout.write('.');
    } catch (e) {
      console.error('\nFetch error:', e.message);
      break;
    }
  }

  console.log(`\n✓ ${allCandles.length} candles loaded\n`);
  return allCandles.sort((a, b) => a.time - b.time);
}

async function fixCloses() {
  console.log('🔧 FIXING SIGNAL CLOSES\n' + '='.repeat(70) + '\n');

  // Fetch all signals
  const { data: allSignals } = await supabase
    .from('signals')
    .select('*')
    .eq('symbol', SYMBOL)
    .eq('interval', TIMEFRAME)
    .order('bar_time', { ascending: true });

  console.log(`✓ Loaded ${allSignals.length} signals\n`);

  // Get date range
  const firstSig = allSignals[0];
  const lastSig = allSignals[allSignals.length - 1];
  const candles = await fetchCandles(firstSig.bar_time, lastSig.bar_time);

  // Build candle lookup
  const candleMap = {};
  candles.forEach(c => {
    candleMap[c.time] = c;
  });

  console.log('⚡ Fixing closes...\n');

  let fixed = 0;
  let updates = [];

  for (let i = 0; i < allSignals.length; i++) {
    const sig = allSignals[i];
    const isBuy = sig.signal_type === 'buy';

    // Skip if already has proper close with swing_opposite
    if (sig.close_reason === 'swing_opposite') continue;

    // Find next opposite signal
    let nextOppositeIdx = -1;
    for (let j = i + 1; j < allSignals.length; j++) {
      const nextSig = allSignals[j];
      const nextIsBuy = nextSig.signal_type === 'buy';
      if (isBuy !== nextIsBuy) {
        nextOppositeIdx = j;
        break;
      }
    }

    if (nextOppositeIdx !== -1) {
      // Found next opposite - close there
      const nextSig = allSignals[nextOppositeIdx];
      const closePrice = parseFloat(nextSig.entry_price);
      const entryPrice = parseFloat(sig.entry_price);

      let pnlPct;
      if (isBuy) {
        pnlPct = ((closePrice - entryPrice) / entryPrice) * 100;
      } else {
        pnlPct = ((entryPrice - closePrice) / entryPrice) * 100;
      }

      updates.push({
        id: sig.id,
        close_price: closePrice,
        closed_at: nextSig.bar_time,
        close_reason: 'swing_opposite',
        pnl_pct: Number(pnlPct.toFixed(2)),
        is_win: pnlPct > 0
      });
      fixed++;
    } else {
      // No next opposite - this is last signal, leave as-is
      console.log(`⚠️  Signal ${sig.bar_time} (${sig.signal_type}) has no next opposite - keeping TP close`);
    }
  }

  if (updates.length === 0) {
    console.log('✓ All closes are already correct\n');
    return;
  }

  // Apply updates in parallel batches
  console.log(`\n⚡ Updating ${updates.length} signal closes (parallel)...`);
  const batchSize = 100;

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);

    await Promise.all(
      batch.map(upd =>
        supabase.from('signals').update({
          close_price: upd.close_price,
          closed_at: upd.closed_at,
          close_reason: upd.close_reason,
          pnl_pct: upd.pnl_pct,
          is_win: upd.is_win
        }).eq('id', upd.id)
      )
    );

    process.stdout.write('.');
  }

  console.log(`\n✓ ${fixed} closes fixed\n`);
  console.log('='.repeat(70));
  console.log(`✅ COMPLETE\n`);
}

fixCloses().then(() => process.exit(0)).catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
