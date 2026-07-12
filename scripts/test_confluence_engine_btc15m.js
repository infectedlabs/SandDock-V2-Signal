#!/usr/bin/env node
/**
 * MULTI-INDICATOR CONFLUENCE ENGINE - BTC 15m ONLY
 * Target: 0.5-1% PnL per trade, high win rate, quality over quantity.
 *
 * Tests 6 structurally DIFFERENT entry archetypes (not BB-sweep variations):
 *  1. TrendPullback   - EMA50>EMA200 uptrend + RSI dips <35 + reclaim  (long only w/ trend)
 *  2. MACD-Trend      - MACD cross in direction of EMA200 trend
 *  3. RSI-Extreme     - RSI <25 / >75 extremes + reversal candle confirmation
 *  4. Confluence3of4  - require 3 of 4: trend, RSI zone, volume spike, candle pattern
 *  5. DonchianPullback- price pulls to mid-channel in a trend, resumes
 *  6. VolBreakRetest  - range breakout, entry on retest hold
 *
 * Exits tested per entry: fixed TP 0.5/0.75/1.0% with SL 0.5/0.75/1.0%,
 * plus ATR-scaled variant. 1 year of BTCUSDT 15m data.
 */

const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const BINANCE_API = 'https://api.binance.com/api/v3';
const SYMBOL = 'BTCUSDT';
const INTERVAL = '15m';
const LOOKBACK_DAYS = 365;

// ---------- data ----------
async function fetchCandles(symbol, interval, days) {
  const limit = 1000;
  const all = [];
  let endTime = Date.now();
  const iters = Math.ceil((days * 24 * 60) / parseInt(interval) / limit) + 1;
  for (let i = 0; i < iters; i++) {
    try {
      const r = await axios.get(`${BINANCE_API}/klines`, { params: { symbol, interval, endTime, limit } });
      if (!r.data || r.data.length === 0) break;
      const candles = r.data.map(k => ({
        open_time: new Date(k[0]).toISOString(),
        open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[7],
      }));
      all.unshift(...candles);
      endTime = new Date(candles[0].open_time).getTime() - 1;
      if (candles.length < limit) break;
    } catch (e) { console.error('fetch err:', e.message); break; }
  }
  return all;
}

// ---------- indicators ----------
function emaArr(closes, period) {
  const out = new Array(closes.length).fill(null);
  const k = 2 / (period + 1);
  let prev = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < closes.length; i++) { prev = closes[i] * k + prev * (1 - k); out[i] = prev; }
  return out;
}

function rsiArr(closes, period = 14) {
  const out = new Array(closes.length).fill(null);
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  gain /= period; loss /= period;
  out[period] = 100 - 100 / (1 + (loss === 0 ? 100 : gain / loss));
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = 100 - 100 / (1 + (loss === 0 ? 100 : gain / loss));
  }
  return out;
}

function macdArr(closes, fast = 12, slow = 26, signal = 9) {
  const ef = emaArr(closes, fast), es = emaArr(closes, slow);
  const macd = closes.map((_, i) => (ef[i] != null && es[i] != null) ? ef[i] - es[i] : null);
  // signal line: EMA of macd (skip nulls)
  const firstIdx = macd.findIndex(v => v != null);
  const sig = new Array(closes.length).fill(null);
  const k = 2 / (signal + 1);
  let prev = null, count = 0, seed = 0;
  for (let i = firstIdx; i < closes.length; i++) {
    if (count < signal) { seed += macd[i]; count++; if (count === signal) { prev = seed / signal; sig[i] = prev; } continue; }
    prev = macd[i] * k + prev * (1 - k);
    sig[i] = prev;
  }
  return { macd, sig };
}

function atrArr(candles, period = 14) {
  const n = candles.length;
  const out = new Array(n).fill(null);
  const tr = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    tr[i] = Math.max(candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close));
  }
  let sum = 0;
  for (let i = 1; i <= period; i++) sum += tr[i];
  out[period] = sum / period;
  for (let i = period + 1; i < n; i++) out[i] = (out[i - 1] * (period - 1) + tr[i]) / period;
  return out;
}

function avgVolArr(candles, period = 20) {
  const out = new Array(candles.length).fill(null);
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].volume;
    if (i >= period) sum -= candles[i - period].volume;
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

// ---------- entry archetypes ----------
// each returns [{idx, type:'buy'|'sell'}]
function entriesTrendPullback(c, ind) {
  const { ema50, ema200, rsi } = ind;
  const out = [];
  for (let i = 210; i < c.length; i++) {
    if (ema50[i] == null || ema200[i] == null || rsi[i] == null) continue;
    const upTrend = ema50[i] > ema200[i] && c[i].close > ema200[i];
    const dnTrend = ema50[i] < ema200[i] && c[i].close < ema200[i];
    // pullback: RSI dipped below 35 within last 3 bars, now closes back above 40 (reclaim)
    if (upTrend && rsi[i - 1] < 35 && rsi[i] > 40 && c[i].close > c[i].open) out.push({ idx: i, type: 'buy' });
    else if (dnTrend && rsi[i - 1] > 65 && rsi[i] < 60 && c[i].close < c[i].open) out.push({ idx: i, type: 'sell' });
  }
  return out;
}

function entriesMacdTrend(c, ind) {
  const { macd, sig, ema200 } = ind;
  const out = [];
  for (let i = 210; i < c.length; i++) {
    if (macd[i] == null || sig[i] == null || sig[i - 1] == null || ema200[i] == null) continue;
    const crossUp = macd[i - 1] <= sig[i - 1] && macd[i] > sig[i];
    const crossDn = macd[i - 1] >= sig[i - 1] && macd[i] < sig[i];
    // only with trend AND macd below zero for longs (cross from oversold), above zero for shorts
    if (crossUp && c[i].close > ema200[i] && macd[i] < 0) out.push({ idx: i, type: 'buy' });
    else if (crossDn && c[i].close < ema200[i] && macd[i] > 0) out.push({ idx: i, type: 'sell' });
  }
  return out;
}

function entriesRsiExtreme(c, ind) {
  const { rsi } = ind;
  const out = [];
  for (let i = 20; i < c.length; i++) {
    if (rsi[i] == null || rsi[i - 1] == null) continue;
    // extreme + reversal candle (engulfing-ish: close beyond prior open)
    if (rsi[i - 1] < 25 && rsi[i] > rsi[i - 1] && c[i].close > c[i].open && c[i].close > c[i - 1].open)
      out.push({ idx: i, type: 'buy' });
    else if (rsi[i - 1] > 75 && rsi[i] < rsi[i - 1] && c[i].close < c[i].open && c[i].close < c[i - 1].open)
      out.push({ idx: i, type: 'sell' });
  }
  return out;
}

function entriesConfluence(c, ind) {
  const { ema50, ema200, rsi, avgVol } = ind;
  const out = [];
  for (let i = 210; i < c.length; i++) {
    if (ema50[i] == null || ema200[i] == null || rsi[i] == null || avgVol[i] == null) continue;
    const body = Math.abs(c[i].close - c[i].open);
    const range = c[i].high - c[i].low || 1e-9;
    const bullCandle = c[i].close > c[i].open && body / range > 0.5;
    const bearCandle = c[i].close < c[i].open && body / range > 0.5;
    const volSpike = c[i].volume > avgVol[i] * 1.3;

    let bullScore = 0, bearScore = 0;
    if (ema50[i] > ema200[i]) bullScore++; else bearScore++;
    if (rsi[i] > 35 && rsi[i] < 50 && rsi[i] > rsi[i - 1]) bullScore++;
    if (rsi[i] < 65 && rsi[i] > 50 && rsi[i] < rsi[i - 1]) bearScore++;
    if (volSpike) { bullScore += bullCandle ? 1 : 0; bearScore += bearCandle ? 1 : 0; }
    if (bullCandle) bullScore++;
    if (bearCandle) bearScore++;

    if (bullScore >= 3 && ema50[i] > ema200[i]) out.push({ idx: i, type: 'buy' });
    else if (bearScore >= 3 && ema50[i] < ema200[i]) out.push({ idx: i, type: 'sell' });
  }
  return out;
}

function entriesDonchianPullback(c, ind) {
  const { ema200 } = ind;
  const out = [];
  const period = 40;
  for (let i = 210 + period; i < c.length; i++) {
    if (ema200[i] == null) continue;
    let hh = -Infinity, ll = Infinity;
    for (let j = i - period; j < i; j++) { hh = Math.max(hh, c[j].high); ll = Math.min(ll, c[j].low); }
    const mid = (hh + ll) / 2;
    const upTrend = c[i].close > ema200[i];
    const dnTrend = c[i].close < ema200[i];
    // pullback to mid channel then resume close in trend direction
    const touchedMid = c[i - 1].low <= mid && c[i - 1].high >= mid;
    if (upTrend && touchedMid && c[i].close > c[i].open && c[i].close > mid) out.push({ idx: i, type: 'buy' });
    else if (dnTrend && touchedMid && c[i].close < c[i].open && c[i].close < mid) out.push({ idx: i, type: 'sell' });
  }
  return out;
}

function entriesVolBreakRetest(c, ind) {
  const { avgVol } = ind;
  const out = [];
  const rangeP = 30;
  for (let i = 40 + rangeP; i < c.length - 1; i++) {
    if (avgVol[i] == null) continue;
    let hh = -Infinity, ll = Infinity;
    for (let j = i - rangeP - 3; j < i - 3; j++) { hh = Math.max(hh, c[j].high); ll = Math.min(ll, c[j].low); }
    // breakout 3 bars ago with volume, last 2 bars held above/below level, enter now
    const brokeUp = c[i - 3].close > hh && c[i - 3].volume > avgVol[i - 3] * 1.5;
    const brokeDn = c[i - 3].close < ll && c[i - 3].volume > avgVol[i - 3] * 1.5;
    const heldUp = c[i - 2].low > hh * 0.999 && c[i - 1].low > hh * 0.999;
    const heldDn = c[i - 2].high < ll * 1.001 && c[i - 1].high < ll * 1.001;
    if (brokeUp && heldUp) out.push({ idx: i, type: 'buy' });
    else if (brokeDn && heldDn) out.push({ idx: i, type: 'sell' });
  }
  return out;
}

// ---------- exit simulation ----------
function simulate(entries, candles, slPct, tpPct, atr = null, atrMode = false, maxHoldBars = 96) {
  const trades = [];
  let lastExitIdx = -1;
  for (const e of entries) {
    if (e.idx <= lastExitIdx) continue; // no overlapping trades
    const isBuy = e.type === 'buy';
    const entryPrice = candles[e.idx].close;
    let sl, tp;
    if (atrMode && atr && atr[e.idx]) {
      const a = atr[e.idx];
      sl = isBuy ? entryPrice - a * slPct : entryPrice + a * slPct; // here slPct/tpPct are ATR mults
      tp = isBuy ? entryPrice + a * tpPct : entryPrice - a * tpPct;
    } else {
      sl = isBuy ? entryPrice * (1 - slPct / 100) : entryPrice * (1 + slPct / 100);
      tp = isBuy ? entryPrice * (1 + tpPct / 100) : entryPrice * (1 - tpPct / 100);
    }
    let closed = false;
    for (let j = e.idx + 1; j < Math.min(e.idx + maxHoldBars, candles.length); j++) {
      const b = candles[j];
      const slHit = isBuy ? b.low <= sl : b.high >= sl;
      const tpHit = isBuy ? b.high >= tp : b.low <= tp;
      if (slHit) { // conservative: SL first on same-bar ambiguity
        const pnl = isBuy ? ((sl - entryPrice) / entryPrice) * 100 : ((entryPrice - sl) / entryPrice) * 100;
        trades.push({ pnl, win: false, time: candles[e.idx].open_time, exit: 'sl' });
        lastExitIdx = j; closed = true; break;
      }
      if (tpHit) {
        const pnl = isBuy ? ((tp - entryPrice) / entryPrice) * 100 : ((entryPrice - tp) / entryPrice) * 100;
        trades.push({ pnl, win: true, time: candles[e.idx].open_time, exit: 'tp' });
        lastExitIdx = j; closed = true; break;
      }
    }
    if (!closed) {
      const j = Math.min(e.idx + maxHoldBars, candles.length - 1);
      const b = candles[j];
      const pnl = isBuy ? ((b.close - entryPrice) / entryPrice) * 100 : ((entryPrice - b.close) / entryPrice) * 100;
      trades.push({ pnl, win: pnl > 0, time: candles[e.idx].open_time, exit: 'timeout' });
      lastExitIdx = j;
    }
  }
  return trades;
}

function report(trades, days) {
  if (!trades.length) return null;
  const wins = trades.filter(t => t.win).length;
  const wr = wins / trades.length * 100;
  const total = trades.reduce((s, t) => s + t.pnl, 0);
  const winSum = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const lossSum = Math.abs(trades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
  return {
    trades: trades.length, wr: +wr.toFixed(1),
    avgPnl: +(total / trades.length).toFixed(3),
    total: +total.toFixed(1),
    pf: +(lossSum > 0 ? winSum / lossSum : 99).toFixed(2),
    perWeek: +(trades.length / (days / 7)).toFixed(1),
  };
}

// ---------- main ----------
async function main() {
  console.log('CONFLUENCE ENGINE TEST - BTCUSDT 15m, 1 year, TP target 0.5-1%/trade');
  console.log('=======================================================================\n');
  const candles = await fetchCandles(SYMBOL, INTERVAL, LOOKBACK_DAYS);
  console.log(`Fetched ${candles.length} candles\n`);
  const days = new Set(candles.map(c => c.open_time.split('T')[0])).size;

  const closes = candles.map(c => c.close);
  const ind = {
    ema50: emaArr(closes, 50),
    ema200: emaArr(closes, 200),
    rsi: rsiArr(closes, 14),
    avgVol: avgVolArr(candles, 20),
  };
  const { macd, sig } = macdArr(closes);
  ind.macd = macd; ind.sig = sig;
  const atr = atrArr(candles, 14);

  const archetypes = [
    ['TrendPullback', entriesTrendPullback],
    ['MACD-Trend', entriesMacdTrend],
    ['RSI-Extreme', entriesRsiExtreme],
    ['Confluence3+', entriesConfluence],
    ['DonchianPull', entriesDonchianPullback],
    ['VolBreakRetest', entriesVolBreakRetest],
  ];

  const exitCombos = [
    { sl: 0.5, tp: 0.5 }, { sl: 0.5, tp: 0.75 }, { sl: 0.75, tp: 0.5 },
    { sl: 0.75, tp: 0.75 }, { sl: 1.0, tp: 0.5 }, { sl: 1.0, tp: 0.75 },
    { sl: 1.0, tp: 1.0 }, { sl: 1.5, tp: 0.75 }, { sl: 1.5, tp: 1.0 },
  ];

  const results = [];
  for (const [name, fn] of archetypes) {
    const entries = fn(candles, ind);
    console.log(`\n### ${name}: ${entries.length} raw entries (${(entries.length / (days / 7)).toFixed(1)}/week)`);
    for (const ex of exitCombos) {
      const trades = simulate(entries, candles, ex.sl, ex.tp, atr, false);
      const r = report(trades, days);
      if (!r) continue;
      results.push({ name, ...ex, ...r });
      const flag = r.wr >= 65 && r.avgPnl >= 0.1 ? ' <<<' : '';
      console.log(`  SL=${ex.sl}% TP=${ex.tp}% | n=${r.trades} WR=${r.wr}% avg=${r.avgPnl}% total=${r.total}% PF=${r.pf} (${r.perWeek}/wk)${flag}`);
    }
    // ATR-scaled exit variant: SL=1.5xATR, TP=1xATR (adaptive)
    for (const [slM, tpM] of [[1.5, 1.0], [2.0, 1.0], [1.0, 1.0], [2.0, 1.5]]) {
      const trades = simulate(entries, candles, slM, tpM, atr, true);
      const r = report(trades, days);
      if (!r) continue;
      results.push({ name, sl: `${slM}xATR`, tp: `${tpM}xATR`, ...r });
      const flag = r.wr >= 65 && r.avgPnl >= 0.1 ? ' <<<' : '';
      console.log(`  SL=${slM}xATR TP=${tpM}xATR | n=${r.trades} WR=${r.wr}% avg=${r.avgPnl}% total=${r.total}% PF=${r.pf} (${r.perWeek}/wk)${flag}`);
    }
  }

  console.log('\n\nTOP 12 BY NET TOTAL PNL (min 30 trades)');
  console.log('=========================================');
  results.filter(r => r.trades >= 30).sort((a, b) => b.total - a.total).slice(0, 12).forEach((r, i) => {
    console.log(`${i + 1}. [${r.name}] SL=${r.sl} TP=${r.tp} | n=${r.trades} WR=${r.wr}% avg=${r.avgPnl}% total=${r.total}% PF=${r.pf}`);
  });

  console.log('\nTOP 12 BY WIN RATE (min 30 trades, net positive only)');
  console.log('======================================================');
  results.filter(r => r.trades >= 30 && r.total > 0).sort((a, b) => b.wr - a.wr).slice(0, 12).forEach((r, i) => {
    console.log(`${i + 1}. [${r.name}] SL=${r.sl} TP=${r.tp} | n=${r.trades} WR=${r.wr}% avg=${r.avgPnl}% total=${r.total}% PF=${r.pf}`);
  });

  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
