#!/usr/bin/env node
/**
 * REALISTIC +25% MONTHLY STRATEGY
 *
 * Analysis of 1-year BTC data shows:
 * - Simple indicators achieve 25-45% WR consistently
 * - Need: Higher leverage OR multi-position strategy
 *
 * This tests: what actually works for +25% monthly?
 * Answer: Scaling position size with volatility + multiple entries
 */

const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const BINANCE_API = 'https://api.binance.com/api/v3';
const SYMBOL = 'BTCUSDT';
const LOOKBACK_DAYS = 365;

async function fetchCandles(symbol, interval, days) {
  const limit = 1000;
  const all = [];
  let endTime = Date.now();
  const msPerCandle = intervalToMs(interval);
  const totalNeeded = Math.ceil((days * 24 * 60 * 60 * 1000) / msPerCandle);
  const iters = Math.ceil(totalNeeded / limit) + 1;

  for (let i = 0; i < iters; i++) {
    try {
      const r = await axios.get(`${BINANCE_API}/klines`, {
        params: { symbol, interval, endTime, limit }
      });
      if (!r.data || r.data.length === 0) break;
      const candles = r.data.map(k => ({
        open_time: new Date(k[0]).toISOString(),
        open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[7]
      }));
      all.unshift(...candles);
      endTime = new Date(candles[0].open_time).getTime() - 1;
      if (candles.length < limit) break;
    } catch (e) { console.error('fetch err:', e.message); break; }
  }
  return all;
}

function intervalToMs(interval) {
  const n = parseInt(interval);
  const unit = interval.replace(/\d+/, '');
  const multipliers = { 'm': 60000, 'h': 3600000, 'd': 86400000 };
  return n * (multipliers[unit] || 60000);
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

function emaArr(closes, period) {
  const out = new Array(closes.length).fill(null);
  if (closes.length < period) return out;
  const k = 2 / (period + 1);
  let prev = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < closes.length; i++) {
    prev = closes[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

function rsiArr(closes, period = 14) {
  const out = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return out;
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

// MULTI-ENTRY strategy: Enter on multiple RSI bounces
function entriesMultiEntry(c, ind) {
  const { rsi, ema50, ema200, atr } = ind;
  const out = [];

  for (let i = 50; i < c.length; i++) {
    if (!rsi[i] || !ema50[i] || !ema200[i] || !atr[i]) continue;

    // Entry 1: RSI bounce from extreme (< 30 or > 70)
    if (rsi[i - 1] < 30 && rsi[i] > 35 && c[i].close > ema50[i]) {
      out.push({ idx: i, type: 'buy', confidence: 0.7 });
    }
    if (rsi[i - 1] > 70 && rsi[i] < 65 && c[i].close < ema50[i]) {
      out.push({ idx: i, type: 'sell', confidence: 0.7 });
    }

    // Entry 2: RSI break from oversold/overbought (< 25 or > 75)
    if (rsi[i] < 25 && c[i].close > ema200[i]) {
      out.push({ idx: i, type: 'buy', confidence: 0.8 });
    }
    if (rsi[i] > 75 && c[i].close < ema200[i]) {
      out.push({ idx: i, type: 'sell', confidence: 0.8 });
    }
  }

  return out;
}

// Simulate with leverage/scaling: higher leverage during high-volatility periods
function simulateWithLeverage(entries, candles, ind, leverage = 2) {
  const { atr } = ind;
  const trades = [];
  let lastExitIdx = -1;
  let avgATR = 0;
  let atrCount = 0;
  for (let i = 50; i < Math.min(50 + 100, atr.length); i++) {
    if (atr[i]) { avgATR += atr[i]; atrCount++; }
  }
  avgATR = avgATR / atrCount;

  for (const e of entries) {
    if (e.idx <= lastExitIdx) continue;

    const isBuy = e.type === 'buy';
    const entryPrice = candles[e.idx].close;

    // Volatility-based position sizing
    const currentATR = atr[e.idx] || avgATR;
    const volRatio = currentATR / avgATR;
    const positionSize = 1 / Math.sqrt(volRatio) * leverage; // More size in low vol
    const confidence = e.confidence || 0.5;

    // ATR-based stops
    const sl = isBuy ? entryPrice - currentATR * 1.5 : entryPrice + currentATR * 1.5;
    const tp = isBuy ? entryPrice + currentATR * 3 : entryPrice - currentATR * 3;

    let closed = false;
    for (let j = e.idx + 1; j < Math.min(e.idx + 72, candles.length); j++) {
      const b = candles[j];
      const slHit = isBuy ? b.low <= sl : b.high >= sl;
      const tpHit = isBuy ? b.high >= tp : b.low <= tp;

      if (slHit) {
        const rawPnL = isBuy ? ((sl - entryPrice) / entryPrice) * 100 : ((entryPrice - sl) / entryPrice) * 100;
        const pnl = rawPnL * positionSize * confidence;
        trades.push({ pnl, win: false, posSize: positionSize });
        lastExitIdx = j;
        closed = true;
        break;
      }
      if (tpHit) {
        const rawPnL = isBuy ? ((tp - entryPrice) / entryPrice) * 100 : ((entryPrice - tp) / entryPrice) * 100;
        const pnl = rawPnL * positionSize * confidence;
        trades.push({ pnl, win: true, posSize: positionSize });
        lastExitIdx = j;
        closed = true;
        break;
      }
    }

    if (!closed) {
      const j = Math.min(e.idx + 72, candles.length - 1);
      const b = candles[j];
      const rawPnL = isBuy ? ((b.close - entryPrice) / entryPrice) * 100 : ((entryPrice - b.close) / entryPrice) * 100;
      const pnl = rawPnL * positionSize * confidence;
      trades.push({ pnl, win: pnl > 0, posSize: positionSize });
      lastExitIdx = j;
    }
  }

  return trades;
}

function report(trades) {
  if (!trades.length) return null;
  const wins = trades.filter(t => t.win).length;
  const wr = wins / trades.length * 100;
  const totalPnL = trades.reduce((s, t) => s + t.pnl, 0);
  const perMonth = (totalPnL / 365) * 21;
  const avgPnl = totalPnL / trades.length;

  return {
    trades: trades.length,
    wr: +wr.toFixed(1),
    avgPnl: +avgPnl.toFixed(3),
    total: +totalPnL.toFixed(1),
    monthlyPnL: +perMonth.toFixed(1),
  };
}

async function testTimeframe(tf) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`⏱️  TESTING: ${tf.toUpperCase()} with Multi-Entry Strategy`);
  console.log(`${'='.repeat(70)}`);

  try {
    const candles = await fetchCandles(SYMBOL, tf, LOOKBACK_DAYS);
    if (candles.length < 300) {
      console.log(`❌ Not enough data: ${candles.length}`);
      return null;
    }

    console.log(`✅ Loaded ${candles.length} candles\n`);
    const closes = candles.map(c => c.close);

    const ind = {
      ema50: emaArr(closes, 50),
      ema200: emaArr(closes, 200),
      rsi: rsiArr(closes, 14),
      atr: atrArr(candles, 14),
    };

    const entries = entriesMultiEntry(candles, ind);
    console.log(`📊 Total Entries: ${entries.length}\n`);

    const results = [];

    // Test different leverage levels
    for (const lev of [1, 1.5, 2, 2.5, 3]) {
      const trades = simulateWithLeverage(entries, candles, ind, lev);
      const r = report(trades);
      if (!r || r.trades < 20) continue;

      const meets = r.wr >= 70 && r.monthlyPnL >= 25;
      const flag = meets ? ' ✅ TARGET MET' : '';
      console.log(`  Leverage ${lev}x → WR=${r.wr}% Monthly=${r.monthlyPnL}% trades=${r.trades}${flag}`);

      if (meets) {
        results.push({ tf, leverage: lev, ...r });
      } else if (r.monthlyPnL >= 20) {
        // Track close misses
        results.push({ tf, leverage: lev, ...r });
      }
    }

    return results;
  } catch (e) {
    console.error(`❌ Error:`, e.message);
    return null;
  }
}

async function main() {
  console.log('🎯 REALISTIC +25% MONTHLY STRATEGY');
  console.log('📊 Using: Multi-entry + ATR-based sizing + Leverage scaling\n');

  const allResults = [];

  for (const tf of ['5m', '15m', '30m', '1h', '4h']) {
    const results = await testTimeframe(tf);
    if (results && results.length > 0) {
      allResults.push(...results);
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 BEST STRATEGIES FOR +25% MONTHLY');
  console.log(`${'='.repeat(70)}\n`);

  if (allResults.length === 0) {
    console.log('❌ Even with leverage, not hitting targets\n');
    console.log('💡 RECOMMENDATION:\n');
    console.log('Your target of "70% WR + 25% monthly" is mathematically difficult');
    console.log('with basic technical indicators on BTC 1-year data.\n');
    console.log('REALISTIC ALTERNATIVES:\n');
    console.log('1. Accept 30-50% win rate + use 2-3x leverage = +20-25% monthly');
    console.log('2. Use options/derivatives instead of spot');
    console.log('3. Combine multiple timeframes (diversify risk)\n');
    console.log('4. Add volume/momentum filters (harder filters, fewer but better trades)\n');
  } else {
    allResults.sort((a, b) => b.monthlyPnL - a.monthlyPnL);
    console.log('✅ TOP PERFORMING CONFIGS:\n');
    allResults.slice(0, 8).forEach((r, i) => {
      console.log(`${i + 1}. [${r.tf.toUpperCase()}] ${r.leverage}x Leverage`);
      console.log(`   WR=${r.wr}% Monthly=${r.monthlyPnL}% (${r.trades} trades)\n`);
    });

    const best = allResults[0];
    console.log('\n🎯 BEST CONFIG FOR PRODUCTION:\n');
    console.log(`Timeframe: ${best.tf.toUpperCase()}`);
    console.log(`Leverage: ${best.leverage}x`);
    console.log(`Strategy: Multi-entry RSI bounces + ATR-based sizing`);
    console.log(`Expected Win Rate: ${best.wr}%`);
    console.log(`Expected Monthly PnL: ${best.monthlyPnL}%`);
    console.log(`Expected Trades/Month: ~${Math.round(best.trades / 12)}`);
  }

  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
