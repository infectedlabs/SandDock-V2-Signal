#!/usr/bin/env node
/**
 * REFINE: Donchian Pullback (best archetype from confluence test)
 * Base: SL=1.5% TP=0.75% -> 66.6% WR, +34%/yr, PF 1.12 on BTC 15m
 * Goal: layer confluence filters to push WR > 70% while keeping TP=0.75%
 * (each winner = +0.75%, matching the 0.5-1%/trade requirement)
 */

const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const BINANCE_API = 'https://api.binance.com/api/v3';
const SYMBOL = 'BTCUSDT';
const INTERVAL = '15m';
const LOOKBACK_DAYS = 365;

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
  for (let i = 1; i <= period; i++) { const d = closes[i] - closes[i - 1]; if (d >= 0) gain += d; else loss -= d; }
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

function adxArr(candles, period = 14) {
  const n = candles.length;
  const adx = new Array(n).fill(null);
  const plusDM = new Array(n).fill(0), minusDM = new Array(n).fill(0), tr = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const up = candles[i].high - candles[i - 1].high;
    const dn = candles[i - 1].low - candles[i].low;
    plusDM[i] = (up > dn && up > 0) ? up : 0;
    minusDM[i] = (dn > up && dn > 0) ? dn : 0;
    tr[i] = Math.max(candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close));
  }
  let sTR = 0, sP = 0, sM = 0;
  for (let i = 1; i <= period; i++) { sTR += tr[i]; sP += plusDM[i]; sM += minusDM[i]; }
  const dx = new Array(n).fill(null);
  for (let i = period + 1; i < n; i++) {
    sTR = sTR - sTR / period + tr[i];
    sP = sP - sP / period + plusDM[i];
    sM = sM - sM / period + minusDM[i];
    const pDI = 100 * sP / sTR, mDI = 100 * sM / sTR;
    dx[i] = 100 * Math.abs(pDI - mDI) / (pDI + mDI || 1);
  }
  let seed = 0, cnt = 0;
  for (let i = period + 1; i < n; i++) {
    if (dx[i] == null) continue;
    if (cnt < period) { seed += dx[i]; cnt++; if (cnt === period) adx[i] = seed / period; continue; }
    adx[i] = (adx[i - 1] * (period - 1) + dx[i]) / period;
  }
  return adx;
}

// Donchian pullback entries with optional filters
function entries(c, ind, opts) {
  const { ema50, ema200, rsi, avgVol, adx } = ind;
  const out = [];
  const period = opts.channel || 40;
  for (let i = 210 + period; i < c.length; i++) {
    if (ema200[i] == null) continue;
    let hh = -Infinity, ll = Infinity;
    for (let j = i - period; j < i; j++) { hh = Math.max(hh, c[j].high); ll = Math.min(ll, c[j].low); }
    const mid = (hh + ll) / 2;
    const touchedMid = c[i - 1].low <= mid && c[i - 1].high >= mid;
    if (!touchedMid) continue;

    let upTrend = c[i].close > ema200[i];
    let dnTrend = c[i].close < ema200[i];
    if (opts.strongTrend) { // require EMA50 alignment too
      upTrend = upTrend && ema50[i] > ema200[i];
      dnTrend = dnTrend && ema50[i] < ema200[i];
    }

    const buyBase = upTrend && c[i].close > c[i].open && c[i].close > mid;
    const sellBase = dnTrend && c[i].close < c[i].open && c[i].close < mid;
    if (!buyBase && !sellBase) continue;

    if (opts.volFilter && !(c[i].volume > (avgVol[i] || Infinity) * opts.volFilter)) continue;
    if (opts.adxMin && !(adx[i] != null && adx[i] >= opts.adxMin)) continue;
    if (opts.rsiZone) {
      if (buyBase && !(rsi[i] > 40 && rsi[i] < 65)) continue;
      if (sellBase && !(rsi[i] < 60 && rsi[i] > 35)) continue;
    }
    if (opts.bodyStrength) {
      const body = Math.abs(c[i].close - c[i].open);
      const range = c[i].high - c[i].low || 1e-9;
      if (body / range < opts.bodyStrength) continue;
    }

    out.push({ idx: i, type: buyBase ? 'buy' : 'sell' });
  }
  return out;
}

function simulate(ents, candles, slPct, tpPct, maxHoldBars = 96, maxPerDay = 10) {
  const trades = [];
  let lastExitIdx = -1;
  const perDay = {};
  for (const e of ents) {
    if (e.idx <= lastExitIdx) continue;
    const day = candles[e.idx].open_time.split('T')[0];
    perDay[day] = perDay[day] || 0;
    if (perDay[day] >= maxPerDay) continue;
    const isBuy = e.type === 'buy';
    const entryPrice = candles[e.idx].close;
    const sl = isBuy ? entryPrice * (1 - slPct / 100) : entryPrice * (1 + slPct / 100);
    const tp = isBuy ? entryPrice * (1 + tpPct / 100) : entryPrice * (1 - tpPct / 100);
    let closed = false;
    for (let j = e.idx + 1; j < Math.min(e.idx + maxHoldBars, candles.length); j++) {
      const b = candles[j];
      const slHit = isBuy ? b.low <= sl : b.high >= sl;
      const tpHit = isBuy ? b.high >= tp : b.low <= tp;
      if (slHit) { trades.push({ pnl: -slPct, win: false, time: candles[e.idx].open_time }); lastExitIdx = j; closed = true; break; }
      if (tpHit) { trades.push({ pnl: tpPct, win: true, time: candles[e.idx].open_time }); lastExitIdx = j; closed = true; break; }
    }
    if (!closed) {
      const j = Math.min(e.idx + maxHoldBars, candles.length - 1);
      const b = candles[j];
      const pnl = isBuy ? ((b.close - entryPrice) / entryPrice) * 100 : ((entryPrice - b.close) / entryPrice) * 100;
      trades.push({ pnl, win: pnl > 0, time: candles[e.idx].open_time });
      lastExitIdx = j;
    }
    perDay[day]++;
  }
  return trades;
}

function report(trades, days) {
  if (!trades.length) return null;
  const wins = trades.filter(t => t.win).length;
  const total = trades.reduce((s, t) => s + t.pnl, 0);
  const winSum = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const lossSum = Math.abs(trades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
  return {
    n: trades.length, wr: +(wins / trades.length * 100).toFixed(1),
    avg: +(total / trades.length).toFixed(3), total: +total.toFixed(1),
    pf: +(lossSum > 0 ? winSum / lossSum : 99).toFixed(2),
    perDay: +(trades.length / days).toFixed(2),
  };
}

async function main() {
  console.log('REFINING DONCHIAN PULLBACK - BTC 15m, 1yr, target WR>70% with TP=0.75%');
  console.log('==========================================================================\n');
  const candles = await fetchCandles(SYMBOL, INTERVAL, LOOKBACK_DAYS);
  console.log(`Fetched ${candles.length} candles`);
  const days = new Set(candles.map(c => c.open_time.split('T')[0])).size;
  const closes = candles.map(c => c.close);
  const ind = {
    ema50: emaArr(closes, 50), ema200: emaArr(closes, 200),
    rsi: rsiArr(closes, 14), avgVol: avgVolArr(candles, 20),
    adx: adxArr(candles, 14),
  };
  console.log(`Days: ${days}\n`);

  const variants = [
    { name: 'Base (no filters)', opts: {} },
    { name: '+StrongTrend', opts: { strongTrend: true } },
    { name: '+Volume 1.2x', opts: { volFilter: 1.2 } },
    { name: '+ADX>=20', opts: { adxMin: 20 } },
    { name: '+ADX>=25', opts: { adxMin: 25 } },
    { name: '+RSI zone', opts: { rsiZone: true } },
    { name: '+Body>=0.5', opts: { bodyStrength: 0.5 } },
    { name: 'Strong+ADX20', opts: { strongTrend: true, adxMin: 20 } },
    { name: 'Strong+Vol1.2', opts: { strongTrend: true, volFilter: 1.2 } },
    { name: 'Strong+RSI', opts: { strongTrend: true, rsiZone: true } },
    { name: 'Strong+ADX20+RSI', opts: { strongTrend: true, adxMin: 20, rsiZone: true } },
    { name: 'Strong+ADX20+Body', opts: { strongTrend: true, adxMin: 20, bodyStrength: 0.5 } },
    { name: 'ALL filters', opts: { strongTrend: true, adxMin: 20, rsiZone: true, volFilter: 1.2, bodyStrength: 0.5 } },
    { name: 'Chan30+Strong+ADX20', opts: { channel: 30, strongTrend: true, adxMin: 20 } },
    { name: 'Chan60+Strong+ADX20', opts: { channel: 60, strongTrend: true, adxMin: 20 } },
  ];

  const exits = [
    { sl: 1.5, tp: 0.75 }, { sl: 1.25, tp: 0.75 }, { sl: 1.5, tp: 1.0 }, { sl: 2.0, tp: 1.0 }, { sl: 1.0, tp: 0.5 },
  ];

  const results = [];
  for (const v of variants) {
    const ents = entries(candles, ind, v.opts);
    console.log(`\n### ${v.name}: ${ents.length} raw entries`);
    for (const ex of exits) {
      const trades = simulate(ents, candles, ex.sl, ex.tp);
      const r = report(trades, days);
      if (!r || r.n < 30) continue;
      results.push({ name: v.name, ...ex, ...r });
      const flag = r.wr >= 70 && r.total > 0 ? '  ✅' : (r.wr >= 65 && r.total > 20 ? '  ⚠️' : '');
      console.log(`  SL=${ex.sl} TP=${ex.tp} | n=${r.n} (${r.perDay}/day) WR=${r.wr}% avg=${r.avg}% total=${r.total}%/yr PF=${r.pf}${flag}`);
    }
  }

  console.log('\n\nBEST: WR >= 70% AND net positive');
  console.log('==================================');
  const best = results.filter(r => r.wr >= 70 && r.total > 0).sort((a, b) => b.total - a.total);
  if (!best.length) console.log('None reached 70% WR net-positive.');
  best.slice(0, 10).forEach((r, i) =>
    console.log(`${i + 1}. [${r.name}] SL=${r.sl} TP=${r.tp} | n=${r.n} (${r.perDay}/day) WR=${r.wr}% total=${r.total}%/yr PF=${r.pf}`));

  console.log('\nBEST: net total (any WR >= 60%)');
  console.log('=================================');
  results.filter(r => r.wr >= 60).sort((a, b) => b.total - a.total).slice(0, 10).forEach((r, i) =>
    console.log(`${i + 1}. [${r.name}] SL=${r.sl} TP=${r.tp} | n=${r.n} (${r.perDay}/day) WR=${r.wr}% total=${r.total}%/yr PF=${r.pf}`));

  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
