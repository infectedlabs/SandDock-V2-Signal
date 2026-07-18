import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const CONFIG = {
  SYMBOLS: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
  TIMEFRAME: '30m',
  LOOKBACK: 5,
  SL_PCT: 0.5,
  TP_PCT: 1.5,
  CANDLES_FETCH: 500,
};

// ─── SWING DETECTION ────────────────────────────────────────────────
// Backside-only lookback: checks PAST bars only (no future confirmation needed)
// This enables LIVE signals without waiting for future candles
// Must use RAW high/low (candles come from Binance klines), not Heikin-Ashi
// Window: candles[i-LOOKBACK .. i] (backward only)
function detectSwings(candles, lookback = CONFIG.LOOKBACK) {
  const signals = [];
  let lastLow = null;
  let lastHigh = null;

  for (let i = lookback; i < candles.length; i++) {
    const c = candles[i];

    let isLow = true;
    for (let j = i - lookback; j <= i; j++) {
      if (j !== i && candles[j].low < c.low) {
        isLow = false;
        break;
      }
    }

    let isHigh = true;
    for (let j = i - lookback; j <= i; j++) {
      if (j !== i && candles[j].high > c.high) {
        isHigh = false;
        break;
      }
    }

    if (isLow && lastHigh !== null) {
      const entryPrice = c.low;
      const slPrice = entryPrice * (1 - CONFIG.SL_PCT / 100);
      const tpPrice = entryPrice * (1 + CONFIG.TP_PCT / 100);

      signals.push({
        symbol: c.symbol,
        interval: CONFIG.TIMEFRAME,
        bar_time: c.open_time,
        signal_type: 'buy',
        entry_price: entryPrice,
        sl_price: slPrice,
        tp_price: tpPrice,
        sl_pct: CONFIG.SL_PCT,
        tp_pct: CONFIG.TP_PCT,
        confidence: 95,
      });

      lastLow = c.low;
    }

    if (isHigh && lastLow !== null) {
      const entryPrice = c.high;
      const slPrice = entryPrice * (1 + CONFIG.SL_PCT / 100);
      const tpPrice = entryPrice * (1 - CONFIG.TP_PCT / 100);

      signals.push({
        symbol: c.symbol,
        interval: CONFIG.TIMEFRAME,
        bar_time: c.open_time,
        signal_type: 'sell',
        entry_price: entryPrice,
        sl_price: slPrice,
        tp_price: tpPrice,
        sl_pct: CONFIG.SL_PCT,
        tp_pct: CONFIG.TP_PCT,
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

// ─── CATCH-UP: CLOSE OPEN SIGNALS AND GENERATE MISSED ONES ──────────
async function catchUpSignals() {
  const results = { closed: 0, created: 0, errors: [], details: {} };

  for (const symbol of CONFIG.SYMBOLS) {
    results.details[symbol] = { status: 'pending' };
    try {
      // 1. Find the latest OPEN signal (closed_at=null)
      const { data: openSignals } = await supabaseAdmin
        .from('signals')
        .select('*')
        .eq('symbol', symbol)
        .eq('interval', '30m')
        .is('closed_at', null)
        .order('bar_time', { ascending: false })
        .limit(1);

      if (!openSignals || openSignals.length === 0) {
        results.details[symbol] = { status: 'no_open_signals' };
        console.log(`[Catch-up] ${symbol}: No open signals to close`);
        continue;
      }

      const openSignal = openSignals[0];
      const openBarTime = new Date(openSignal.bar_time);
      // Fetch a WIDE window before the signal (60 candles = 30 hours) so that
      // detectSwings() already has a prior opposite swing established (lastLow/lastHigh
      // set) by the time it reaches the open signal's bar. Without this, the open
      // signal is the FIRST swing found in the window and detectSwings() never emits
      // a signal for it (it only records lastHigh/lastLow, no push), so matching
      // always fails downstream.
      const lookbackStart = new Date(openBarTime.getTime() - 60 * 30 * 60 * 1000);

      console.log(`[Catch-up] ${symbol}: Found open signal at ${openSignal.bar_time}, fetching from ${lookbackStart.toISOString()} through now...`);

      // 2. Fetch candles from WELL BEFORE the signal through to the LATEST candle (no upper bound)
      // so we catch every missed signal between the open signal and today, not just a fixed window.
      const { data: allCandles } = await supabaseAdmin
        .from('ohlcv_cache')
        .select('open_time, high, low, close, symbol')
        .eq('symbol', symbol)
        .eq('interval', '30m')
        .gte('open_time', lookbackStart.toISOString())
        .order('open_time', { ascending: true })
        .limit(CONFIG.CANDLES_FETCH);

      if (!allCandles || allCandles.length === 0) {
        results.details[symbol] = {
          status: 'no_candles',
          openSignal: openSignal.bar_time,
          lookbackStart: lookbackStart.toISOString()
        };
        throw new Error(`No candles found from ${lookbackStart.toISOString()}`);
      }

      // Supabase returns numeric columns as strings — parse before comparing (matches `+k[2]`/`+k[3]` in the reference backfill)
      const parsedCandles = allCandles.map(c => ({
        ...c,
        high: parseFloat(c.high),
        low: parseFloat(c.low),
      }));

      console.log(`[Catch-up] ${symbol}: Fetched ${parsedCandles.length} candles from open signal`);

      // 3. Detect all swings from this point
      const detectedSignals = detectSwings(parsedCandles);
      console.log(`[Catch-up] ${symbol}: Detected ${detectedSignals.length} swings from ${allCandles.length} candles`);
      if (detectedSignals.length > 0) {
        console.log(`[Catch-up] ${symbol}: First few detected: ${detectedSignals.slice(0, 3).map(s => `${s.signal_type}@${s.bar_time}`).join(', ')}`);
      }
      if (detectedSignals.length === 0) {
        console.log(`[Catch-up] ${symbol}: No swings detected`);
        continue;
      }

      // 4. Calculate closes for all detected signals
      const withCloses = calculateCloses(detectedSignals);
      console.log(`[Catch-up] ${symbol}: Calculated closes for ${withCloses.length} signals`);

      // 5. Find which signal matches the open signal and close it
      // Use flexible timestamp comparison to handle timezone differences
      const openBarTimeMs = openBarTime.getTime();
      console.log(`[Catch-up] ${symbol}: Looking for ${openSignal.action.toLowerCase()} signal at ${openBarTime.toISOString()} (${openBarTimeMs})`);

      const matchingSignalIdx = withCloses.findIndex(s => {
        const signalTime = new Date(s.bar_time).getTime();
        const actionMatch = s.signal_type === openSignal.action.toLowerCase();
        const timeMatch = Math.abs(signalTime - openBarTimeMs) < 1000; // Allow 1 second difference
        if (actionMatch && Math.abs(signalTime - openBarTimeMs) < 60000) { // Within 1 minute
          console.log(`[Catch-up] ${symbol}: Comparing ${s.signal_type}@${s.bar_time} - action match: ${actionMatch}, time diff: ${Math.abs(signalTime - openBarTimeMs)}ms`);
        }
        return actionMatch && timeMatch;
      });

      if (matchingSignalIdx === -1) {
        const sameDayOrNear = withCloses.filter(s => {
          const diffHrs = Math.abs(new Date(s.bar_time).getTime() - openBarTimeMs) / 3600000;
          return diffHrs < 6;
        });
        results.details[symbol] = {
          status: 'no_match',
          lookingFor: `${openSignal.action.toLowerCase()} at ${openSignal.bar_time}`,
          detectedCount: withCloses.length,
          nearby: sameDayOrNear.map(s => `${s.signal_type}@${s.bar_time}`),
          detected: withCloses.length > 0 ? withCloses.map(s => `${s.signal_type}@${s.bar_time}`).slice(0, 5) : []
        };
        console.log(`[Catch-up] ${symbol}: NO MATCH FOUND. Looking for: ${openSignal.action.toLowerCase()} at ${openSignal.bar_time}`);
        console.log(`[Catch-up] ${symbol}: Total detected signals: ${withCloses.length}`);
        if (withCloses.length > 0) {
          console.log(`[Catch-up] ${symbol}: All detected: ${withCloses.map(s => `${s.signal_type}@${s.bar_time}`).join(', ')}`);
        }
        continue;
      }

      const closedSignal = withCloses[matchingSignalIdx];

      // calculateCloses() assigns EVERY detected signal a close, including the
      // still-open/trailing one at the end of the chain — for that one it
      // fabricates a placeholder (close_reason: 'tp_hit', closed_at = its own
      // bar_time, pnl_pct = the fixed tp_pct) so downstream code can flag and
      // revert it via markTrailingSignalLive(). Only a real 'swing_opposite'
      // close reflects an actual next swing in the opposite direction — if the
      // matched signal is the LAST one detected (no real successor yet), it's
      // still genuinely live and must NOT be written as closed, or every
      // sync/catch-up run fabricates a fake +tp_pct% win for the current live
      // trade.
      if (closedSignal.close_reason !== 'swing_opposite') {
        results.details[symbol] = {
          status: 'still_live',
          bar_time: openSignal.bar_time,
          note: 'Matched signal has no real opposite swing yet — left open, not closed'
        };
        console.log(`[Catch-up] ${symbol}: Signal at ${openSignal.bar_time} has no real opposite swing yet — leaving live`);
        continue;
      }

      console.log(`[Catch-up] ${symbol}: Closing signal - reason: ${closedSignal.close_reason}, pnl: ${closedSignal.pnl_pct}%`);

      // Update the open signal with close information
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

      // 6. Create all NEW signals that came AFTER the open signal
      const newSignals = withCloses.filter(
        (s, idx) => idx > matchingSignalIdx && new Date(s.bar_time) > new Date(openSignal.bar_time)
      );

      if (newSignals.length > 0) {
        // Mark trailing signals live
        markTrailingSignalLive(newSignals);

        // Store new signals
        const { error: storeError } = await supabaseAdmin
          .from('signals')
          .upsert(newSignals, { onConflict: 'symbol,interval,bar_time' });

        if (!storeError) {
          console.log(`[Catch-up] ${symbol}: Created ${newSignals.length} missed signals`);
          results.created += newSignals.length;
        }
      }

    } catch (err) {
      const msg = `${symbol}: ${err.message}`;
      results.errors.push(msg);
      console.error(`[Catch-up] Error for ${msg}`);
    }
  }

  return results;
}

export async function GET(request) {
  try {
    console.log('[Catch-up] Starting catch-up: close open signals & generate missed ones...');
    const results = await catchUpSignals();

    return NextResponse.json({
      status: 'success',
      message: `Closed ${results.closed} signals, created ${results.created} new signals`,
      ...results
    });
  } catch (err) {
    console.error('[Catch-up] Fatal error:', err);
    return NextResponse.json({
      status: 'error',
      message: err.message
    }, { status: 500 });
  }
}
