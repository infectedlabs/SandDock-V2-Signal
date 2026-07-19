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
const SAFETY_NET_INTERVAL_SECONDS = parseInt(process.env.SAFETY_NET_INTERVAL_SECONDS || '180', 10);
const BINANCE_WS_BASE = 'wss://fstream.binance.com/market/stream?streams=';

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
const INTERVAL = '30m';
const LOOKBACK = 5;
const SL_PCT = 0.5;
const TP_PCT = 1.5;
const CANDLES_FETCH = 1000;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function toLocalTimeString(utcDate) {
  const offset = new Date().getTimezoneOffset() * -1;
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

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

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

function detectSwings(candles, lookback = LOOKBACK) {
  if (candles.length < lookback + 1) return [];

  const signals = [];

  // Scan through recent candles (not just the last one) to find swings
  // Start from lookback+1 so we have enough historical context
  const startIdx = Math.max(lookback + 1, candles.length - 100); // scan last 100 candles
  for (let i = startIdx; i < candles.length; i++) {
    const c = candles[i];

    // Check if this candle is a local low
    let isLow = true;
    for (let j = i - lookback; j <= i; j++) {
      if (j !== i && candles[j].low < c.low) {
        isLow = false;
        break;
      }
    }

    // Check if this candle is a local high
    let isHigh = true;
    for (let j = i - lookback; j <= i; j++) {
      if (j !== i && candles[j].high > c.high) {
        isHigh = false;
        break;
      }
    }

    if (isLow) {
      signals.push({
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
              });
    }

    if (isHigh) {
      const offset = isLow ? new Date(c.close_time).getTime() + 1000 : c.close_time;
      signals.push({
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
              });
    }
  }

  return signals;
}

function detectWickSwings(openCandle, historicalCandles, lookback = LOOKBACK) {
  const signals = [];

  if (historicalCandles.length < lookback) return signals;

  const allCandles = [...historicalCandles, openCandle];
  const i = allCandles.length - 1;
  const c = openCandle;

  let isWickLow = true;
  for (let j = i - lookback; j < i; j++) {
    if (allCandles[j].low < c.low) { isWickLow = false; break; }
  }

  let isWickHigh = true;
  for (let j = i - lookback; j < i; j++) {
    if (allCandles[j].high > c.high) { isWickHigh = false; break; }
  }

  const wickTime = new Date().toISOString();

  if (isWickLow && c.low > 0) {
    signals.push({
      symbol: c.symbol,
      interval: INTERVAL,
      bar_time: c.open_time,
      signal_type: 'buy',
      action: 'BUY',
      rationale: 'Swing low wick detected',
      entry_price: c.low,
      sl_price: c.low * (1 - SL_PCT / 100),
      tp_price: c.low * (1 + TP_PCT / 100),
      sl_pct: SL_PCT,
      tp_pct: TP_PCT,
      wick_price: c.low,
    });
  }

  if (isWickHigh && c.high > 0) {
    signals.push({
      symbol: c.symbol,
      interval: INTERVAL,
      bar_time: new Date(new Date(c.open_time).getTime() + 500).toISOString(),
      signal_type: 'sell',
      action: 'SELL',
      rationale: 'Swing high wick detected',
      entry_price: c.high,
      sl_price: c.high * (1 + SL_PCT / 100),
      tp_price: c.high * (1 - TP_PCT / 100),
      sl_pct: SL_PCT,
      tp_pct: TP_PCT,
      wick_price: c.high,
    });
  }

  return signals;
}

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
      closeReason = 'tp_hit';
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

const signalMessageIds = {};

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

function pendingWickMessage(sig) {
  const isBuy = sig.signal_type === 'buy';
  const icon = isBuy ? '🟢' : '🔴';
  const dir = isBuy ? 'BUY' : 'SELL';
  const localTime = toLocalTimeString(new Date());

  return (
    `${icon} <b>⏳ PENDING: ${dir} ${coinLabel(sig.symbol)} (30m wick)</b>\n\n` +
    `📊 <b>Wick Price:</b> <code>$${sig.wick_price.toFixed(2)}</code>\n` +
    `🎯 <b>Target:</b> <code>$${sig.tp_price.toFixed(2)}</code>\n` +
    `🛑 <b>Stop:</b> <code>$${sig.sl_price.toFixed(2)}</code>\n\n` +
    `⏰ <b>Alert Time:</b> ${localTime}\n` +
    `📝 <b>Status:</b> Waiting for candle close confirmation...`
  );
}

function newSignalMessage(sig) {
  const isBuy = sig.signal_type === 'buy';
  const icon = isBuy ? '🟢' : '🔴';
  const dir = isBuy ? 'BUY' : 'SELL';
  const localTime = toLocalTimeString(new Date(sig.bar_time));

  return (
    `${icon} <b>✅ CONFIRMED: ${dir} ${coinLabel(sig.symbol)} (30m)</b>\n\n` +
    `📊 <b>Entry:</b> <code>$${sig.entry_price.toFixed(2)}</code>\n` +
    `🎯 <b>Target:</b> <code>$${sig.tp_price.toFixed(2)}</code>\n` +
    `🛑 <b>Stop:</b> <code>$${sig.sl_price.toFixed(2)}</code>\n\n` +
    `💪 <b>Confidence:</b> ${sig.confidence}%\n` +
    `⏰ <b>Time:</b> ${localTime}`
  );
}

function closedSignalMessage(sig) {
  const isBuy = sig.signal_type === 'buy';
  const win = sig.is_win;
  const icon = win ? '✅' : '❌';
  const dir = isBuy ? 'BUY' : 'SELL';
  const pnlStr = `${sig.pnl_pct >= 0 ? '+' : ''}${sig.pnl_pct.toFixed(2)}%`;
  const pnlColor = sig.pnl_pct >= 0 ? '🟢' : '🔴';

  return (
    `${icon} <b>${coinLabel(sig.symbol)} ${dir} CLOSED</b>\n\n` +
    `📥 <b>Entry:</b> <code>$${parseFloat(sig.entry_price).toFixed(2)}</code>\n` +
    `📤 <b>Exit:</b> <code>$${sig.close_price.toFixed(2)}</code>\n\n` +
    `${pnlColor} <b>PnL:</b> <code>${pnlStr}</code>\n` +
    `📋 <b>Reason:</b> ${sig.close_reason === 'swing_opposite' ? 'Opposite swing' : 'Target hit'}`
  );
}

async function processSymbol(symbol) {
  const candles = await fetchCandles(symbol);
  if (candles.length < LOOKBACK * 2 + 1) {
    log(`[${symbol}] Not enough candles fetched (${candles.length}), skipping.`);
    return;
  }

  if (!historicalCandles[symbol]) {
    historicalCandles[symbol] = candles.slice(0, -1);
  }

  const latestCandleTime = candles[candles.length - 1].open_time;
  if (lastSeenCandle[symbol] === latestCandleTime) return false;
  lastSeenCandle[symbol] = latestCandleTime;
  log(`[${symbol}] New candle @ ${latestCandleTime}, checking for swings...`);

  const detected = detectSwings(candles);
  if (detected.length === 0) {
    log(`[${symbol}] No swings detected in current window.`);
    return true;
  }

  const { data: openRows } = await supabase
    .from('signals')
    .select('*')
    .eq('symbol', symbol)
    .eq('interval', INTERVAL)
    .is('closed_at', null)
    .order('bar_time', { ascending: false })
    .limit(1);

  let foundOpenSignal = false;
  if (openRows && openRows.length > 0) {
    const openSignal = openRows[0];

    const isOppositeDetected = detected.some(sig =>
      sig.signal_type !== openSignal.action.toLowerCase()
    );

    if (isOppositeDetected) {
      const oppositeSignal = detected.find(sig =>
        sig.signal_type !== openSignal.action.toLowerCase()
      );

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
        await sendTelegram(closedSignalMessage({ ...openSignal, ...closeInfo }), replyToId);
        foundOpenSignal = true;
      } else {
        log(`[${symbol}] Failed to close signal: ${error.message}`);
      }
    }
  }

  if (openRows && openRows.length > 0 && !foundOpenSignal) {
    log(`[${symbol}] Open signal exists and no opposite detected, waiting for opposite.`);
    return true;
  }

  const confidence = await getDynamicConfidence(symbol);
  const toInsert = detected.map(sig => ({
    ...sig,
    confidence,
    closed_at: null,
    pnl_pct: null,
    is_win: null,
    close_reason: null,
  }));

  // Try to insert, silently skip duplicates via upsert
  const { data: insertedSignals, error: insertError } = await supabase
    .from('signals')
    .upsert(toInsert, { onConflict: 'symbol,interval,bar_time' })
    .select();

  if (insertError && !insertError.message.includes('duplicate')) {
    log(`[${symbol}] Failed to insert new signals: ${insertError.message}`);
    return true;
  }

  log(`[${symbol}] ➕ Processed ${toInsert.length} detected swing(s).`);
  for (const sig of (insertedSignals || toInsert)) {
    if (sig.closed_at === null) {
      const messageId = await sendTelegram(newSignalMessage(sig));
      if (messageId && sig.id) {
        signalMessageIds[sig.id] = messageId;
      }
    }
  }

  // Recovery: if no live signals exist, re-analyze to generate them
  const { data: liveSignals } = await supabase
    .from('signals')
    .select('*')
    .eq('symbol', symbol)
    .eq('interval', INTERVAL)
    .is('closed_at', null);

  if (!liveSignals || liveSignals.length === 0) {
    log(`[${symbol}] ⚠️  NO LIVE SIGNALS DETECTED — re-running candle analysis for recovery...`);
    const allCandles = await fetchCandles(symbol);
    const recoverySignals = detectSwings(allCandles);
    if (recoverySignals.length > 0) {
      const confidence = await getDynamicConfidence(symbol);
      const recoveryInsert = recoverySignals.map(sig => ({
        ...sig,
        confidence,
        closed_at: null,
        pnl_pct: null,
        is_win: null,
        close_reason: null,
      }));

      const { data: recoveryData, error: recoveryError } = await supabase
        .from('signals')
        .upsert(recoveryInsert, { onConflict: 'symbol,interval,bar_time' })
        .select();

      if (recoveryError && !recoveryError.message.includes('duplicate')) {
        log(`[${symbol}] Failed to insert recovery signals: ${recoveryError.message}`);
      } else {
        log(`[${symbol}] ✓ Recovery: processed ${recoveryInsert.length} signal(s)`);
        for (const sig of (recoveryData || recoveryInsert)) {
          const messageId = await sendTelegram(newSignalMessage(sig));
          if (messageId && sig.id) {
            signalMessageIds[sig.id] = messageId;
          }
        }
      }
    }
  }

  return true;
}

const lastSeenCandle = {};
const inFlight = {};
const pendingWicks = {};
const historicalCandles = {};
let lastEventAt = null;
let lastEventError = null;
let wsConnected = false;
let wsConnectCount = 0;
let lastMessageAt = null;

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

      const symbol = k.s;
      const candle = {
        symbol,
        open_time: new Date(k.t).toISOString(),
        close_time: new Date(k.T).toISOString(),
        open: +k.o,
        high: +k.h,
        low: +k.l,
        close: +k.c,
      };

      // Real-time wick detection during candle formation
      if (k.x === false && historicalCandles[symbol]) {
        const wickSignals = detectWickSwings(candle, historicalCandles[symbol], LOOKBACK);
        for (const sig of wickSignals) {
          // Use candle open_time as part of key, not wick_price (which changes every tick)
          const wickKey = `${symbol}_${sig.signal_type}_${sig.bar_time}`;
          if (!pendingWicks[wickKey]) {
            pendingWicks[wickKey] = true;
            log(`[${symbol}] WICK ALERT: Swing ${sig.signal_type.toUpperCase()} @ ${sig.wick_price.toFixed(2)}`);
            sendTelegram(pendingWickMessage(sig));
          }
        }
      }

      // Candle close: confirm swings and process signals
      if (k.x === true) {
        if (!historicalCandles[symbol]) {
          historicalCandles[symbol] = [];
        }
        historicalCandles[symbol].push(candle);
        if (historicalCandles[symbol].length > 50) {
          historicalCandles[symbol].shift();
        }
        for (const key of Object.keys(pendingWicks)) {
          if (key.startsWith(symbol)) {
            delete pendingWicks[key];
          }
        }
        trigger(symbol, 'websocket');
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

function startSafetyNet() {
  setInterval(() => {
    for (const symbol of SYMBOLS) trigger(symbol, 'safety-net');
  }, SAFETY_NET_INTERVAL_SECONDS * 1000);
}

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

app.listen(PORT, async () => {
  log(`Signal worker listening on port ${PORT}`);
  for (const symbol of SYMBOLS) trigger(symbol, 'startup');

  // Bootstrap: ensure at least one live signal exists per symbol
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for initial triggers
  for (const symbol of SYMBOLS) {
    const { data: liveSignals } = await supabase
      .from('signals')
      .select('*')
      .eq('symbol', symbol)
      .eq('interval', INTERVAL)
      .is('closed_at', null);

    if (!liveSignals || liveSignals.length === 0) {
      log(`[${symbol}] Bootstrap: no live signals found, generating from candle analysis...`);
      try {
        const allCandles = await fetchCandles(symbol);
        const bootstrapSignals = detectSwings(allCandles);
        if (bootstrapSignals.length > 0) {
          const confidence = await getDynamicConfidence(symbol);
          const toInsert = bootstrapSignals.map(sig => ({
            ...sig,
            confidence,
            closed_at: null,
            pnl_pct: null,
            is_win: null,
            close_reason: null,
          }));
          const { error } = await supabase
            .from('signals')
            .insert(toInsert)
            .select();
          if (!error) {
            log(`[${symbol}] ✓ Bootstrap: inserted ${toInsert.length} live signal(s)`);
            for (const sig of toInsert) {
              await sendTelegram(newSignalMessage(sig));
            }
          }
        } else {
          log(`[${symbol}] Bootstrap: no swings found in any candles — waiting for next candle close`);
        }
      } catch (err) {
        log(`[${symbol}] Bootstrap error: ${err.message}`);
      }
    } else {
      log(`[${symbol}] Bootstrap: ${liveSignals.length} live signal(s) already exist`);
    }
  }

  connectWebSocket();
  startSafetyNet();
});

process.on('SIGTERM', () => { log('SIGTERM received, shutting down.'); process.exit(0); });
process.on('SIGINT', () => { log('SIGINT received, shutting down.'); process.exit(0); });
