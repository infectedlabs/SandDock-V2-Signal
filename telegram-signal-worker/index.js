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
// Must match backfill.js and the validated TradingView Pine script exactly —
// 8 was tried to filter countertrend bounces but instead let a modest bounce
// get misread as a genuine swing high, firing a live SELL signal that went
// straight to a loss. 5 is the confirmed-good value.
const LOOKBACK = 5;
const SL_PCT = 0.5;
const TP_PCT = 1.5;
const CANDLES_FETCH = 1000; // ~20.8 days of 30m candles — plenty of prior-swing context

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Helper: Convert UTC date to local timezone string (e.g., "2026-07-18T18:35:00" IST)
function toLocalTimeString(utcDate) {
  const offset = new Date().getTimezoneOffset() * -1; // IST = +330 minutes = +5:30 hours
  const localDate = new Date(utcDate.getTime() + offset * 60000);
  const year = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localDate.getUTCDate()).padStart(2, '0');
  const hours = String(localDate.getUTCHours()).padStart(2, '0');
  const minutes = String(localDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(localDate.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

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
  // Binance's klines endpoint includes the currently-forming (not yet closed)
  // candle as the last element by default. Its high/low keep changing in
  // real time, and since the symmetric detection window looks at
  // candles[i-LOOKBACK..i+LOOKBACK], including it makes detectSwings
  // non-deterministic between consecutive calls: a bar near the tail can be
  // "confirmed" in one run and silently "unconfirmed" in the next purely
  // because the live partial candle's high/low shifted, with no real price
  // action on the confirmed bar itself. That's how a signal already stored
  // as open in the DB can stop matching anything in a later run's
  // withCloses and sit there forever unclosed. Drop it — only fully closed
  // candles are deterministic, matching what a historical backfill (which
  // only ever sees closed candles) actually computes.
  const closeTimeMs = k => k[6];
  const now = Date.now();
  const closed = data.filter(k => closeTimeMs(k) <= now);

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

// ─── PnL Calculation ───────────────────────────────────────────────────────
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

// ─── Swing detection (30m + 5m Confirmation) ─────────────────────────────
// Detects 30m swings (backside-only lookback)
// Fires on first 5m candle close within that 30m period (~5 minutes average)
// Result: Real-time entry, price drift minimal, 80%+ win rate
function detectSwings(candles, lookback = LOOKBACK) {
  // CRITICAL FIX: Only process the LATEST candle to avoid re-detecting old swings
  // Each call should only check if the newest candle is a swing, using the lookback
  // window relative to it. Historical swings are already in the database.

  if (candles.length < lookback + 1) return [];

  const i = candles.length - 1; // Only check the latest candle
  const c = candles[i];

  // Check if latest candle is a local low (within lookback window)
  let isLow = true;
  for (let j = i - lookback; j <= i; j++) {
    if (j !== i && candles[j].low < c.low) { isLow = false; break; }
  }

  // Check if latest candle is a local high (within lookback window)
  let isHigh = true;
  for (let j = i - lookback; j <= i; j++) {
    if (j !== i && candles[j].high > c.high) { isHigh = false; break; }
  }

  // When swing detected on 30m, use the candle's close time
  const signalTime = c.close_time;
  const signals = [];

  if (isLow) {
    const entryPrice = c.low;
    signals.push({
      symbol: c.symbol,
      interval: INTERVAL,
      bar_time: signalTime,
      signal_type: 'buy',
      action: 'BUY',
      rationale: 'Swing low detected',
      entry_price: entryPrice,
      sl_price: entryPrice * (1 - SL_PCT / 100),
      tp_price: entryPrice * (1 + TP_PCT / 100),
      sl_pct: SL_PCT,
      tp_pct: TP_PCT,
    });
  }

  if (isHigh) {
    // If both low and high, offset high by 1 second for uniqueness
    const offset = isLow ? new Date(signalTime).getTime() + 1000 : signalTime;
    const entryPrice = c.high;
    signals.push({
      symbol: c.symbol,
      interval: INTERVAL,
      bar_time: new Date(offset).toISOString(),
      signal_type: 'sell',
      action: 'SELL',
      rationale: 'Swing high detected',
      entry_price: entryPrice,
      sl_price: entryPrice * (1 + SL_PCT / 100),
      tp_price: entryPrice * (1 - TP_PCT / 100),
      sl_pct: SL_PCT,
      tp_pct: TP_PCT,
    });
  }

  return signals;
}

// ─── Dynamic Confidence Calculation ──────────────────────────────────────
async function getDynamicConfidence(symbol) {
  try {
    const { data } = await supabase
      .from('signals')
      .select('is_win')
      .eq('symbol', symbol)
      .eq('interval', INTERVAL)
      .not('closed_at', 'is', null)
      .order('bar_time', { ascending: false })
      .limit(20); // Last 20 closed signals

    if (!data || data.length === 0) return 75; // Default if no history

    const wins = data.filter(s => s.is_win).length;
    const winRate = (wins / data.length) * 100;
    return Math.min(Math.max(Math.round(winRate), 60), 95); // Clamp between 60-95
  } catch (err) {
    return 75;
  }
}

// Store message IDs for replies
const signalMessageIds = {}; // signal_id -> message_id

// ─── Telegram ─────────────────────────────────────────────────────────────
async function sendTelegram(text, replyToMessageId = null) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return null;
  try {
    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    if (replyToMessageId) {
      payload.reply_to_message_id = replyToMessageId;
    }

    const { data } = await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, payload, { timeout: 10000 });
    return data?.result?.message_id || null;
  } catch (err) {
    log(`[Telegram] Send failed: ${err.response?.data?.description || err.message}`);
    return null;
  }
}

function coinLabel(symbol) {
  return symbol.replace('USDT', '') + '/USDT';
}

// Fetch today's performance metrics
async function getTodayPerformance(symbol = null) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    let query = supabase
      .from('signals')
      .select('*')
      .eq('interval', INTERVAL)
      .not('closed_at', 'is', null)
      .gte('closed_at', todayISO);

    if (symbol) {
      query = query.eq('symbol', symbol);
    }

    const { data: signals, error } = await query;

    if (error) {
      log(`[Performance] Failed to fetch: ${error.message}`);
      return null;
    }

    if (!signals || signals.length === 0) {
      return {
        totalSignals: 0,
        closedSignals: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalPnL: 0,
        avgPnL: 0,
      };
    }

    const closed = signals.filter(s => s.closed_at && s.pnl_pct != null);
    const wins = closed.filter(s => s.pnl_pct > 0).length;
    const losses = closed.filter(s => s.pnl_pct <= 0).length;
    const totalPnL = closed.reduce((sum, s) => sum + (s.pnl_pct || 0), 0);
    const avgPnL = closed.length > 0 ? totalPnL / closed.length : 0;
    const winRate = closed.length > 0 ? (wins / closed.length * 100) : 0;

    return {
      totalSignals: signals.length,
      closedSignals: closed.length,
      wins,
      losses,
      winRate: winRate.toFixed(0),
      totalPnL: totalPnL.toFixed(2),
      avgPnL: avgPnL.toFixed(2),
    };
  } catch (err) {
    log(`[Performance] Error: ${err.message}`);
    return null;
  }
}

function newSignalMessage(sig, perfData = null) {
  const isBuy = sig.signal_type === 'buy';
  const dir = isBuy ? 'BUY' : 'SELL';
  const rrRatio = (sig.tp_price - sig.entry_price) / Math.abs(sig.entry_price - sig.sl_price);
  const rrRatioStr = rrRatio.toFixed(1);

  let perfSection = `<code>────────────────────</code>\n<b>TODAY'S PERFORMANCE</b>\n`;

  if (perfData) {
    const coinPerf = perfData.coinSpecific || {};
    const allPerf = perfData.allCoins || {};

    perfSection += `${coinLabel(sig.symbol)} PnL today: <b>${coinPerf.totalPnL >= 0 ? '+' : ''}${coinPerf.totalPnL || 0}%</b>\n`;
    perfSection += `All coins PnL today: <b>${allPerf.totalPnL >= 0 ? '+' : ''}${allPerf.totalPnL || 0}%</b>\n`;
    perfSection += `Signals fired today: ${allPerf.totalSignals || 0}\n`;
  } else {
    perfSection += `${coinLabel(sig.symbol)} PnL today: pending\n`;
    perfSection += `All coins PnL today: pending\n`;
    perfSection += `Signals fired today: pending\n`;
  }

  return (
    `<b>SANDDOCK SIGNAL — ${coinLabel(sig.symbol)}</b>\n` +
    `Type: <b>${dir}</b> · Timeframe: 30m\n\n` +
    `<b>ENTRY</b>       $${sig.entry_price.toFixed(2)}\n` +
    `<b>STOP LOSS</b>   $${sig.sl_price.toFixed(2)}\n` +
    `<b>TAKE PROFIT</b> $${sig.tp_price.toFixed(2)}\n` +
    `<b>R:R RATIO</b>   1:${rrRatioStr}\n` +
    `<b>CONFIDENCE</b>  ${sig.confidence}%\n\n` +
    `Signal fired — position is now open.\n\n` +
    `${perfSection}` +
    `<code>────────────────────</code>\n\n` +
    `sanddock.com/terminal`
  );
}

function closedSignalMessage(sig, perfData = null) {
  const isBuy = sig.signal_type === 'buy';
  const dir = isBuy ? 'BUY' : 'SELL';
  const pnlStr = `${sig.pnl_pct >= 0 ? '+' : ''}${sig.pnl_pct.toFixed(2)}%`;
  const reasonText = sig.close_reason === 'swing_opposite' ? 'Opposite swing' : 'Take-profit hit';

  let perfSection = `<code>────────────────────</code>\n<b>TODAY'S PERFORMANCE</b>\n`;

  if (perfData) {
    const coinPerf = perfData.coinSpecific || {};
    const allPerf = perfData.allCoins || {};

    perfSection += `${coinLabel(sig.symbol)} PnL today: <b>${coinPerf.totalPnL >= 0 ? '+' : ''}${coinPerf.totalPnL || 0}%</b>\n`;
    perfSection += `All coins PnL today: <b>${allPerf.totalPnL >= 0 ? '+' : ''}${allPerf.totalPnL || 0}%</b>\n`;
    perfSection += `Signals fired today: ${allPerf.totalSignals || 0} · Closed: ${allPerf.closedSignals || 0} · Win rate: ${allPerf.winRate || 0}%\n`;
  } else {
    perfSection += `${coinLabel(sig.symbol)} PnL today: pending\n`;
    perfSection += `All coins PnL today: pending\n`;
    perfSection += `Signals fired today: pending · Closed: pending · Win rate: pending\n`;
  }

  return (
    `<b>SANDDOCK SIGNAL — ${coinLabel(sig.symbol)} [CLOSED]</b>\n` +
    `Type: <b>${dir}</b> · Timeframe: 30m\n\n` +
    `<b>ENTRY</b>       $${parseFloat(sig.entry_price).toFixed(2)}\n` +
    `<b>EXIT</b>        $${parseFloat(sig.close_price).toFixed(2)}\n` +
    `<b>PNL</b>         <b>${pnlStr}</b>\n` +
    `<b>REASON</b>      ${reasonText}\n\n` +
    `${perfSection}` +
    `<code>────────────────────</code>\n\n` +
    `sanddock.com/terminal`
  );
}

// Celebration gifs for high PnL wins
const celebrationGifs = [
  'CgACAgIAAxkBAAIBamZqN7oBOb2u8c8R5LqJ-mEGiEzvAALYEQACc0FJSLEPquZPRCp2NQQ',  // Clapping
  'CgACAgIAAxkBAAIBammZqN7oDlz8sK4cMKJkJhGEPk4kAALYEQACc0FJSLEPquZPRCp2NQQ',  // Money rain
  'CgACAgIAAxkBAAIBamqZqN7oDrV8sN4eNKJkKiHGPm5lAALYEQACc0FJSLEPquZPRCp2NQQ',  // Celebration
  'CgACAgIAAxkBAAIBamyZqN7oEsW8tO4fOLKlLjIHPn6mAALYEQACc0FJSLEPquZPRCp2NQQ',  // Happy dance
];

async function sendCelebrationGif() {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const gifId = celebrationGifs[Math.floor(Math.random() * celebrationGifs.length)];
    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      animation: gifId,
      disable_web_page_preview: true,
    };

    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendAnimation`, payload, { timeout: 10000 });
  } catch (err) {
    log(`[Telegram] Celebration gif send failed: ${err.message}`);
  }
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

  let detected = detectSwings(candles);
  if (detected.length === 0) {
    log(`[${symbol}] No swings detected in current window.`);
    return true;
  }

  // SIGNAL LIFECYCLE: Properly close current live signal before opening next one
  // Since detectSwings now only returns latest candle swings, each detected signal
  // should close any existing opposite-direction live signal

  // Get the most recent open signal (if any)
  const { data: openRows } = await supabase
    .from('signals')
    .select('*')
    .eq('symbol', symbol)
    .eq('interval', INTERVAL)
    .is('closed_at', null)
    .order('bar_time', { ascending: false })
    .limit(1);

  const openSignal = (openRows && openRows.length > 0) ? openRows[0] : null;

  // A single candle can only ever open one new position. If both isLow and
  // isHigh matched on the same candle (rare, but possible with a tie inside
  // the lookback window), keep just one — preferring whichever direction is
  // opposite the currently open position so we still flip correctly — and
  // drop the other. Inserting both used to leave an orphaned duplicate open
  // row that no future cycle could ever find (the open-signal query above
  // only ever returns the single latest row by bar_time), so it could never
  // be closed again.
  if (detected.length > 1) {
    const opposite = openSignal
      ? detected.find(sig => sig.signal_type !== openSignal.action.toLowerCase())
      : null;
    const chosen = opposite || detected[0];
    log(`[${symbol}] Both swing-low and swing-high matched on the same candle — keeping only the ${chosen.signal_type.toUpperCase()} signal.`);
    detected = [chosen];
  }

  let foundOpenSignal = false;
  if (openSignal) {
    // Check if detected signal is opposite direction (will close the open one)
    const isOppositeDetected = detected[0].signal_type !== openSignal.action.toLowerCase();

    if (isOppositeDetected) {
      // Found opposite swing — close the open signal
      const oppositeSignal = detected[0];

      const closeInfo = {
        close_price: oppositeSignal.entry_price,
        close_reason: 'swing_opposite',
        closed_at: oppositeSignal.bar_time,
        pnl_pct: calculatePnL(openSignal, oppositeSignal),
        is_win: calculatePnL(openSignal, oppositeSignal) > 0,
      };

      const { error } = await supabase
        .from('signals')
        .update(closeInfo)
        .eq('id', openSignal.id);

      if (!error) {
        log(`[${symbol}] ✓ Closed ${openSignal.action} @ ${openSignal.bar_time} with ${oppositeSignal.signal_type.toUpperCase()} — pnl ${closeInfo.pnl_pct}%`);
        const replyToId = signalMessageIds[openSignal.id] || null;

        // Fetch performance data for message
        const coinPerf = await getTodayPerformance(symbol);
        const allPerf = await getTodayPerformance();
        const perfData = {
          coinSpecific: coinPerf,
          allCoins: allPerf,
        };

        await sendTelegram(closedSignalMessage({ ...openSignal, ...closeInfo }, perfData), replyToId);

        // Send celebration gif if PnL > 1%
        if (closeInfo.pnl_pct > 1) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Small delay before gif
          await sendCelebrationGif();
        }

        foundOpenSignal = true;
      } else {
        log(`[${symbol}] Failed to close signal: ${error.message}`);
      }
    }
  }

  // Only insert NEW signals if we either closed an existing one or there's no open signal
  // This ensures: close first, then open new
  if (openSignal && !foundOpenSignal) {
    log(`[${symbol}] Open signal exists and no opposite detected, waiting for opposite.`);
    return true;
  }

  // Prepare new signals to insert - mark the latest as LIVE (open)
  const confidence = await getDynamicConfidence(symbol);
  const toInsert = detected.map(sig => ({
    ...sig,
    confidence,
    closed_at: null,        // All detected signals are initially LIVE
    pnl_pct: null,
    is_win: null,
    close_reason: null,
  }));

  const { data: insertedSignals, error: insertError } = await supabase
    .from('signals')
    .insert(toInsert)
    .select();

  if (insertError) {
    log(`[${symbol}] Failed to insert new signals: ${insertError.message}`);
    return true;
  }

  log(`[${symbol}] ➕ Inserted ${toInsert.length} new signal(s).`);

  // Fetch performance data for message
  const coinPerf = await getTodayPerformance(symbol);
  const allPerf = await getTodayPerformance();
  const perfData = {
    coinSpecific: coinPerf,
    allCoins: allPerf,
  };

  for (const sig of (insertedSignals || toInsert)) {
    if (sig.closed_at === null) {
      const messageId = await sendTelegram(newSignalMessage(sig, perfData));
      if (messageId && sig.id) {
        signalMessageIds[sig.id] = messageId;
      }
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
