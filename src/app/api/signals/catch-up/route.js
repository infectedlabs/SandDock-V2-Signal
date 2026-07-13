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
function detectSwings(candles, lookback = 5) {
  const highs = candles.map(c => c.ha_high);
  const lows = candles.map(c => c.ha_low);
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
        const slPrice = entryPrice * 0.995;
        const tpPrice = entryPrice * 1.015;

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
        const slPrice = entryPrice * 1.005;
        const tpPrice = entryPrice * 0.985;

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
      // Lookback 5 candles * 30m = 150 minutes before signal
      // PLUS lookback 5 after to ensure detection algorithm has context after the signal
      const lookbackStart = new Date(openBarTime.getTime() - 150 * 60 * 1000);
      const lookbackEnd = new Date(openBarTime.getTime() + 150 * 60 * 1000); // 150 min after

      console.log(`[Catch-up] ${symbol}: Found open signal at ${openSignal.bar_time}, fetching context...`);

      // 2. Fetch candles from BEFORE the signal onwards, PLUS after
      // CRITICAL: detectSwings() needs:
      //   - LOOKBACK candles BEFORE to establish the window
      //   - LOOKBACK candles AFTER to properly identify the peak/trough
      const { data: allCandles } = await supabaseAdmin
        .from('ohlcv_cache')
        .select('open_time, ha_high, ha_low, close, symbol')
        .eq('symbol', symbol)
        .eq('interval', '30m')
        .gte('open_time', lookbackStart.toISOString())
        .lte('open_time', lookbackEnd.toISOString())
        .order('open_time', { ascending: true })
        .limit(CONFIG.CANDLES_FETCH);

      if (!allCandles || allCandles.length === 0) {
        results.details[symbol] = {
          status: 'no_candles',
          openSignal: openSignal.bar_time,
          lookbackStart: lookbackStart.toISOString(),
          lookbackEnd: lookbackEnd.toISOString()
        };
        throw new Error(`No candles found from ${lookbackStart.toISOString()} to ${lookbackEnd.toISOString()}`);
      }

      console.log(`[Catch-up] ${symbol}: Fetched ${allCandles.length} candles from open signal`);

      // 3. Detect all swings from this point
      const detectedSignals = detectSwings(allCandles);
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
        results.details[symbol] = {
          status: 'no_match',
          lookingFor: `${openSignal.action.toLowerCase()} at ${openSignal.bar_time}`,
          detectedCount: withCloses.length,
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
