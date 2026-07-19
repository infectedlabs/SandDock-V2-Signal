// Backfill script: Load 1 year of 30m candles, detect all swings, calculate closes,
// and populate signals table. Signals close ONLY on opposite swings, never TP/SL.
// The most recent signal stays live.

require('dotenv').config();

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
const INTERVAL = '30m';
const LOOKBACK = 5;
const SL_PCT = 0.5;
const TP_PCT = 1.5;

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

// Fetch candles in chunks (Binance limit: 1000 per request)
async function fetchCandlesInChunks(symbol, intervalMs) {
  const allCandles = [];
  const now = Date.now();
  let endTime = now;

  // Fetch 1 year of data
  while (now - endTime < 365 * 24 * 60 * 60 * 1000) {
    try {
      const { data } = await axios.get('https://fapi.binance.com/fapi/v1/klines', {
        params: {
          symbol,
          interval: INTERVAL,
          endTime,
          limit: 1000,
        },
        timeout: 10000,
      });

      if (!data || data.length === 0) break;

      const candles = data.map(k => ({
        open_time: new Date(k[0]).toISOString(),
        close_time: new Date(k[6]).toISOString(),
        open: +k[1],
        high: +k[2],
        low: +k[3],
        close: +k[4],
        symbol,
      }));

      allCandles.unshift(...candles);
      endTime = data[0][0] - 1; // Move before first candle of this batch

      log(`[${symbol}] Fetched ${data.length} candles (total: ${allCandles.length})...`);
    } catch (err) {
      log(`[${symbol}] Fetch error: ${err.message}`);
      break;
    }
  }

  return allCandles;
}

// Detect swings with ALTERNATING pattern enforcement: BUY, SELL, BUY, SELL
// Ensures no two consecutive same-direction signals
function detectSwings(candles, lookback = LOOKBACK) {
  const signals = [];
  let lastSignalType = null; // Track last signal to enforce alternation

  for (let i = lookback; i < candles.length; i++) {
    const c = candles[i];

    // Check if this candle is a local low (within lookback window)
    let isLow = true;
    for (let j = i - lookback; j <= i; j++) {
      if (j !== i && candles[j].low < c.low) {
        isLow = false;
        break;
      }
    }

    // Check if this candle is a local high (within lookback window)
    let isHigh = true;
    for (let j = i - lookback; j <= i; j++) {
      if (j !== i && candles[j].high > c.high) {
        isHigh = false;
        break;
      }
    }

    // CRITICAL: A candle can be both a local low AND high (rare, e.g., doji-like)
    // Never emit both from the same candle. Prefer low if both true, OR only take
    // one based on alternation rule.
    let signal = null;

    if (isLow && lastSignalType !== 'buy') {
      signal = {
        symbol: c.symbol,
        interval: INTERVAL,
        bar_time: c.close_time,
        signal_type: 'buy',
        action: 'BUY',
        rationale: 'Swing low detected',
        entry_price: c.low,
        sl_price: c.low * (1 - SL_PCT / 100),
        tp_price: c.low * (1 + TP_PCT / 100),
        sl_pct: SL_PCT,
        tp_pct: TP_PCT,
      };
      lastSignalType = 'buy';
    } else if (isHigh && lastSignalType !== 'sell') {
      // If low was already emitted this candle, offset sell by 1 second
      const offset = lastSignalType === 'buy' ? new Date(c.close_time).getTime() + 1000 : c.close_time;
      signal = {
        symbol: c.symbol,
        interval: INTERVAL,
        bar_time: new Date(offset).toISOString(),
        signal_type: 'sell',
        action: 'SELL',
        rationale: 'Swing high detected',
        entry_price: c.high,
        sl_price: c.high * (1 + SL_PCT / 100),
        tp_price: c.high * (1 - TP_PCT / 100),
        sl_pct: SL_PCT,
        tp_pct: TP_PCT,
      };
      lastSignalType = 'sell';
    }

    if (signal) {
      signals.push(signal);
    }
  }

  return signals;
}

// Calculate PnL
function calculatePnL(openSignal, closeSignal) {
  const entry = parseFloat(openSignal.entry_price);
  const close = parseFloat(closeSignal.entry_price);
  const isBuy = openSignal.action.toLowerCase() === 'buy';

  if (isBuy) {
    return Number(((close - entry) / entry * 100).toFixed(2));
  } else {
    return Number(((entry - close) / entry * 100).toFixed(2));
  }
}

// Close signals ONLY on opposite swings
function closeOnOppositeSwings(signals) {
  const withCloses = signals.map((sig, i) => {
    // Find next opposite swing
    let closeSignal = null;
    for (let j = i + 1; j < signals.length; j++) {
      const isBuy = sig.signal_type === 'buy';
      const isOpposite = isBuy ? signals[j].signal_type === 'sell' : signals[j].signal_type === 'buy';
      if (isOpposite) {
        closeSignal = signals[j];
        break;
      }
    }

    if (closeSignal) {
      // Close on opposite swing
      return {
        ...sig,
        close_price: parseFloat(closeSignal.entry_price),
        close_reason: 'swing_opposite',
        closed_at: closeSignal.bar_time,
        pnl_pct: calculatePnL(sig, closeSignal),
        is_win: calculatePnL(sig, closeSignal) > 0,
      };
    } else {
      // No opposite found → stays live
      return {
        ...sig,
        close_price: null,
        close_reason: null,
        closed_at: null,
        pnl_pct: null,
        is_win: null,
      };
    }
  });

  return withCloses;
}

// Get dynamic confidence
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
  } catch (err) {
    return 75;
  }
}

async function backfillSymbol(symbol) {
  log(`\n=== BACKFILL ${symbol} ===`);

  // Fetch 1 year of candles
  log(`[${symbol}] Fetching 1 year of 30m candles...`);
  const candles = await fetchCandlesInChunks(symbol, 30 * 60 * 1000);
  log(`[${symbol}] Fetched ${candles.length} total candles.`);

  if (candles.length < LOOKBACK * 2 + 1) {
    log(`[${symbol}] Not enough candles (${candles.length}). Skipping.`);
    return;
  }

  // Detect all swings
  log(`[${symbol}] Detecting swings...`);
  const swings = detectSwings(candles);
  log(`[${symbol}] Detected ${swings.length} swings.`);

  // Close on opposite swings only
  log(`[${symbol}] Calculating closes (opposite swings only)...`);
  const withCloses = closeOnOppositeSwings(swings);

  // Add confidence
  const confidence = await getDynamicConfidence(symbol);
  const toInsert = withCloses.map(sig => ({
    ...sig,
    confidence,
  }));

  // Log stats
  const closed = toInsert.filter(s => s.closed_at);
  const live = toInsert.filter(s => !s.closed_at);
  const winCount = toInsert.filter(s => s.is_win).length;
  const winRate = closed.length > 0 ? ((winCount / closed.length) * 100).toFixed(1) : 'N/A';
  const totalPnL = toInsert.reduce((sum, s) => sum + (s.pnl_pct || 0), 0).toFixed(2);

  log(`[${symbol}] Stats: ${closed.length} closed, ${live.length} live, ${winRate}% winrate, ${totalPnL}% PnL`);

  // Insert
  log(`[${symbol}] Inserting ${toInsert.length} signals...`);
  const { error: insertError } = await supabase
    .from('signals')
    .insert(toInsert);

  if (insertError) {
    log(`[${symbol}] Insert error: ${insertError.message}`);
  } else {
    log(`[${symbol}] ✓ Inserted successfully.`);
  }
}

async function run() {
  log('Starting backfill...');

  // Clear existing signals
  log('Clearing existing signals...');
  const { error: deleteError } = await supabase
    .from('signals')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    log(`Delete error: ${deleteError.message}`);
  } else {
    log('✓ Cleared all signals.');
  }

  // Backfill each symbol
  for (const symbol of SYMBOLS) {
    await backfillSymbol(symbol);
  }

  log('\n✓ Backfill complete!');
  process.exit(0);
}

run().catch(err => {
  log(`Fatal error: ${err.message}`);
  process.exit(1);
});
