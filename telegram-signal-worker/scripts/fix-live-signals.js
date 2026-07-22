// One-off repair script: the worker's LOOKBACK was temporarily changed from
// 5 to 8, which caused a false swing-high/low detection on the current live
// candle. That wrongly closed the previous real signal and opened a new live
// signal that immediately went underwater. This script, per symbol:
//   1. Deletes the current (wrong) live signal.
//   2. Reopens the signal it wrongly closed (the "previous" signal).
//   3. Replays candle-by-candle from right after that point using the
//      correct LOOKBACK=5, exactly matching the live worker's detection
//      logic, to rebuild whatever should have actually happened.
//
// Run once after reverting index.js's LOOKBACK back to 5.

require('dotenv').config();

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
const INTERVAL = '30m';
const LOOKBACK = 5;
const SL_PCT = 0.5;
const TP_PCT = 1.5;
const CANDLES_FETCH = 1000; // matches index.js - ~20.8 days of 30m candles

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[FATAL] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function fetchCandles(symbol, limit = CANDLES_FETCH) {
  const { data } = await axios.get('https://fapi.binance.com/fapi/v1/klines', {
    params: { symbol, interval: INTERVAL, limit },
    timeout: 10000,
  });
  const now = Date.now();
  const closed = data.filter(k => k[6] <= now); // drop the still-forming candle
  return closed.map(k => ({
    open_time: new Date(k[0]).toISOString(),
    close_time: new Date(k[6]).toISOString(),
    open: +k[1],
    high: +k[2],
    low: +k[3],
    close: +k[4],
    symbol,
  }));
}

function isSwingLow(candles, i, lookback) {
  const c = candles[i];
  for (let j = i - lookback; j <= i; j++) {
    if (j !== i && candles[j].low < c.low) return false;
  }
  return true;
}

function isSwingHigh(candles, i, lookback) {
  const c = candles[i];
  for (let j = i - lookback; j <= i; j++) {
    if (j !== i && candles[j].high > c.high) return false;
  }
  return true;
}

function calculatePnL(openSignal, closeEntryPrice) {
  const entry = parseFloat(openSignal.entry_price);
  const close = parseFloat(closeEntryPrice);
  const isBuy = openSignal.action.toLowerCase() === 'buy';
  return isBuy
    ? Number(((close - entry) / entry * 100).toFixed(2))
    : Number(((entry - close) / entry * 100).toFixed(2));
}

async function getDynamicConfidence(symbol) {
  try {
    const { data } = await supabase
      .from('signals')
      .select('is_win')
      .eq('symbol', symbol)
      .eq('interval', INTERVAL)
      .not('closed_at', 'is', null)
      .order('bar_time', { ascending: false })
      .limit(20);

    if (!data || data.length === 0) return 75;
    const wins = data.filter(s => s.is_win).length;
    const winRate = (wins / data.length) * 100;
    return Math.min(Math.max(Math.round(winRate), 60), 95);
  } catch {
    return 75;
  }
}

async function fixSymbol(symbol) {
  log(`\n=== FIX ${symbol} ===`);

  const { data: recentRows, error: fetchErr } = await supabase
    .from('signals')
    .select('*')
    .eq('symbol', symbol)
    .eq('interval', INTERVAL)
    .order('bar_time', { ascending: false })
    .limit(10);

  if (fetchErr) {
    log(`[${symbol}] Fetch failed: ${fetchErr.message}`);
    return;
  }
  if (!recentRows || recentRows.length === 0) {
    log(`[${symbol}] No signals found, skipping.`);
    return;
  }

  const liveSignal = recentRows.find(r => !r.closed_at);
  if (!liveSignal) {
    log(`[${symbol}] No live signal found - nothing to fix.`);
    return;
  }

  const previousSignal = recentRows
    .filter(r => r.id !== liveSignal.id)
    .sort((a, b) => new Date(b.bar_time) - new Date(a.bar_time))[0] || null;

  log(`[${symbol}] Deleting live signal: ${liveSignal.action} @ ${liveSignal.bar_time} (entry ${liveSignal.entry_price})`);
  const { error: delErr } = await supabase.from('signals').delete().eq('id', liveSignal.id);
  if (delErr) {
    log(`[${symbol}] Delete failed: ${delErr.message}`);
    return;
  }

  if (!previousSignal) {
    log(`[${symbol}] No previous signal to resume from - nothing further to backfill.`);
    return;
  }

  let currentOpenRow = previousSignal;

  if (previousSignal.closed_at) {
    log(`[${symbol}] Reopening previous signal (was closed by the bad lookback=8 detection): ${previousSignal.action} @ ${previousSignal.bar_time}`);
    const { data: reopened, error: reopenErr } = await supabase
      .from('signals')
      .update({ closed_at: null, close_price: null, close_reason: null, pnl_pct: null, is_win: null })
      .eq('id', previousSignal.id)
      .select();
    if (reopenErr) {
      log(`[${symbol}] Reopen failed: ${reopenErr.message}`);
      return;
    }
    currentOpenRow = reopened[0];
  } else {
    log(`[${symbol}] Previous signal was already live (unexpected) - leaving as-is.`);
  }

  const candles = await fetchCandles(symbol);
  log(`[${symbol}] Fetched ${candles.length} candles.`);

  const cutoffMs = new Date(previousSignal.bar_time).getTime();
  const startIdx = candles.findIndex(c => new Date(c.close_time).getTime() > cutoffMs);

  if (startIdx === -1 || startIdx < LOOKBACK) {
    log(`[${symbol}] No new candles after previous signal's bar_time yet - previous signal stays live under lookback=5.`);
    return;
  }

  const confidence = await getDynamicConfidence(symbol);
  let insertedCount = 0;

  for (let i = startIdx; i < candles.length; i++) {
    if (i < LOOKBACK) continue;
    const c = candles[i];
    const low = isSwingLow(candles, i, LOOKBACK);
    const high = isSwingHigh(candles, i, LOOKBACK);
    if (!low && !high) continue;

    const openType = currentOpenRow.action.toLowerCase();
    const candidates = [];
    if (low) candidates.push({ type: 'buy', price: c.low, time: c.close_time });
    if (high) {
      const time = low ? new Date(c.close_time).getTime() + 1000 : c.close_time;
      candidates.push({ type: 'sell', price: c.high, time });
    }

    const opposite = candidates.find(cd => cd.type !== openType);
    if (!opposite) continue; // same-direction swing - worker waits for the real opposite

    const closeTimeIso = new Date(opposite.time).toISOString();
    const pnlPct = calculatePnL(currentOpenRow, opposite.price);
    const closeInfo = {
      close_price: opposite.price,
      close_reason: 'swing_opposite',
      closed_at: closeTimeIso,
      pnl_pct: pnlPct,
      is_win: pnlPct > 0,
    };

    const { error: closeErr } = await supabase.from('signals').update(closeInfo).eq('id', currentOpenRow.id);
    if (closeErr) {
      log(`[${symbol}] Failed to close ${currentOpenRow.action} @ ${currentOpenRow.bar_time}: ${closeErr.message}`);
      return;
    }
    log(`[${symbol}] Closed ${currentOpenRow.action} @ ${currentOpenRow.bar_time} -> pnl ${pnlPct}%`);

    const newSig = {
      symbol,
      interval: INTERVAL,
      bar_time: closeTimeIso,
      signal_type: opposite.type,
      action: opposite.type.toUpperCase(),
      rationale: opposite.type === 'buy' ? 'Swing low detected' : 'Swing high detected',
      entry_price: opposite.price,
      sl_price: opposite.type === 'buy' ? opposite.price * (1 - SL_PCT / 100) : opposite.price * (1 + SL_PCT / 100),
      tp_price: opposite.type === 'buy' ? opposite.price * (1 + TP_PCT / 100) : opposite.price * (1 - TP_PCT / 100),
      sl_pct: SL_PCT,
      tp_pct: TP_PCT,
      confidence,
      closed_at: null,
      pnl_pct: null,
      is_win: null,
      close_reason: null,
    };

    const { data: insertedRows, error: insErr } = await supabase.from('signals').insert(newSig).select();
    if (insErr) {
      log(`[${symbol}] Insert failed: ${insErr.message}`);
      return;
    }
    currentOpenRow = insertedRows[0];
    insertedCount++;
    log(`[${symbol}] Opened ${currentOpenRow.action} @ ${currentOpenRow.bar_time}`);
  }

  log(`[${symbol}] ✓ Done. Final live signal: ${currentOpenRow.action} @ ${currentOpenRow.bar_time} entry=${currentOpenRow.entry_price} (${insertedCount} new signal(s) inserted during replay).`);
}

async function run() {
  for (const symbol of SYMBOLS) {
    await fixSymbol(symbol);
  }
  log('\n✓ Fix complete!');
  process.exit(0);
}

run().catch(err => {
  log(`Fatal error: ${err.message}`);
  process.exit(1);
});
