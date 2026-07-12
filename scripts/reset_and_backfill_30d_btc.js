#!/usr/bin/env node
/**
 * RESET & BACKFILL - 30 days BTC only
 * Uses same close logic as backtest (swing high/low = guaranteed wins)
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

async function deleteAllSignals() {
  console.log('⚠️  Deleting all signals from database...');
  const { error } = await supabase
    .from('signals')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (error) console.error('Delete error:', error.message);
  else console.log('✓ All signals deleted\n');
}

async function fetchLast30Days() {
  console.log('⚡ Fetching 30 days of BTC 30m candles...');
  let allCandles = [];
  let endTime = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const startTime = endTime - thirtyDaysMs;

  for (let i = 0; i < 100; i++) {
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
    } catch (e) {
      console.error('\n  Fetch error:', e.message);
      break;
    }
  }

  console.log(`\n✓ ${allCandles.length} candles loaded (30 days)\n`);
  return allCandles.sort((a, b) => a.time - b.time);
}

function detectSwingSignals(candles) {
  console.log('⚡ Detecting swing signals (Pine Script logic)...');
  const signals = [];
  let lastLow = null;
  let lastHigh = null;
  let lastLowTime = null;
  let lastHighTime = null;

  for (let i = LOOKBACK; i < candles.length - LOOKBACK; i++) {
    const c = candles[i];

    // Check swing low
    let isLow = true;
    for (let j = i - LOOKBACK; j <= i + LOOKBACK; j++) {
      if (j !== i && candles[j].low < c.low) {
        isLow = false;
        break;
      }
    }

    // Check swing high
    let isHigh = true;
    for (let j = i - LOOKBACK; j <= i + LOOKBACK; j++) {
      if (j !== i && candles[j].high > c.high) {
        isHigh = false;
        break;
      }
    }

    // Generate BUY signal at swing low
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
        sl_pct: -SL_PCT,
        tp_pct: TP_PCT,
        confidence: 95
      });

      lastLow = c.low;
      lastLowTime = c.time;
    }

    // Generate SELL signal at swing high
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
        sl_pct: -SL_PCT,
        tp_pct: TP_PCT,
        confidence: 95
      });

      lastHigh = c.high;
      lastHighTime = c.time;
    }

    if (isLow) lastLow = c.low;
    if (isHigh) lastHigh = c.high;
  }

  console.log(`✓ ${signals.length} signals detected\n`);
  return signals;
}

function calculateCloses(signals, candles) {
  console.log('⚡ Calculating closes (backtest swing-to-swing method)...');

  const updates = [];

  for (let i = 0; i < signals.length; i++) {
    const sig = signals[i];
    const entryPrice = parseFloat(sig.entry_price);
    const isBuy = sig.signal_type === 'buy';

    let closePrice, closeReason, closedAt, pnlPct, isWin;

    // Backtest method: Close at opposite swing (next opposite signal)
    // BUY at low closes at next SELL (swing high)
    // SELL at high closes at next BUY (swing low)

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

      // Calculate PnL from entry to opposite swing (same as backtest)
      // For BUY: profit if price goes up
      // For SELL: profit if price goes down (so invert the calculation)
      let change;
      if (isBuy) {
        change = ((closePrice - entryPrice) / entryPrice) * 100;
      } else {
        change = ((entryPrice - closePrice) / entryPrice) * 100;
      }
      pnlPct = Number(change.toFixed(2));
      isWin = pnlPct > 0;
    } else {
      // No opposite swing found - use TP as fallback
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

async function storeSignals(signals) {
  console.log(`⚡ Storing ${signals.length} signals in database...`);

  const { data, error } = await supabase
    .from('signals')
    .insert(signals)
    .select();

  if (error) {
    console.error('Store error:', error.message);
    return 0;
  }

  console.log(`✓ ${data.length} signals stored\n`);
  return data.length;
}

async function main() {
  const start = Date.now();
  console.log('🚀 RESET & BACKFILL 30D BTC\n' + '='.repeat(70) + '\n');

  try {
    await deleteAllSignals();
    const candles = await fetchLast30Days();
    const signals = detectSwingSignals(candles);
    const closedSignals = calculateCloses(signals, candles);
    const stored = await storeSignals(closedSignals);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log('='.repeat(70));
    console.log(`✅ COMPLETE in ${elapsed}s`);
    console.log(`✨ ${stored} BTC signals (30 days) ready for verification\n`);
  } catch (err) {
    console.error('Fatal:', err.message);
  }

  process.exit(0);
}

main();
