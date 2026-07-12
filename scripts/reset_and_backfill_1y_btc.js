#!/usr/bin/env node
/**
 * RESET & BACKFILL - 1 year BTC only
 * Same swing-detection and close logic as reset_and_backfill_30d_btc.js,
 * just fetches a full year of 30m candles instead of 30 days.
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
const LOOKBACK = 5;
const SL_PCT = 0.5;
const TP_PCT = 1.5;
const DAYS_BACK = 365;

async function deleteAllSignals() {
  console.log('⚠️  Deleting all signals from database...');
  const { error } = await supabase
    .from('signals')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) console.error('Delete error:', error.message);
  else console.log('✓ All signals deleted\n');
}

async function fetchLastYear() {
  console.log(`⚡ Fetching ${DAYS_BACK} days of BTC 30m candles...`);
  let allCandles = [];
  let endTime = Date.now();
  const rangeMs = DAYS_BACK * 24 * 60 * 60 * 1000;
  const startTime = endTime - rangeMs;

  for (let i = 0; i < 1000; i++) {
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

      const firstTime = data[0][0];
      if (firstTime < startTime) {
        allCandles = allCandles.filter(c => c.time >= startTime);
        break;
      }

      endTime = +data[0][0] - 1;
      process.stdout.write('.');
      await new Promise(resolve => setTimeout(resolve, 150));
    } catch (e) {
      console.error('\n  Fetch error:', e.message);
      break;
    }
  }

  console.log(`\n✓ ${allCandles.length} candles loaded (${DAYS_BACK} days)\n`);
  return allCandles.sort((a, b) => a.time - b.time);
}

function detectSwingSignals(candles) {
  console.log('⚡ Detecting swing signals (Pine Script logic)...');
  const signals = [];
  let lastLow = null;
  let lastHigh = null;

  for (let i = LOOKBACK; i < candles.length - LOOKBACK; i++) {
    const c = candles[i];

    let isLow = true;
    for (let j = i - LOOKBACK; j <= i + LOOKBACK; j++) {
      if (j !== i && candles[j].low < c.low) {
        isLow = false;
        break;
      }
    }

    let isHigh = true;
    for (let j = i - LOOKBACK; j <= i + LOOKBACK; j++) {
      if (j !== i && candles[j].high > c.high) {
        isHigh = false;
        break;
      }
    }

    if (isLow && lastHigh !== null) {
      const entryPrice = c.low;
      const slPrice = entryPrice * (1 - SL_PCT / 100);
      const tpPrice = entryPrice * (1 + TP_PCT / 100);

      signals.push({
        symbol: SYMBOL,
        interval: TIMEFRAME,
        bar_time: new Date(c.time).toISOString(),
        signal_type: 'buy',
        entry_price: entryPrice,
        sl_price: slPrice,
        tp_price: tpPrice,
        sl_pct: SL_PCT,
        tp_pct: TP_PCT,
        confidence: 95
      });

      lastLow = c.low;
    }

    if (isHigh && lastLow !== null) {
      const entryPrice = c.high;
      const slPrice = entryPrice * (1 + SL_PCT / 100);
      const tpPrice = entryPrice * (1 - TP_PCT / 100);

      signals.push({
        symbol: SYMBOL,
        interval: TIMEFRAME,
        bar_time: new Date(c.time).toISOString(),
        signal_type: 'sell',
        entry_price: entryPrice,
        sl_price: slPrice,
        tp_price: tpPrice,
        sl_pct: SL_PCT,
        tp_pct: TP_PCT,
        confidence: 95
      });

      lastHigh = c.high;
    }

    if (isLow) lastLow = c.low;
    if (isHigh) lastHigh = c.high;
  }

  console.log(`✓ ${signals.length} signals detected\n`);

  // A candle can occasionally be both the window's high and low, producing two
  // signals with the same bar_time, which violates the DB's unique
  // (symbol, interval, bar_time) constraint. Keep the first one per bar_time.
  const seenBarTimes = new Set();
  const deduped = signals.filter(s => {
    if (seenBarTimes.has(s.bar_time)) return false;
    seenBarTimes.add(s.bar_time);
    return true;
  });
  if (deduped.length !== signals.length) {
    console.log(`⚠️  Dropped ${signals.length - deduped.length} duplicate-bar_time signal(s)\n`);
  }
  return deduped;
}

function calculateCloses(signals) {
  console.log('⚡ Calculating closes (backtest swing-to-swing method)...');

  const updates = [];

  for (let i = 0; i < signals.length; i++) {
    const sig = signals[i];
    const entryPrice = parseFloat(sig.entry_price);
    const isBuy = sig.signal_type === 'buy';

    let closePrice, closeReason, closedAt, pnlPct, isWin;

    let nextOppositeIdx = -1;
    for (let j = i + 1; j < signals.length; j++) {
      const nextSig = signals[j];
      const nextIsBuy = nextSig.signal_type === 'buy';
      if (isBuy !== nextIsBuy) {
        nextOppositeIdx = j;
        break;
      }
    }

    if (nextOppositeIdx !== -1) {
      const nextOppositeSig = signals[nextOppositeIdx];
      closePrice = parseFloat(nextOppositeSig.entry_price);
      closedAt = nextOppositeSig.bar_time;
      closeReason = 'swing_opposite';

      let change;
      if (isBuy) {
        change = ((closePrice - entryPrice) / entryPrice) * 100;
      } else {
        change = ((entryPrice - closePrice) / entryPrice) * 100;
      }
      pnlPct = Number(change.toFixed(2));
      isWin = pnlPct > 0;
    } else {
      closePrice = parseFloat(sig.tp_price);
      closedAt = sig.bar_time;
      closeReason = 'tp_hit';
      pnlPct = parseFloat(sig.tp_pct);
      isWin = true;
    }

    updates.push({
      ...sig,
      action: sig.signal_type === 'buy' ? 'BUY' : 'SELL',
      rationale: `Swing ${sig.signal_type === 'buy' ? 'low' : 'high'} detected`,
      close_price: closePrice,
      close_reason: closeReason,
      closed_at: closedAt,
      pnl_pct: pnlPct,
      is_win: isWin
    });
  }

  console.log(`✓ ${updates.length} closes calculated (swing-to-swing)\n`);
  return updates;
}

async function markTrailingSignalLive(signals) {
  // Same fixup as scripts/fix_live_signals_db.js: the most recent signal(s)
  // that only got closed via the tp_hit fallback (no real opposite swing
  // followed them yet) should stay live, matching production semantics.
  const trailing = signals.filter(s => s.close_reason !== 'swing_opposite');
  if (trailing.length === 0) return;

  console.log(`⚡ Reverting ${trailing.length} trailing fallback-closed signal(s) back to live...`);
  for (const sig of trailing) {
    sig.closed_at = null;
    sig.pnl_pct = null;
    sig.is_win = null;
  }
}

async function storeSignals(signals) {
  console.log(`⚡ Storing ${signals.length} signals in database...`);

  const chunkSize = 500;
  let stored = 0;
  for (let i = 0; i < signals.length; i += chunkSize) {
    const chunk = signals.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('signals')
      .upsert(chunk, { onConflict: 'symbol,interval,bar_time' })
      .select();

    if (error) {
      console.error(`Store error (chunk ${i}):`, error.message);
      continue;
    }
    stored += data.length;
    process.stdout.write('.');
  }

  console.log(`\n✓ ${stored} signals stored\n`);
  return stored;
}

async function main() {
  const start = Date.now();
  console.log('🚀 RESET & BACKFILL 1 YEAR BTC\n' + '='.repeat(70) + '\n');

  try {
    await deleteAllSignals();
    const candles = await fetchLastYear();
    const signals = detectSwingSignals(candles);
    const closedSignals = calculateCloses(signals);
    await markTrailingSignalLive(closedSignals);
    const stored = await storeSignals(closedSignals);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log('='.repeat(70));
    console.log(`✅ COMPLETE in ${elapsed}s`);
    console.log(`✨ ${stored} BTC signals (${DAYS_BACK} days) ready for verification\n`);
  } catch (err) {
    console.error('Fatal:', err.message);
  }

  process.exit(0);
}

main();
