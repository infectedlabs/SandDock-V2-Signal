// Sanddock Signal Worker
// Always-on Railway service: listens to Binance's live kline WebSocket for
// BTC/ETH/BNB 30m candles, closes signals on genuine opposite swings,
// creates new live signals, writes both to Supabase, and posts Telegram
// alerts to a dedicated channel — the instant each candle closes.
//
// Why WebSocket and not REST polling: a signal is only useful in the
// Telegram channel if it lands the moment it's confirmed, not minutes (or
// even 15s) later — polling always trades some delay for request volume.
// Binance pushes a kline-closed event the moment it happens, so there is no
// polling delay to trade away. It also scales to any number of symbols on a
// single connection with zero REST rate-limit cost, unlike REST polling
// which scales linearly with symbol count (Binance has no multi-symbol
// klines endpoint). REST is only used here for two things: fetching the
// LOOKBACK candle context needed to run swing detection once a close event
// fires, and a slow safety-net sweep in case a WebSocket message is ever
// dropped — both are cheap and don't grow with polling frequency.

require('dotenv').config();

const express = require('express');
const axios = require('axios');
const WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');

// ─── Config ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
// Backstop only — the WebSocket is the real-time trigger. This just catches
// the rare case of a dropped WS message. Runs the same cheap change-detection
// guard as everything else, so it costs nothing when there's no new candle.
const SAFETY_NET_INTERVAL_SECONDS = parseInt(process.env.SAFETY_NET_INTERVAL_SECONDS || '180', 10);

// Matches the exact path already proven working in production by
// backend/stream_subscriber.py — Binance's documented `/stream?streams=` and
// `/ws/` paths both connected but delivered zero messages when tested
// directly against this account/region; this one delivers within ~1s.
const BINANCE_WS_BASE = 'wss://fstream.binance.com/market/stream?streams=';

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
  let data;
  try {
    ({ data } = await axios.get('https://fapi.binance.com/fapi/v1/klines', {
      params: { symbol, interval: INTERVAL, limit },
      timeout: 10000,
    }));
  } catch (err) {
    if (err.response?.status === 451) {
      throw new Error(
        `Binance returned 451 (Unavailable For Legal Reasons) — this host's IP is in a region ` +
        `Binance blocks (binance.com/fapi is not available to US-based traffic; Binance.US has no ` +
        `futures data). Fix: change this service's deploy region to a non-US region in Railway's ` +
        `Settings -> Deploy -> Region.`
      );
    }
    throw err;
  }
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
  // last looked. In normal operation the WebSocket only calls this once a
  // candle has genuinely closed, so this is mostly a no-op guard against the
  // safety-net sweep reprocessing a candle the WebSocket already handled.
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

// ─── Shared state ───────────────────────────────────────────────────────
const lastSeenCandle = {}; // symbol -> latest candle open_time seen so far
const inFlight = {};       // symbol -> true while a processSymbol() call is running for it
let lastEventAt = null;
let lastEventError = null;
let wsConnected = false;
let wsConnectCount = 0;
let lastMessageAt = null; // any WS message, not just candle-close events

// A symbol is processed independently of the others — one busy/slow symbol
// must never block another symbol's candle-close event from being handled
// immediately, so concurrency is guarded per-symbol, not globally.
async function trigger(symbol, source) {
  if (inFlight[symbol]) {
    log(`[${symbol}] Already processing, dropping duplicate ${source} trigger.`);
    return;
  }
  inFlight[symbol] = true;
  const start = Date.now();
  try {
    const didWork = await processSymbol(symbol);
    if (didWork) log(`[${symbol}] (${source}) handled in ${((Date.now() - start) / 1000).toFixed(2)}s`);
    lastEventAt = new Date().toISOString();
    lastEventError = null;
  } catch (err) {
    lastEventError = `${symbol}: ${err.message}`;
    log(`[${symbol}] (${source}) Error: ${err.message}`);
  } finally {
    inFlight[symbol] = false;
  }
}

// ─── Binance WebSocket (primary, real-time trigger) ──────────────────────
function connectWebSocket() {
  const streams = SYMBOLS.map(s => `${s.toLowerCase()}@kline_${INTERVAL}`).join('/');
  const url = BINANCE_WS_BASE + streams;
  const ws = new WebSocket(url);
  wsConnectCount++;
  const connectedAt = Date.now();
  let watchdogWarned = false;

  ws.on('open', () => {
    wsConnected = true;
    log(`WebSocket connected (attempt ${wsConnectCount}): ${SYMBOLS.join(', ')} @ ${INTERVAL}`);
  });

  ws.on('message', (raw) => {
    lastMessageAt = Date.now();
    try {
      const msg = JSON.parse(raw);
      const k = msg?.data?.k;
      if (!k) return;
      // k.x === true means this candle has closed — that's the exact moment
      // a signal for this bar becomes possible to confirm. Fire immediately;
      // don't await here, so one symbol's processing can't delay another's
      // message from being read off the socket.
      if (k.x === true) {
        trigger(k.s, 'websocket');
      }
    } catch (err) {
      log(`WebSocket message parse error: ${err.message}`);
    }
  });

  ws.on('error', (err) => {
    log(`WebSocket error: ${err.message}`);
  });

  ws.on('close', (code, reason) => {
    wsConnected = false;
    log(`WebSocket closed (code=${code} reason=${reason || 'none'}). Reconnecting in 5s...`);
    setTimeout(connectWebSocket, 5000);
  });

  // Binance pushes a kline update on every trade for the open candle, so
  // under any real market activity a message should arrive within seconds.
  // A connection that "opens" but never delivers anything is the exact
  // symptom of a geo-blocked host (handshake succeeds, Binance silently
  // sends nothing) — the same root cause as the REST 451 error, just
  // without an explicit status code to log. Warn once so it's diagnosable
  // from logs alone instead of looking like a silently-idle connection.
  const watchdog = setInterval(() => {
    if (!wsConnected) { clearInterval(watchdog); return; }
    if (!watchdogWarned && Date.now() - connectedAt > 90000 && (!lastMessageAt || lastMessageAt < connectedAt)) {
      watchdogWarned = true;
      log('[WARN] WebSocket has been open for 90s with zero messages received. This usually means ' +
          "the connection handshake succeeded but Binance is silently not delivering data — the " +
          'same geo-restriction that causes the REST 451 error. If REST is also failing, change ' +
          "this service's deploy region to a non-US region in Railway's Settings -> Deploy -> Region.");
    }
  }, 30000);
}

// ─── REST safety net (backstop only) ──────────────────────────────────────
// Catches the rare dropped WebSocket message. Reuses the same
// change-detection guard in processSymbol, so this is a no-op (one cheap
// REST call per symbol) whenever the WebSocket has already kept up.
function startSafetyNet() {
  setInterval(() => {
    for (const symbol of SYMBOLS) trigger(symbol, 'safety-net');
  }, SAFETY_NET_INTERVAL_SECONDS * 1000);
}

// ─── HTTP server (Railway health check) ──────────────────────────────────
const app = express();

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    symbols: SYMBOLS,
    interval: INTERVAL,
    wsConnected,
    wsConnectCount,
    lastMessageAt: lastMessageAt ? new Date(lastMessageAt).toISOString() : null,
    safetyNetIntervalSeconds: SAFETY_NET_INTERVAL_SECONDS,
    lastEventAt,
    lastEventError,
    lastSeenCandle,
    uptimeSeconds: process.uptime(),
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  log(`Signal worker listening on port ${PORT}`);
  // Catch up on anything missed while offline, then go fully event-driven.
  for (const symbol of SYMBOLS) trigger(symbol, 'startup');
  connectWebSocket();
  startSafetyNet();
});

process.on('SIGTERM', () => { log('SIGTERM received, shutting down.'); process.exit(0); });
process.on('SIGINT', () => { log('SIGINT received, shutting down.'); process.exit(0); });
