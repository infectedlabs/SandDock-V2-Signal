// Sanddock Signal Worker
// Always-on Railway service: polls Binance for BTC/ETH/BNB 30m candles,
// closes signals on genuine opposite swings, creates new live signals,
// writes both to Supabase, and posts Telegram alerts to a dedicated channel.

require('dotenv').config();

const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// ─── Config ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
// Polls fast enough to notice a new candle within seconds of Binance closing
// it. This does NOT shrink the ~2.5h swing-confirmation lag (LOOKBACK=5
// candles on both sides is structural to the algorithm) — it only shrinks
// the gap between "Binance has the new candle" and "worker has noticed and
// alerted." A short poll here plus the change-detection guard in
// processSymbol (skip everything if the latest candle hasn't changed) keeps
// this cheap: Binance gets polled constantly, but Supabase/Telegram only get
// hit when a candle has actually changed.
const POLL_INTERVAL_SECONDS = parseInt(process.env.POLL_INTERVAL_SECONDS || '15', 10);

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
const INTERVAL = '30m';
const LOOKBACK = 5;   // must match the rest of the app's swing detection
const SL_PCT = 0.5;
const TP_PCT = 1.5;
const CANDLES_FETCH = 500; // ~10.4 days of 30m candles — plenty of prior-swing context

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[FATAL] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}
if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.warn('[WARN] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — Telegram alerts are disabled.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// ─── Logging ─────────────────────────────────────────────────────────────
function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ─── Binance REST candle fetch ───────────────────────────────────────────
// Futures (fapi), not spot — matches the chart's live websocket
// (stream_subscriber.py connects to fstream.binance.com) and the app's own
// live-price fallback (src/lib/binanceFallback.js uses fapi.binance.com).
// The original backfill script used spot and is left untouched — this is a
// deliberate divergence for the worker only, so its entries/closes line up
// with what's actually shown on the live chart going forward.
async function fetchCandles(symbol, limit = CANDLES_FETCH) {
  const { data } = await axios.get('https://fapi.binance.com/fapi/v1/klines', {
    params: { symbol, interval: INTERVAL, limit },
    timeout: 10000,
  });
  return data.map(k => ({
    open_time: new Date(k[0]).toISOString(),
    open: +k[1],
    high: +k[2],
    low: +k[3],
    close: +k[4],
    symbol,
  }));
}

// ─── Swing detection ─────────────────────────────────────────────────────
// Exact port of scripts/reset_and_backfill_1y_all_coins.js:detectSwingSignals().
// Symmetric window candles[i-LOOKBACK..i+LOOKBACK] over RAW high/low — the
// Heikin-Ashi-based / backward-only-window variant that briefly existed
// elsewhere in this app disagreed with this reference on both swing timing
// and direction, so this is the only version that should ever be used.
function detectSwings(candles, lookback = LOOKBACK) {
  const signals = [];
  let lastLow = null;
  let lastHigh = null;

  for (let i = lookback; i < candles.length - lookback; i++) {
    const c = candles[i];

    let isLow = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && candles[j].low < c.low) { isLow = false; break; }
    }

    let isHigh = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && candles[j].high > c.high) { isHigh = false; break; }
    }

    if (isLow && lastHigh !== null) {
      const entryPrice = c.low;
      signals.push({
        symbol: c.symbol,
        interval: INTERVAL,
        bar_time: c.open_time,
        signal_type: 'buy',
        entry_price: entryPrice,
        sl_price: entryPrice * (1 - SL_PCT / 100),
        tp_price: entryPrice * (1 + TP_PCT / 100),
        sl_pct: SL_PCT,
        tp_pct: TP_PCT,
        confidence: 95,
      });
      lastLow = c.low;
    }

    if (isHigh && lastLow !== null) {
      const entryPrice = c.high;
      signals.push({
        symbol: c.symbol,
        interval: INTERVAL,
        bar_time: c.open_time,
        signal_type: 'sell',
        entry_price: entryPrice,
        sl_price: entryPrice * (1 + SL_PCT / 100),
        tp_price: entryPrice * (1 - TP_PCT / 100),
        sl_pct: SL_PCT,
        tp_pct: TP_PCT,
        confidence: 95,
      });
      lastHigh = c.high;
    }

    if (isLow) lastLow = c.low;
    if (isHigh) lastHigh = c.high;
  }

  return signals;
}

// ─── Close calculation ────────────────────────────────────────────────────
// Every signal gets a close computed, including the still-open one at the
// end of the chain — for that one this is only a PLACEHOLDER
// (close_reason: 'tp_hit', closed_at = its own bar_time, pnl_pct = tp_pct)
// so markTrailingSignalLive() can detect and revert it. NEVER write that
// placeholder to the DB as a real close — only 'swing_opposite' is genuine.
function calculateCloses(signals) {
  return signals.map((sig, i) => {
    const entryPrice = parseFloat(sig.entry_price);
    const isBuy = sig.signal_type === 'buy';

    let nextOppositeIdx = -1;
    for (let j = i + 1; j < signals.length; j++) {
      if (isBuy !== (signals[j].signal_type === 'buy')) { nextOppositeIdx = j; break; }
    }

    let closePrice, closeReason, closedAt, pnlPct, isWin;
    if (nextOppositeIdx !== -1) {
      const next = signals[nextOppositeIdx];
      closePrice = parseFloat(next.entry_price);
      closedAt = next.bar_time;
      closeReason = 'swing_opposite';
      const change = isBuy
        ? ((closePrice - entryPrice) / entryPrice) * 100
        : ((entryPrice - closePrice) / entryPrice) * 100;
      pnlPct = Number(change.toFixed(2));
      isWin = pnlPct > 0;
    } else {
      closePrice = parseFloat(sig.tp_price);
      closedAt = sig.bar_time;
      closeReason = 'tp_hit'; // placeholder — see comment above
      pnlPct = parseFloat(sig.tp_pct);
      isWin = true;
    }

    return {
      ...sig,
      action: isBuy ? 'BUY' : 'SELL',
      rationale: `Swing ${isBuy ? 'low' : 'high'} detected`,
      close_price: closePrice,
      close_reason: closeReason,
      closed_at: closedAt,
      pnl_pct: pnlPct,
      is_win: isWin,
    };
  });
}

// calculateCloses() only searches forward for the next OPPOSITE-direction
// signal (matches the app's original backfill methodology — deliberately
// left untouched so historical 'swing_opposite' closes/winrate never
// change). Anything it couldn't match that way gets a placeholder close
// (close_reason !== 'swing_opposite') that was meant to represent "still
// open." But if several consecutive same-direction swings occur with no
// opposite ever following any of them, EVERY one of them gets that same
// placeholder — and reverting all of them to live at once is exactly how
// a symbol ends up with multiple simultaneously-open rows (the BNBUSDT bug).
//
// Fix: only the chronologically LAST signal in the whole array can
// genuinely still be open (nothing has happened after it yet). Every other
// placeholder-closed signal must have been superseded by whatever
// immediately follows it — which, by construction, has to be same-direction
// (a real opposite would already have been matched by calculateCloses).
// This only touches placeholder entries; anything already 'swing_opposite'
// is left completely untouched, so no historical PnL/winrate changes.
function resolveTrailingSupersession(withCloses) {
  for (let i = 0; i < withCloses.length; i++) {
    const sig = withCloses[i];
    if (sig.close_reason === 'swing_opposite') continue;

    const isLastOverall = i === withCloses.length - 1;
    if (isLastOverall) {
      sig.closed_at = null;
      sig.pnl_pct = null;
      sig.is_win = null;
      continue;
    }

    const next = withCloses[i + 1];
    const entryPrice = parseFloat(sig.entry_price);
    const closePrice = parseFloat(next.entry_price);
    const isBuy = sig.signal_type === 'buy';
    const change = isBuy
      ? ((closePrice - entryPrice) / entryPrice) * 100
      : ((entryPrice - closePrice) / entryPrice) * 100;

    sig.close_price = closePrice;
    sig.close_reason = 'superseded';
    sig.closed_at = next.bar_time;
    sig.pnl_pct = Number(change.toFixed(2));
    sig.is_win = sig.pnl_pct > 0;
  }
  return withCloses;
}

// ─── Telegram ─────────────────────────────────────────────────────────────
async function sendTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }, { timeout: 10000 });
  } catch (err) {
    log(`[Telegram] Send failed: ${err.response?.data?.description || err.message}`);
  }
}

function coinLabel(symbol) {
  return symbol.replace('USDT', '') + '/USDT';
}

function newSignalMessage(sig) {
  const dir = sig.signal_type === 'buy' ? '🟢 BUY' : '🔴 SELL';
  return (
    `${dir} <b>${coinLabel(sig.symbol)}</b> (30m)\n\n` +
    `Entry: <b>${sig.entry_price.toFixed(2)}</b>\n` +
    `Stop Loss: ${sig.sl_price.toFixed(2)}\n` +
    `Take Profit: ${sig.tp_price.toFixed(2)}\n` +
    `Confidence: ${sig.confidence}%\n` +
    `Bar: ${sig.bar_time}`
  );
}

function closedSignalMessage(sig) {
  const win = sig.is_win;
  const icon = win ? '✅' : '❌';
  const dir = sig.signal_type === 'buy' ? 'BUY' : 'SELL';
  const pnlStr = `${sig.pnl_pct >= 0 ? '+' : ''}${sig.pnl_pct.toFixed(2)}%`;
  const reasonStr = sig.close_reason === 'superseded'
    ? 'superseded by a newer same-direction signal'
    : 'opposite swing confirmed';
  return (
    `${icon} <b>${coinLabel(sig.symbol)}</b> ${dir} closed\n\n` +
    `Entry: ${parseFloat(sig.entry_price).toFixed(2)}\n` +
    `Close: ${sig.close_price.toFixed(2)}\n` +
    `PnL: <b>${pnlStr}</b>\n` +
    `Reason: ${reasonStr}`
  );
}

// ─── Per-symbol cycle ─────────────────────────────────────────────────────
async function processSymbol(symbol) {
  const candles = await fetchCandles(symbol);
  if (candles.length < LOOKBACK * 2 + 1) {
    log(`[${symbol}] Not enough candles fetched (${candles.length}), skipping.`);
    return;
  }

  // Skip everything below if Binance hasn't produced a new candle since we
  // last looked — with a 15s poll this check itself runs constantly, but
  // Supabase/Telegram only get touched once every ~30 minutes per symbol
  // (when a candle genuinely closes), not once every 15 seconds.
  const latestCandleTime = candles[candles.length - 1].open_time;
  if (lastSeenCandle[symbol] === latestCandleTime) return false;
  lastSeenCandle[symbol] = latestCandleTime;
  log(`[${symbol}] New candle @ ${latestCandleTime}, checking for swings...`);

  const detected = detectSwings(candles);
  if (detected.length === 0) {
    log(`[${symbol}] No swings detected in current window.`);
    return true;
  }
  const withCloses = calculateCloses(detected);
  resolveTrailingSupersession(withCloses); // in place — see comment on the function

  // 1. Try to close the currently open signal, if it's no longer genuinely live.
  const { data: openRows } = await supabase
    .from('signals')
    .select('*')
    .eq('symbol', symbol)
    .eq('interval', INTERVAL)
    .is('closed_at', null)
    .order('bar_time', { ascending: false })
    .limit(1);

  const openSignal = openRows?.[0];
  if (openSignal) {
    const openBarMs = new Date(openSignal.bar_time).getTime();
    const match = withCloses.find(s => {
      const sameAction = s.signal_type === openSignal.action.toLowerCase();
      const sameBar = Math.abs(new Date(s.bar_time).getTime() - openBarMs) < 1000;
      return sameAction && sameBar;
    });

    // Both 'swing_opposite' (real reversal) and 'superseded' (a later
    // same-direction signal took over) are genuine closes now — the only
    // thing that stays live is whatever resolveTrailingSupersession left
    // with closed_at === null (the true chronological last signal).
    if (match && match.closed_at !== null) {
      const { error } = await supabase
        .from('signals')
        .update({
          close_price: match.close_price,
          close_reason: match.close_reason,
          closed_at: match.closed_at,
          pnl_pct: match.pnl_pct,
          is_win: match.is_win,
        })
        .eq('id', openSignal.id);

      if (!error) {
        log(`[${symbol}] Closed ${openSignal.action} @ ${openSignal.bar_time} — pnl ${match.pnl_pct}%`);
        await sendTelegram(closedSignalMessage({ ...openSignal, ...match }));
      } else {
        log(`[${symbol}] Failed to close signal: ${error.message}`);
      }
    }
  }

  // 2. Insert any genuinely new signals (bar_time after the latest one we've stored).
  const { data: latestRows } = await supabase
    .from('signals')
    .select('bar_time')
    .eq('symbol', symbol)
    .eq('interval', INTERVAL)
    .order('bar_time', { ascending: false })
    .limit(1);

  const lastStoredBarTime = latestRows?.[0]?.bar_time ? new Date(latestRows[0].bar_time) : new Date(0);
  // withCloses was already resolved in place above — no separate
  // markTrailingSignalLive step needed.
  const newOnes = withCloses.filter(s => new Date(s.bar_time) > lastStoredBarTime);
  if (newOnes.length === 0) {
    log(`[${symbol}] Up to date, nothing new.`);
    return true;
  }

  // Dedupe by bar_time (defensive — detectSwings shouldn't produce duplicates)
  const seen = new Set();
  const deduped = newOnes.filter(s => (seen.has(s.bar_time) ? false : (seen.add(s.bar_time), true)));

  const { error: insertError } = await supabase
    .from('signals')
    .upsert(deduped, { onConflict: 'symbol,interval,bar_time' });

  if (insertError) {
    log(`[${symbol}] Failed to insert new signals: ${insertError.message}`);
    return true;
  }

  log(`[${symbol}] Inserted ${deduped.length} new signal(s).`);
  for (const sig of deduped) {
    // Only alert on the currently-live one plus any genuinely-closed catch-up
    // signals — a cold start against an empty table could otherwise replay
    // months of history as a wall of Telegram messages.
    if (sig.closed_at === null) {
      await sendTelegram(newSignalMessage(sig));
    } else {
      await sendTelegram(closedSignalMessage(sig));
    }
  }
  return true;
}

// ─── Main cycle ───────────────────────────────────────────────────────────
let isRunning = false;
let lastRunAt = null;
let lastRunError = null;
const lastSeenCandle = {}; // symbol -> latest candle open_time seen so far

async function runCycle() {
  if (isRunning) {
    log('Cycle already in progress, skipping this tick.');
    return;
  }
  isRunning = true;
  const start = Date.now();
  let didWork = false;
  try {
    for (const symbol of SYMBOLS) {
      try {
        if (await processSymbol(symbol)) didWork = true;
      } catch (err) {
        log(`[${symbol}] Error: ${err.message}`);
        didWork = true; // errors are worth a completion log even if nothing changed
      }
    }
    lastRunError = null;
  } catch (err) {
    lastRunError = err.message;
    log(`Cycle error: ${err.message}`);
    didWork = true;
  } finally {
    lastRunAt = new Date().toISOString();
    isRunning = false;
    // At a 15s poll this fires constantly if logged unconditionally — only
    // worth logging when a symbol actually had a new candle to process.
    if (didWork) log(`Cycle complete in ${((Date.now() - start) / 1000).toFixed(1)}s`);
  }
}

// ─── HTTP server (Railway health check) ──────────────────────────────────
const app = express();

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    symbols: SYMBOLS,
    interval: INTERVAL,
    pollIntervalSeconds: POLL_INTERVAL_SECONDS,
    isRunning,
    lastRunAt,
    lastRunError,
    lastSeenCandle,
    uptimeSeconds: process.uptime(),
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  log(`Signal worker listening on port ${PORT}`);
  runCycle();
  setInterval(runCycle, POLL_INTERVAL_SECONDS * 1000);
});

process.on('SIGTERM', () => { log('SIGTERM received, shutting down.'); process.exit(0); });
process.on('SIGINT', () => { log('SIGINT received, shutting down.'); process.exit(0); });
