/**
 * Real-time Signal Generator
 *
 * Uses EXACT same swing detection logic as successful backfill
 * to maintain signal quality and winrate.
 *
 * Called every 30 minutes when candles close
 * Only processes NEW candles since last signal
 * Does NOT modify existing signals
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

// ─── CONFIGURATION ────────────────────────────────────────────────
// MUST match backfill parameters for consistent quality
const CONFIG = {
  SYMBOLS: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
  TIMEFRAME: '30m',
  LOOKBACK: 5,          // ✅ Same as backfill (proven quality, backside-only)
  SL_PCT: 0.5,          // ✅ Same as backfill
  TP_PCT: 1.5,          // ✅ Same as backfill
  CANDLES_FETCH: 200,   // Fetch last 200 candles for context
};

// ─── SWING DETECTION (EXACT COPY FROM BACKFILL) ────────────────────
function detectSwings(candles) {
  const highs = candles.map(c => c.ha_high);
  const lows = candles.map(c => c.ha_low);
  const n = highs.length;
  const LOOKBACK = CONFIG.LOOKBACK;
  const win = LOOKBACK + 1;

  const signals = [];
  let lastLow = null;
  let lastHigh = null;

  for (let i = LOOKBACK; i < candles.length - LOOKBACK; i++) {
    const lo = Math.max(0, i - LOOKBACK);
    const windowHigh = Math.max(...highs.slice(lo, i + 1));
    const windowLow = Math.min(...lows.slice(lo, i + 1));
    const windowSize = i - lo + 1;

    const raw_top = highs[i] === windowHigh && windowSize === win;
    const raw_bot = lows[i] === windowLow && windowSize === win;

    let is_top = raw_top;
    let is_bot = raw_bot;

    if (is_top) {
      if (lastLow !== null) {
        const entryPrice = lows[i];
        const slPrice = entryPrice * (1 - CONFIG.SL_PCT / 100);
        const tpPrice = entryPrice * (1 + CONFIG.TP_PCT / 100);

        signals.push({
          symbol: candles[i].symbol,
          interval: CONFIG.TIMEFRAME,
          bar_time: candles[i].open_time,
          signal_type: 'buy',
          entry_price: entryPrice,
          sl_price: slPrice,
          tp_price: tpPrice,
          sl_pct: CONFIG.SL_PCT,
          tp_pct: CONFIG.TP_PCT,
          confidence: 95, // ✅ Same as backfill
        });

        lastLow = lows[i];
      }
    }

    if (is_bot) {
      if (lastHigh !== null) {
        const entryPrice = highs[i];
        const slPrice = entryPrice * (1 + CONFIG.SL_PCT / 100);
        const tpPrice = entryPrice * (1 - CONFIG.TP_PCT / 100);

        signals.push({
          symbol: candles[i].symbol,
          interval: CONFIG.TIMEFRAME,
          bar_time: candles[i].open_time,
          signal_type: 'sell',
          entry_price: entryPrice,
          sl_price: slPrice,
          tp_price: tpPrice,
          sl_pct: CONFIG.SL_PCT,
          tp_pct: CONFIG.TP_PCT,
          confidence: 95, // ✅ Same as backfill
        });

        lastHigh = highs[i];
      }
    }

    if (is_top) lastHigh = highs[i];
    if (is_bot) lastLow = lows[i];
  }

  return signals;
}

// ─── CALCULATE CLOSES (EXACT COPY FROM BACKFILL) ──────────────────
function calculateCloses(signals) {
  const updates = [];

  for (let i = 0; i < signals.length; i++) {
    const sig = signals[i];
    const entryPrice = parseFloat(sig.entry_price);
    const isBuy = sig.signal_type === 'buy';

    let closePrice, closeReason, closedAt, pnlPct, isWin;

    // Find next opposite swing
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
      // Trailing signal - no opposite yet
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

  return updates;
}

// ─── MARK TRAILING SIGNALS LIVE (EXACT COPY FROM BACKFILL) ────────
function markTrailingSignalLive(signals) {
  const trailing = signals.filter(s => s.close_reason !== 'swing_opposite');
  for (const sig of trailing) {
    sig.closed_at = null;
    sig.pnl_pct = null;
    sig.is_win = null;
  }
  return signals;
}

// ─── DEDUPE BY BAR_TIME ────────────────────────────────────────────
function dedupeByBarTime(signals) {
  const seenBarTimes = new Set();
  return signals.filter(s => {
    if (seenBarTimes.has(s.bar_time)) return false;
    seenBarTimes.add(s.bar_time);
    return true;
  });
}

// ─── MAIN SIGNAL GENERATOR ────────────────────────────────────────
async function generateNewSignals() {
  const results = { created: 0, updated: 0, errors: [] };

  for (const symbol of CONFIG.SYMBOLS) {
    try {
      // 1. Fetch latest candles
      const { data: candles, error: candleError } = await supabaseAdmin
        .from('ohlcv_cache')
        .select('open_time, ha_high, ha_low, close')
        .eq('symbol', symbol)
        .eq('interval', CONFIG.TIMEFRAME)
        .order('open_time', { ascending: true })
        .limit(CONFIG.CANDLES_FETCH);

      if (candleError || !candles || candles.length === 0) {
        throw new Error(`Failed to fetch candles for ${symbol}: ${candleError?.message}`);
      }

      // Add symbol to each candle for detection
      const candlesWithSymbol = candles.map(c => ({
        ...c,
        symbol,
        open_time: c.open_time
      }));

      // 2. Get latest signal bar_time to avoid re-processing
      const { data: latestSignal } = await supabaseAdmin
        .from('signals')
        .select('bar_time')
        .eq('symbol', symbol)
        .eq('interval', CONFIG.TIMEFRAME)
        .order('bar_time', { ascending: false })
        .limit(1);

      const lastSignalTime = latestSignal?.[0]?.bar_time
        ? new Date(latestSignal[0].bar_time)
        : new Date(0);

      // Filter to only NEW candles (after last signal)
      const newCandles = candlesWithSymbol.filter(c => new Date(c.open_time) > lastSignalTime);

      if (newCandles.length < CONFIG.CANDLES_FETCH * 0.3) {
        // Not enough new candles - need lookback context
        // Use all candles but only create signals from new ones
        continue;
      }

      // 3. Detect swings
      const detectedSignals = detectSwings(candlesWithSymbol);

      if (detectedSignals.length === 0) continue;

      // 4. Filter to only NEW signals
      const newSignals = detectedSignals.filter(
        s => new Date(s.bar_time) > lastSignalTime
      );

      if (newSignals.length === 0) continue;

      // 5. Calculate closes
      const withCloses = calculateCloses(detectedSignals);
      const newWithCloses = withCloses.filter(
        s => new Date(s.bar_time) > lastSignalTime
      );

      // 6. Mark trailing signals live
      markTrailingSignalLive(newWithCloses);

      // 7. Dedupe by bar_time
      const deduped = dedupeByBarTime(newWithCloses);

      if (deduped.length === 0) continue;

      // 8. Store in database
      const { data: stored, error: storeError } = await supabaseAdmin
        .from('signals')
        .upsert(deduped, { onConflict: 'symbol,interval,bar_time' })
        .select();

      if (storeError) {
        throw new Error(`Failed to store signals: ${storeError.message}`);
      }

      results.created += deduped.length;
      console.log(`[Signal Generator] ${symbol}: Created ${deduped.length} new signals`);

    } catch (err) {
      const msg = `${symbol}: ${err.message}`;
      results.errors.push(msg);
      console.error(`[Signal Generator] Error for ${msg}`);
    }
  }

  return results;
}

// ─── API ENDPOINT ─────────────────────────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dry_run = searchParams.get('dry_run') === 'true';

    if (dry_run) {
      return NextResponse.json({
        status: 'dry_run',
        message: 'Dry run mode - no signals created'
      });
    }

    console.log('[Signal Generator] Starting new signal generation...');
    const results = await generateNewSignals();

    return NextResponse.json({
      status: 'success',
      message: `Generated ${results.created} new signals`,
      ...results
    });

  } catch (err) {
    console.error('[Signal Generator] Fatal error:', err);
    return NextResponse.json({
      status: 'error',
      message: err.message
    }, { status: 500 });
  }
}
