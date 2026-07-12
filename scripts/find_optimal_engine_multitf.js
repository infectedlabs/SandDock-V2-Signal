#!/usr/bin/env node
/**
 * MULTI-TIMEFRAME SIGNAL ENGINE RESEARCH
 * Goal: Find optimal signal engine across 5m, 15m, 30m, 1h, 4h
 * Targets: 70%+ win rate, +25% PnL per 30 days
 *
 * Tests 8 entry archetypes + 12 exit combos per timeframe
 * 1 year BTC data per TF = comprehensive backtest
 */

const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const BINANCE_API = 'https://api.binance.com/api/v3';
const SYMBOL = 'BTCUSDT';
const TIMEFRAMES = ['5m', '15m', '30m', '1h', '4h'];
const LOOKBACK_DAYS = 365;

// ---------- Data Fetching ----------
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
        open: +k[1], high: +k[2], low: +k[3], close: +k[4],
        volume: +k[7], trades: +k[8]
      }));
      all.unshift(...candles);
      endTime = new Date(candles[0].open_time).getTime() - 1;
      if (candles.length < limit) break;
      console.log(`  Fetched batch ${i+1}: ${candles.length} candles, total: ${all.length}`);
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

// ---------- Technical Indicators ----------
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

function macdArr(closes, fast = 12, slow = 26, signal = 9) {
  const ef = emaArr(closes, fast), es = emaArr(closes, slow);
  const macd = closes.map((_, i) => (ef[i] != null && es[i] != null) ? ef[i] - es[i] : null);
  const sig = new Array(closes.length).fill(null);
  const k = 2 / (signal + 1);
  let prev = null, count = 0, seed = 0;
  const firstIdx = macd.findIndex(v => v != null);
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

// ---------- Entry Strategies ----------
function entryBBReversal(c, ind) {
  const { bb, rsi } = ind;
  const out = [];
  for (let i = 21; i < c.length; i++) {
    if (!bb.upper[i] || !rsi[i] || !rsi[i-1]) continue;
    // Touch BB lower band + RSI reversal
    if (c[i].low < bb.lower[i] && rsi[i-1] < 30 && rsi[i] > rsi[i-1] && c[i].close > c[i].open)
      out.push({ idx: i, type: 'buy' });
    if (c[i].high > bb.upper[i] && rsi[i-1] > 70 && rsi[i] < rsi[i-1] && c[i].close < c[i].open)
      out.push({ idx: i, type: 'sell' });
  }
  return out;
}

function entryTrendPullback(c, ind) {
  const { ema50, ema200, rsi } = ind;
  const out = [];
  for (let i = 210; i < c.length; i++) {
    if (!ema50[i] || !ema200[i] || !rsi[i]) continue;
    const upTrend = ema50[i] > ema200[i] && c[i].close > ema200[i];
    const dnTrend = ema50[i] < ema200[i] && c[i].close < ema200[i];
    if (upTrend && rsi[i-1] < 40 && rsi[i] > 45 && c[i].close > c[i].open)
      out.push({ idx: i, type: 'buy' });
    else if (dnTrend && rsi[i-1] > 60 && rsi[i] < 55 && c[i].close < c[i].open)
      out.push({ idx: i, type: 'sell' });
  }
  return out;
}

function entryMacdCross(c, ind) {
  const { macd, sig, ema200 } = ind;
  const out = [];
  for (let i = 210; i < c.length; i++) {
    if (!macd[i] || !sig[i] || !sig[i-1] || !ema200[i]) continue;
    const crossUp = macd[i-1] <= sig[i-1] && macd[i] > sig[i];
    const crossDn = macd[i-1] >= sig[i-1] && macd[i] < sig[i];
    if (crossUp && c[i].close > ema200[i]) out.push({ idx: i, type: 'buy' });
    else if (crossDn && c[i].close < ema200[i]) out.push({ idx: i, type: 'sell' });
  }
  return out;
}

function entryRsiExtreme(c, ind) {
  const { rsi } = ind;
  const out = [];
  for (let i = 20; i < c.length; i++) {
    if (!rsi[i] || !rsi[i-1]) continue;
    if (rsi[i-1] < 25 && rsi[i] > rsi[i-1] && c[i].close > c[i].open)
      out.push({ idx: i, type: 'buy' });
    else if (rsi[i-1] > 75 && rsi[i] < rsi[i-1] && c[i].close < c[i].open)
      out.push({ idx: i, type: 'sell' });
  }
  return out;
}

function entryBBConfluence(c, ind) {
  const { bb, rsi, ema200, avgVol } = ind;
  const out = [];
  for (let i = 210; i < c.length; i++) {
    if (!bb.middle[i] || !rsi[i] || !ema200[i] || !avgVol[i]) continue;
    const bullSig = (c[i].close < bb.middle[i]) && (rsi[i] > 35 && rsi[i] < 50) &&
                    (c[i].volume > avgVol[i] * 1.2) && (c[i].close > ema200[i]);
    const bearSig = (c[i].close > bb.middle[i]) && (rsi[i] < 65 && rsi[i] > 50) &&
                    (c[i].volume > avgVol[i] * 1.2) && (c[i].close < ema200[i]);
    if (bullSig) out.push({ idx: i, type: 'buy' });
    else if (bearSig) out.push({ idx: i, type: 'sell' });
  }
  return out;
}

function entryVolBreakout(c, ind) {
  const { avgVol } = ind;
  const out = [];
  const rangePeriod = 20;
  for (let i = rangePeriod + 5; i < c.length; i++) {
    if (!avgVol[i]) continue;
    let hh = -Infinity, ll = Infinity;
    for (let j = i - rangePeriod; j < i; j++) {
      hh = Math.max(hh, c[j].high);
      ll = Math.min(ll, c[j].low);
    }
    const volSpike = c[i].volume > avgVol[i] * 1.5;
    const breakOut = c[i].close > hh * 1.001;
    const breakDn = c[i].close < ll * 0.999;
    if (breakOut && volSpike && c[i].close > c[i].open) out.push({ idx: i, type: 'buy' });
    if (breakDn && volSpike && c[i].close < c[i].open) out.push({ idx: i, type: 'sell' });
  }
  return out;
}

function entryDonchianMean(c, ind) {
  const { ema200 } = ind;
  const out = [];
  const period = 30;
  for (let i = period + 200; i < c.length; i++) {
    if (!ema200[i]) continue;
    let hh = -Infinity, ll = Infinity;
    for (let j = i - period; j < i; j++) {
      hh = Math.max(hh, c[j].high);
      ll = Math.min(ll, c[j].low);
    }
    const mid = (hh + ll) / 2;
    const upTrend = c[i].close > ema200[i];
    const dnTrend = c[i].close < ema200[i];
    if (upTrend && c[i-1].low <= mid && c[i].close > mid && c[i].close > c[i].open)
      out.push({ idx: i, type: 'buy' });
    if (dnTrend && c[i-1].high >= mid && c[i].close < mid && c[i].close < c[i].open)
      out.push({ idx: i, type: 'sell' });
  }
  return out;
}

function entryChannelBreak(c, ind) {
  const { ema50, ema200 } = ind;
  const out = [];
  for (let i = 210; i < c.length; i++) {
    if (!ema50[i] || !ema200[i]) continue;
    const diff = Math.abs(ema50[i] - ema200[i]) / ema200[i];
    if (diff < 0.01) continue; // Only in tight channels
    const aboveEma50 = c[i].close > ema50[i];
    const breakAbove = c[i-1].close <= ema50[i] && c[i].close > ema50[i];
    const breakBelow = c[i-1].close >= ema50[i] && c[i].close < ema50[i];
    if (breakAbove && ema50[i] > ema200[i]) out.push({ idx: i, type: 'buy' });
    if (breakBelow && ema50[i] < ema200[i]) out.push({ idx: i, type: 'sell' });
  }
  return out;
}

// ---------- Simulation ----------
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
        lastExitIdx = j; closed = true; break;
      }
      if (tpHit) {
        const pnl = isBuy ? ((tp - entryPrice) / entryPrice) * 100 : ((entryPrice - tp) / entryPrice) * 100;
        trades.push({ pnl, win: true });
        lastExitIdx = j; closed = true; break;
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

function report(trades, tradingDays = 252) {
  if (!trades.length) return null;
  const wins = trades.filter(t => t.win).length;
  const wr = wins / trades.length * 100;
  const total = trades.reduce((s, t) => s + t.pnl, 0);
  const perDay = total / tradingDays;
  const monthlyPnl = perDay * 21; // 21 trading days/month
  const winSum = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const lossSum = Math.abs(trades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
  return {
    trades: trades.length,
    wr: +wr.toFixed(1),
    avgPnl: +(total / trades.length).toFixed(3),
    total: +total.toFixed(1),
    monthlyPnl: +monthlyPnl.toFixed(1),
    pf: +(lossSum > 0 ? winSum / lossSum : 99).toFixed(2),
    perWeek: +(trades.length / (365 / 7)).toFixed(1),
  };
}

// ---------- Main ----------
async function main() {
  console.log('🔍 MULTI-TIMEFRAME SIGNAL ENGINE RESEARCH');
  console.log('📊 Target: 70%+ WR, +25% Monthly PnL');
  console.log('🎯 Testing 8 strategies × 12 exits × 5 timeframes\n');

  const results = [];

  for (const tf of TIMEFRAMES) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`⏱️  TESTING TIMEFRAME: ${tf}`);
    console.log(`${'='.repeat(70)}`);

    try {
      const candles = await fetchCandles(SYMBOL, tf, LOOKBACK_DAYS);
      if (candles.length < 300) {
        console.log(`❌ Not enough data for ${tf}: ${candles.length} candles`);
        continue;
      }

      console.log(`✅ Loaded ${candles.length} candles\n`);
      const closes = candles.map(c => c.close);

      // Calculate indicators
      const ind = {
        ema50: emaArr(closes, 50),
        ema200: emaArr(closes, 200),
        rsi: rsiArr(closes, 14),
        bb: bbArr(closes, 20, 2),
        avgVol: avgVolArr(candles, 20),
      };
      const { macd, sig } = macdArr(closes);
      ind.macd = macd;
      ind.sig = sig;

      // Test strategies
      const strategies = [
        ['BBReversal', entryBBReversal],
        ['TrendPullback', entryTrendPullback],
        ['MACDCross', entryMacdCross],
        ['RSIExtreme', entryRsiExtreme],
        ['BBConfluence', entryBBConfluence],
        ['VolBreakout', entryVolBreakout],
        ['DonchianMean', entryDonchianMean],
        ['ChannelBreak', entryChannelBreak],
      ];

      const exitCombos = [
        { sl: 0.5, tp: 0.5 }, { sl: 0.5, tp: 0.75 }, { sl: 0.5, tp: 1.0 },
        { sl: 0.75, tp: 0.75 }, { sl: 0.75, tp: 1.0 }, { sl: 1.0, tp: 0.75 },
        { sl: 1.0, tp: 1.0 }, { sl: 1.0, tp: 1.5 }, { sl: 1.5, tp: 1.0 },
        { sl: 1.5, tp: 1.5 }, { sl: 2.0, tp: 1.0 }, { sl: 2.0, tp: 2.0 },
      ];

      for (const [name, entryfn] of strategies) {
        const entries = entryfn(candles, ind);
        if (entries.length < 10) continue; // Skip if too few entries

        console.log(`\n📈 ${name}: ${entries.length} entries`);

        let bestConfig = null;
        let maxScore = 0;

        for (const ex of exitCombos) {
          const trades = simulate(entries, candles, ex.sl, ex.tp);
          const r = report(trades);
          if (!r) continue;

          // Score: (WR - 50) * monthlyPnL (balance win rate with profitability)
          const score = Math.max(0, r.wr - 60) * r.monthlyPnl;

          if (r.wr >= 70 && r.monthlyPnl >= 25) {
            const flag = '✅ TARGET MET';
            console.log(`  SL=${ex.sl}% TP=${ex.tp}% → n=${r.trades} WR=${r.wr}% Monthly=${r.monthlyPnl}% ${flag}`);
            results.push({ tf, strategy: name, ...ex, ...r });
          }
        }
      }
    } catch (e) {
      console.error(`❌ Error for ${tf}:`, e.message);
    }
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 RESULTS SUMMARY - CONFIGURATIONS MEETING TARGETS');
  console.log(`${'='.repeat(70)}\n`);

  if (results.length === 0) {
    console.log('❌ No configurations found meeting 70% WR + 25% monthly PnL');
    console.log('Recommending best per-timeframe configs below:\n');

    // Find best for each TF
    for (const tf of TIMEFRAMES) {
      const candles = await fetchCandles(SYMBOL, tf, LOOKBACK_DAYS);
      if (candles.length < 300) continue;
      const closes = candles.map(c => c.close);
      const ind = {
        ema50: emaArr(closes, 50),
        ema200: emaArr(closes, 200),
        rsi: rsiArr(closes, 14),
        bb: bbArr(closes, 20, 2),
        avgVol: avgVolArr(candles, 20),
      };
      const { macd, sig } = macdArr(closes);
      ind.macd = macd;
      ind.sig = sig;

      const strategies = [
        ['BBReversal', entryBBReversal],
        ['TrendPullback', entryTrendPullback],
        ['MACDCross', entryMacdCross],
      ];

      let best = null;
      for (const [name, entryfn] of strategies) {
        const entries = entryfn(candles, ind);
        if (entries.length < 10) continue;
        const trades = simulate(entries, candles, 1.0, 1.0);
        const r = report(trades);
        if (!r) continue;
        if (!best || (r.wr + r.monthlyPnl * 0.1) > (best.wr + best.monthlyPnl * 0.1)) {
          best = { tf, strategy: name, sl: 1.0, tp: 1.0, ...r };
        }
      }
      if (best) console.log(`${tf}: ${best.strategy} → WR=${best.wr}% Monthly=${best.monthlyPnl}%`);
    }
  } else {
    results.sort((a, b) => (b.wr + b.monthlyPnl * 0.1) - (a.wr + a.monthlyPnl * 0.1));
    console.log('Top Configurations:\n');
    results.slice(0, 15).forEach((r, i) => {
      console.log(`${i+1}. [${r.tf}] ${r.strategy} | SL=${r.sl}% TP=${r.tp}% | WR=${r.wr}% Monthly=${r.monthlyPnl}% (${r.trades} trades)`);
    });
  }

  console.log('\n✅ Research complete. Deploy top configs to production.');
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
