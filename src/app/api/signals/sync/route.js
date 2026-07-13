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

// ─── SWING DETECTION (EXACT COPY FROM GENERATOR) ────────────────────
function detectSwings(candles, lookback = 5) {
  const highs = candles.map(c => c.ha_high);
  const lows = candles.map(c => c.ha_low);
  const n = highs.length;
  const win = lookback + 1;

  const signals = [];
  let lastLow = null;
  let lastHigh = null;

  for (let i = lookback; i < candles.length - lookback; i++) {
    const lo = Math.max(0, i - lookback);
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
        const slPrice = entryPrice * 0.995; // 0.5% SL
        const tpPrice = entryPrice * 1.015; // 1.5% TP

        signals.push({
          symbol: candles[i].symbol,
          interval: '30m',
          bar_time: candles[i].open_time,
          signal_type: 'buy',
          entry_price: entryPrice,
          sl_price: slPrice,
          tp_price: tpPrice,
          sl_pct: 0.5,
          tp_pct: 1.5,
          confidence: 95,
        });

        lastLow = lows[i];
      }
    }

    if (is_bot) {
      if (lastHigh !== null) {
        const entryPrice = highs[i];
        const slPrice = entryPrice * 1.005; // 0.5% SL
        const tpPrice = entryPrice * 0.985; // 1.5% TP

        signals.push({
          symbol: candles[i].symbol,
          interval: '30m',
          bar_time: candles[i].open_time,
          signal_type: 'sell',
          entry_price: entryPrice,
          sl_price: slPrice,
          tp_price: tpPrice,
          sl_pct: 0.5,
          tp_pct: 1.5,
          confidence: 95,
        });

        lastHigh = highs[i];
      }
    }

    if (is_top) lastHigh = highs[i];
    if (is_bot) lastLow = lows[i];
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
      const lookbackStart = new Date(openBarTime.getTime() - 150 * 60 * 1000);

      console.log(`[Catch-up] ${symbol}: Found open signal at ${openSignal.bar_time}`);

      // Fetch candles from BEFORE the signal (with lookback context) onwards
      // detectSwings() needs LOOKBACK candles before to properly detect the signal
      const { data: allCandles } = await supabaseAdmin
        .from('ohlcv_cache')
        .select('open_time, ha_high, ha_low, close, symbol')
        .eq('symbol', symbol)
        .eq('interval', '30m')
        .gte('open_time', lookbackStart.toISOString())
        .order('open_time', { ascending: true })
        .limit(500);

      if (!allCandles || allCandles.length === 0) continue;

      // Detect swings and calculate closes
      const detectedSignals = detectSwings(allCandles);
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
      // Fetch latest candles
      const { data: candles, error: candleError } = await supabaseAdmin
        .from('ohlcv_cache')
        .select('open_time, ha_high, ha_low, close, symbol')
        .eq('symbol', symbol)
        .eq('interval', '30m')
        .order('open_time', { ascending: true })
        .limit(200);

      if (candleError || !candles || candles.length === 0) {
        console.warn(`[Sync] No candles for ${symbol}`);
        continue;
      }

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
