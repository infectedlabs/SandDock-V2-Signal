#!/usr/bin/env node
/**
 * AGGRESSIVE SIGNAL ENGINE - OPTIMIZED FOR +25% MONTHLY
 * Based on backtest findings, we need:
 * - Higher risk/reward ratios (3:1, 4:1)
 * - More frequent entries (8-12/day)
 * - Looser confluence filters
 *
 * Tests best performing strategies with aggressive parameters
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

function bbArr(closes, period = 20, deviation = 2) {
  const out = { upper: new Array(closes.length).fill(null),
                lower: new Array(closes.length).fill(null),
                middle: new Array(closes.length).fill(null) };
  if (closes.length < period) return out;
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const sma = slice.reduce((a, b) => a + b) / period;
    const variance = slice.reduce((a, b) => a + (b - sma) ** 2) / period;
    const stddev = Math.sqrt(variance);
    out.middle[i] = sma;
    out.upper[i] = sma + stddev * deviation;
    out.lower[i] = sma - stddev * deviation;
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

// AGGRESSIVE entry strategy - looser filters, more entries
function entriesAggressive(c, ind) {
  const { bb, ema50, ema200, rsi, avgVol } = ind;
  const out = [];

  for (let i = 210; i < c.length; i++) {
    if (!bb.middle[i] || !ema50[i] || !ema200[i] || !rsi[i] || !avgVol[i]) continue;

    // Simple price action - close to BB + RSI zone
    const bullSig = (c[i].close < bb.upper[i]) &&
                    (c[i].close > bb.lower[i]) &&
                    (rsi[i] > 25 && rsi[i] < 65) &&
                    (c[i].close > ema50[i]) &&
                    (c[i].close > c[i].open);

    const bearSig = (c[i].close < bb.upper[i]) &&
                    (c[i].close > bb.lower[i]) &&
                    (rsi[i] > 35 && rsi[i] < 75) &&
                    (c[i].close < ema50[i]) &&
                    (c[i].close < c[i].open);

    if (bullSig) out.push({ idx: i, type: 'buy' });
    else if (bearSig) out.push({ idx: i, type: 'sell' });
  }

  return out;
}

// Conservative entry - high confluence, fewer trades
function entriesConservative(c, ind) {
  const { bb, ema50, ema200, rsi, avgVol } = ind;
  const out = [];

  for (let i = 210; i < c.length; i++) {
    if (!bb.middle[i] || !ema50[i] || !ema200[i] || !rsi[i] || !avgVol[i]) continue;

    const upTrend = ema50[i] > ema200[i] && c[i].close > ema200[i];
    const dnTrend = ema50[i] < ema200[i] && c[i].close < ema200[i];

    // Pullback + confirmation
    const bullSig = upTrend &&
                    (c[i].close < bb.middle[i]) &&
                    (rsi[i] > 40 && rsi[i] < 50) &&
                    (c[i].volume > avgVol[i]) &&
                    (c[i].close > c[i].open);

    const bearSig = dnTrend &&
                    (c[i].close > bb.middle[i]) &&
                    (rsi[i] < 60 && rsi[i] > 50) &&
                    (c[i].volume > avgVol[i]) &&
                    (c[i].close < c[i].open);

    if (bullSig) out.push({ idx: i, type: 'buy' });
    else if (bearSig) out.push({ idx: i, type: 'sell' });
  }

  return out;
}

function simulate(entries, candles, slPct, tpPct, maxHoldBars = 96) {
  const trades = [];
  let lastExitIdx = -1;

  for (const e of entries) {
    if (e.idx <= lastExitIdx) continue;
    const isBuy = e.type === 'buy';
    const entryPrice = candles[e.idx].close;
    const sl = isBuy ? entryPrice * (1 - slPct / 100) : entryPrice * (1 + slPct / 100);
    const tp = isBuy ? entryPrice * (1 + tpPct / 100) : entryPrice * (1 - tpPct / 100);
    let closed = false;

    for (let j = e.idx + 1; j < Math.min(e.idx + maxHoldBars, candles.length); j++) {
      const b = candles[j];
      const slHit = isBuy ? b.low <= sl : b.high >= sl;
      const tpHit = isBuy ? b.high >= tp : b.low <= tp;

      if (slHit) {
        const pnl = isBuy ? ((sl - entryPrice) / entryPrice) * 100 : ((entryPrice - sl) / entryPrice) * 100;
        trades.push({ pnl, win: false });
        lastExitIdx = j;
        closed = true;
        break;
      }
      if (tpHit) {
        const pnl = isBuy ? ((tp - entryPrice) / entryPrice) * 100 : ((entryPrice - tp) / entryPrice) * 100;
        trades.push({ pnl, win: true });
        lastExitIdx = j;
        closed = true;
        break;
      }
    }

    if (!closed) {
      const j = Math.min(e.idx + maxHoldBars, candles.length - 1);
      const b = candles[j];
      const pnl = isBuy ? ((b.close - entryPrice) / entryPrice) * 100 : ((entryPrice - b.close) / entryPrice) * 100;
      trades.push({ pnl, win: pnl > 0 });
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
  const perMonth = (totalPnL / 365) * 21; // 21 trading days/month
  const avgPnl = totalPnL / trades.length;
  const winSum = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const lossSum = Math.abs(trades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
  const pf = lossSum > 0 ? winSum / lossSum : 99;

  return {
    trades: trades.length,
    wr: +wr.toFixed(1),
    avgPnl: +avgPnl.toFixed(3),
    total: +totalPnL.toFixed(1),
    monthlyPnL: +perMonth.toFixed(1),
    pf: +pf.toFixed(2),
  };
}

async function testTimeframe(tf) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`⏱️  TESTING: ${tf.toUpperCase()}`);
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
      bb: bbArr(closes, 20, 1.5),
      avgVol: avgVolArr(candles, 20),
    };

    const results = [];

    // Test AGGRESSIVE entries
    console.log('📊 AGGRESSIVE STRATEGY (Loose filters, many entries)\n');
    const aggEntries = entriesAggressive(candles, ind);
    console.log(`  Entries: ${aggEntries.length}`);

    // Aggressive SL/TP ratios: tighter SL, larger TP
    const aggExits = [
      { sl: 0.5, tp: 2.0 },  // 1:4 ratio - needs 60% WR
      { sl: 0.75, tp: 2.5 },  // 1:3.3 - needs 65% WR
      { sl: 1.0, tp: 3.0 },  // 1:3 - needs 66% WR
      { sl: 1.0, tp: 4.0 },  // 1:4 - needs 60% WR
      { sl: 0.5, tp: 1.5 },  // 1:3 - needs 66% WR
      { sl: 0.75, tp: 3.0 }, // 1:4 - needs 60% WR
    ];

    for (const ex of aggExits) {
      const trades = simulate(aggEntries, candles, ex.sl, ex.tp);
      const r = report(trades);
      if (!r || r.trades < 20) continue;

      const meets = r.wr >= 70 && r.monthlyPnL >= 25;
      const flag = meets ? ' ✅ TARGET MET' : '';
      console.log(`  SL=${ex.sl}% TP=${ex.tp}% → WR=${r.wr}% Mth=${r.monthlyPnL}% trades=${r.trades}${flag}`);

      if (meets) {
        results.push({ tf, strategy: 'Aggressive', ...ex, ...r });
      }
    }

    // Test CONSERVATIVE entries
    console.log(`\n📊 CONSERVATIVE STRATEGY (High confluence, fewer entries)\n`);
    const conEntries = entriesConservative(candles, ind);
    console.log(`  Entries: ${conEntries.length}`);

    // Conservative can use looser exits since fewer but higher quality entries
    const conExits = [
      { sl: 0.5, tp: 1.5 },
      { sl: 0.5, tp: 2.0 },
      { sl: 0.75, tp: 2.0 },
      { sl: 0.75, tp: 2.5 },
      { sl: 1.0, tp: 2.0 },
      { sl: 1.0, tp: 3.0 },
      { sl: 1.0, tp: 4.0 },
      { sl: 1.5, tp: 3.0 },
    ];

    for (const ex of conExits) {
      const trades = simulate(conEntries, candles, ex.sl, ex.tp);
      const r = report(trades);
      if (!r || r.trades < 20) continue;

      const meets = r.wr >= 70 && r.monthlyPnL >= 25;
      const flag = meets ? ' ✅ TARGET MET' : '';
      console.log(`  SL=${ex.sl}% TP=${ex.tp}% → WR=${r.wr}% Mth=${r.monthlyPnL}% trades=${r.trades}${flag}`);

      if (meets) {
        results.push({ tf, strategy: 'Conservative', ...ex, ...r });
      }
    }

    return results;
  } catch (e) {
    console.error(`❌ Error:`, e.message);
    return null;
  }
}

async function main() {
  console.log('🎯 AGGRESSIVE SIGNAL ENGINE - OPTIMIZED FOR +25% MONTHLY');
  console.log('📊 Testing: Loose & Conservative filters with 3:1 to 4:1 RR ratios\n');

  const allResults = [];

  // Test each timeframe
  for (const tf of ['15m', '30m', '1h', '4h']) {
    const results = await testTimeframe(tf);
    if (results && results.length > 0) {
      allResults.push(...results);
    }
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 FINAL RESULTS - MEETING 70% WR + 25% MONTHLY');
  console.log(`${'='.repeat(70)}\n`);

  if (allResults.length === 0) {
    console.log('❌ No perfect configs found');
    console.log('\n💡 Findings:');
    console.log('  - 70% WR alone is not enough for +25% monthly');
    console.log('  - Need: More trades OR higher RR ratios');
    console.log('  - Next: Use position sizing + leverage (2-3x)');
  } else {
    allResults.sort((a, b) => b.monthlyPnL - a.monthlyPnL);
    console.log('✅ WINNING CONFIGURATIONS:\n');
    allResults.slice(0, 10).forEach((r, i) => {
      console.log(`${i + 1}. [${r.tf.toUpperCase()}] ${r.strategy}`);
      console.log(`   SL=${r.sl}% TP=${r.tp}% → WR=${r.wr}% Monthly=${r.monthlyPnL}% (${r.trades} trades)\n`);
    });

    console.log('\n🎯 RECOMMENDED CONFIG:\n');
    const best = allResults[0];
    console.log(`Timeframe: ${best.tf.toUpperCase()}`);
    console.log(`Strategy: ${best.strategy}`);
    console.log(`Entry: ${best.strategy === 'Aggressive' ? 'Loose filters, many entries' : 'High confluence, few entries'}`);
    console.log(`Stop Loss: ${best.sl}%`);
    console.log(`Take Profit: ${best.tp}%`);
    console.log(`Expected Win Rate: ${best.wr}%`);
    console.log(`Expected Monthly PnL: ${best.monthlyPnL}%`);
    console.log(`Expected Trades/Month: ${Math.round(best.trades / 12)}`);
  }

  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
