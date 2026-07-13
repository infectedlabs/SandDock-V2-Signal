import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { memoryCache } from '@/lib/memoryCache';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT'
];
// PRODUCTION: 30m only
const TIMEFRAMES = ['30m'];

// Must match scripts/reset_and_backfill_1y_all_coins.js exactly
const SWING_LOOKBACK = 5;
const SWING_SL_PCT = 0.5;
const SWING_TP_PCT = 1.5;

function generateDeterministicUUID(symbol, interval, barTime) {
  const hash = crypto.createHash('md5').update(`${symbol}-${interval}-${barTime}`).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16),
    'a' + hash.slice(17, 20),
    hash.slice(20, 32)
  ].join('-');
}

async function upsertSignalsSafe(supabaseAdmin, dbPayload) {
  if (!dbPayload || dbPayload.length === 0) return;
  const sym = dbPayload[0].symbol;
  const tf = dbPayload[0].interval;

  const { error } = await supabaseAdmin
    .from('signals')
    .upsert(dbPayload, { onConflict: 'id' });

  if (error) {
    console.warn(`[Sync-Upsert] Upsert error for ${sym} ${tf}:`, error.message);
    throw error;
  }
}

// ─── SWING DETECTION ────────────────────────────────────────────────
// EXACT port of scripts/reset_and_backfill_1y_all_coins.js:detectSwingSignals().
// Uses RAW high/low (not Heikin-Ashi ha_high/ha_low — a different price series
// that can disagree on direction at the same bar) and a SYMMETRIC window
// candles[i-lookback .. i+lookback] (not backward-only, which is a different,
// lagging detector that disagrees with the reference near local extremes).
function detectSwings(candles, lookback = SWING_LOOKBACK) {
  const signals = [];
  let lastLow = null;
  let lastHigh = null;

  for (let i = lookback; i < candles.length - lookback; i++) {
    const c = candles[i];

    let isLow = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && candles[j].low < c.low) {
        isLow = false;
        break;
      }
    }

    let isHigh = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && candles[j].high > c.high) {
        isHigh = false;
        break;
      }
    }

    if (isLow && lastHigh !== null) {
      const entryPrice = c.low;
      const slPrice = entryPrice * (1 - SWING_SL_PCT / 100);
      const tpPrice = entryPrice * (1 + SWING_TP_PCT / 100);

      signals.push({
        symbol: c.symbol,
        interval: '30m',
        bar_time: c.open_time,
        signal_type: 'buy',
        entry_price: entryPrice,
        sl_price: slPrice,
        tp_price: tpPrice,
        sl_pct: SWING_SL_PCT,
        tp_pct: SWING_TP_PCT,
        confidence: 95,
      });

      lastLow = c.low;
    }

    if (isHigh && lastLow !== null) {
      const entryPrice = c.high;
      const slPrice = entryPrice * (1 + SWING_SL_PCT / 100);
      const tpPrice = entryPrice * (1 - SWING_TP_PCT / 100);

      signals.push({
        symbol: c.symbol,
        interval: '30m',
        bar_time: c.open_time,
        signal_type: 'sell',
        entry_price: entryPrice,
        sl_price: slPrice,
        tp_price: tpPrice,
        sl_pct: SWING_SL_PCT,
        tp_pct: SWING_TP_PCT,
        confidence: 95,
      });

      lastHigh = c.high;
    }

    if (isLow) lastLow = c.low;
    if (isHigh) lastHigh = c.high;
  }

  return signals;
}

// ─── CALCULATE CLOSES ────────────────────────────────────────────────
function calculateCloses(signals) {
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

  return updates;
}

// ─── MARK TRAILING SIGNALS LIVE ──────────────────────────────────────
function markTrailingSignalLive(signals) {
  const trailing = signals.filter(s => s.close_reason !== 'swing_opposite');
  for (const sig of trailing) {
    sig.closed_at = null;
    sig.pnl_pct = null;
    sig.is_win = null;
  }
  return signals;
}

// ─── DEDUPE BY BAR_TIME ──────────────────────────────────────────────
function dedupeByBarTime(signals) {
  const seenBarTimes = new Set();
  return signals.filter(s => {
    if (seenBarTimes.has(s.bar_time)) return false;
    seenBarTimes.add(s.bar_time);
    return true;
  });
}

// ─── CATCH-UP: CLOSE OPEN SIGNALS & GENERATE MISSED ONES ──────────────
async function catchUpSignals() {
  const results = { closed: 0, created: 0 };

  for (const symbol of ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']) {
    try {
      // Find the latest OPEN signal (closed_at=null)
      const { data: openSignals } = await supabaseAdmin
        .from('signals')
        .select('*')
        .eq('symbol', symbol)
        .eq('interval', '30m')
        .is('closed_at', null)
        .order('bar_time', { ascending: false })
        .limit(1);

      if (!openSignals || openSignals.length === 0) continue;

      const openSignal = openSignals[0];
      const openBarTime = new Date(openSignal.bar_time);
      // Wide window before signal (60 candles = 30h) so a prior opposite swing is
      // already established when detection reaches the open signal's bar — otherwise
      // it's the first swing in the window and detectSwings() never emits it.
      const lookbackStart = new Date(openBarTime.getTime() - 60 * 30 * 60 * 1000);

      console.log(`[Catch-up] ${symbol}: Found open signal at ${openSignal.bar_time}`);

      // Fetch candles from well before the signal through to the latest candle (no upper bound)
      const { data: allCandles } = await supabaseAdmin
        .from('ohlcv_cache')
        .select('open_time, high, low, close, symbol')
        .eq('symbol', symbol)
        .eq('interval', '30m')
        .gte('open_time', lookbackStart.toISOString())
        .order('open_time', { ascending: true })
        .limit(500);

      if (!allCandles || allCandles.length === 0) continue;

      // Supabase returns numeric columns as strings — parse before comparing
      const parsedCandles = allCandles.map(c => ({ ...c, high: parseFloat(c.high), low: parseFloat(c.low) }));

      // Detect swings and calculate closes
      const detectedSignals = detectSwings(parsedCandles);
      if (detectedSignals.length === 0) continue;

      const withCloses = calculateCloses(detectedSignals);

      // Find matching open signal with flexible timestamp comparison
      const openBarTimeMs = openBarTime.getTime();
      const matchingIdx = withCloses.findIndex(s => {
        const signalTime = new Date(s.bar_time).getTime();
        const actionMatch = s.signal_type === openSignal.action.toLowerCase();
        const timeMatch = Math.abs(signalTime - openBarTimeMs) < 1000;
        return actionMatch && timeMatch;
      });

      if (matchingIdx === -1) continue;

      const closedSignal = withCloses[matchingIdx];

      // Only a real 'swing_opposite' close reflects an actual next swing.
      // If the matched signal is the last one detected (no real successor
      // yet), calculateCloses() has fabricated a placeholder close for it —
      // it's still genuinely live. Writing that placeholder would fake a
      // +tp_pct% win on every sync run. See catch-up/route.js for the
      // full explanation (this logic is duplicated here).
      if (closedSignal.close_reason !== 'swing_opposite') {
        console.log(`[Catch-up] ${symbol}: Signal at ${openSignal.bar_time} has no real opposite swing yet — leaving live`);
        continue;
      }

      // Close the open signal
      await supabaseAdmin
        .from('signals')
        .update({
          close_price: closedSignal.close_price,
          close_reason: closedSignal.close_reason,
          closed_at: closedSignal.closed_at,
          pnl_pct: closedSignal.pnl_pct,
          is_win: closedSignal.is_win
        })
        .eq('id', openSignal.id);

      results.closed += 1;
      console.log(`[Catch-up] ${symbol}: Closed - ${closedSignal.close_reason} (${closedSignal.pnl_pct}%)`);

      // Create missed signals after the open signal
      const newSignals = withCloses.filter(
        (s, idx) => idx > matchingIdx && new Date(s.bar_time) > new Date(openSignal.bar_time)
      );

      if (newSignals.length > 0) {
        markTrailingSignalLive(newSignals);
        await supabaseAdmin
          .from('signals')
          .upsert(newSignals, { onConflict: 'symbol,interval,bar_time' });

        results.created += newSignals.length;
        console.log(`[Catch-up] ${symbol}: Created ${newSignals.length} missed signals`);
      }
    } catch (err) {
      console.warn(`[Catch-up] ${symbol} error: ${err.message}`);
    }
  }

  return results;
}

// ─── BACKGROUND SYNC: GENERATE NEW SIGNALS ──────────────────────────
async function runBackgroundSync() {
  console.log('[Background Sync] Starting...');

  // First: Close any open signals and generate missed ones
  const catchUpResults = await catchUpSignals();
  console.log(`[Catch-up] Closed ${catchUpResults.closed}, Created ${catchUpResults.created}`);

  // Then: Generate ongoing new signals
  const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
  let totalCreated = 0;

  for (const symbol of SYMBOLS) {
    try {
      // Fetch latest 200 candles (descending + reverse — ascending+limit would return the OLDEST 200)
      const { data: candlesDesc, error: candleError } = await supabaseAdmin
        .from('ohlcv_cache')
        .select('open_time, high, low, close, symbol')
        .eq('symbol', symbol)
        .eq('interval', '30m')
        .order('open_time', { ascending: false })
        .limit(200);

      if (candleError || !candlesDesc || candlesDesc.length === 0) {
        console.warn(`[Sync] No candles for ${symbol}`);
        continue;
      }

      const candles = candlesDesc
        .slice()
        .reverse()
        .map(c => ({ ...c, high: parseFloat(c.high), low: parseFloat(c.low) }));

      // Get latest signal
      const { data: latestSignal } = await supabaseAdmin
        .from('signals')
        .select('bar_time')
        .eq('symbol', symbol)
        .eq('interval', '30m')
        .order('bar_time', { ascending: false })
        .limit(1);

      const lastSignalTime = latestSignal?.[0]?.bar_time
        ? new Date(latestSignal[0].bar_time)
        : new Date(0);

      // Detect swings
      const detectedSignals = detectSwings(candles);
      if (detectedSignals.length === 0) continue;

      // Filter to new signals
      const newSignals = detectedSignals.filter(
        s => new Date(s.bar_time) > lastSignalTime
      );

      if (newSignals.length === 0) continue;

      // Calculate closes
      const withCloses = calculateCloses(detectedSignals);
      const newWithCloses = withCloses.filter(
        s => new Date(s.bar_time) > lastSignalTime
      );

      // Mark trailing live
      markTrailingSignalLive(newWithCloses);

      // Dedupe
      const deduped = dedupeByBarTime(newWithCloses);
      if (deduped.length === 0) continue;

      // Store
      const { error: storeError } = await supabaseAdmin
        .from('signals')
        .upsert(deduped, { onConflict: 'symbol,interval,bar_time' });

      if (!storeError) {
        console.log(`[Sync] ${symbol}: Created ${deduped.length} new signals`);
        totalCreated += deduped.length;
      }
    } catch (err) {
      console.warn(`[Sync] Error for ${symbol}:`, err.message);
    }
  }

  console.log(`[Background Sync] Complete: Caught-up ${catchUpResults.closed}/${catchUpResults.created}, Created ${totalCreated} new`);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bypass = searchParams.get('bypass') === 'true';
    const now = Date.now();
    const lastSync = memoryCache.lastSyncTime || 0;

    // Cooldown check (5 minutes = 300,000ms) - prevent excessive syncing
    if (!bypass && now - lastSync < 300000) {
      const remainingSeconds = Math.ceil((300000 - (now - lastSync)) / 1000);
      return NextResponse.json({
        status: 'throttled',
        message: `Sync throttled. Try again in ${remainingSeconds}s.`
      });
    }

    // Update last sync timestamp immediately to prevent concurrent requests
    memoryCache.lastSyncTime = now;

    // Run signal generation in background (not awaited - fires but doesn't block)
    runBackgroundSync().catch(err => console.error('[Sync] Background execution error:', err));

    return NextResponse.json({
      status: 'syncing',
      message: 'Background synchronization started for all coins.'
    });
  } catch (err) {
    console.error('[/api/signals/sync] Error:', err);
    return NextResponse.json({ status: 'error', message: err.message }, { status: 500 });
  }
}
