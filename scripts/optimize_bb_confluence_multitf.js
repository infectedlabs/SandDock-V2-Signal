#!/usr/bin/env node
/**
 * BOLLINGER BAND + CONFLUENCE OPTIMIZATION - MULTI-TIMEFRAME
 * Based on your proven V2 engine that achieves 70%+ WR
 *
 * Optimizes:
 * - BB deviation (1.5 to 2.5)
 * - Confluence filters (volume, RSI levels, momentum)
 * - Take profit ratios (0.5% to 2.0%)
 * - Stop loss ratios (0.5% to 2.0%)
 *
 * Across: 5m, 15m, 30m, 1h, 4h timeframes
 * Goal: 70%+ WR, +25% monthly PnL per timeframe
 */

const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const BINANCE_API = 'https://api.binance.com/api/v3';
const SYMBOL = 'BTCUSDT';
const TIMEFRAMES = ['5m', '15m', '30m', '1h', '4h'];
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

// BB + Confluence entry (your proven strategy)
function entriesBBConfluence(c, ind, params) {
  const { bb, rsi, ema200, avgVol } = ind;
  const { bbDeviation, volumeThresh, rsiMinBull, rsiMaxBull, rsiMinBear, rsiMaxBear } = params;
  const out = [];

  // Recalc BB with current deviation if needed
  let bb_use = bb;
  if (bbDeviation !== 2) {
    bb_use = bbArrCustom(c.map(x => x.close), 20, bbDeviation);
  }

  for (let i = 210; i < c.length; i++) {
    if (!bb_use.middle[i] || !rsi[i] || !ema200[i] || !avgVol[i]) continue;

    const bullSig = (c[i].close < bb_use.middle[i]) &&              // Price below middle BB
                    (rsi[i] > rsiMinBull && rsi[i] < rsiMaxBull) &&  // RSI in zone
                    (c[i].volume > avgVol[i] * volumeThresh) &&      // Volume spike
                    (c[i].close > ema200[i]) &&                      // Above long-term trend
                    (c[i].close > c[i].open);                        // Bullish candle

    const bearSig = (c[i].close > bb_use.middle[i]) &&              // Price above middle BB
                    (rsi[i] < rsiMaxBear && rsi[i] > rsiMinBear) &&  // RSI in zone
                    (c[i].volume > avgVol[i] * volumeThresh) &&      // Volume spike
                    (c[i].close < ema200[i]) &&                      // Below long-term trend
                    (c[i].close < c[i].open);                        // Bearish candle

    if (bullSig) out.push({ idx: i, type: 'buy' });
    else if (bearSig) out.push({ idx: i, type: 'sell' });
  }

  // Enforce max signals per day
  const byDay = {};
  for (const sig of out) {
    const day = c[sig.idx].open_time.split('T')[0];
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(sig);
  }
  const filtered = [];
  for (const sigs of Object.values(byDay)) {
    filtered.push(...sigs.slice(0, 4)); // Max 4/day
  }
  return filtered.sort((a, b) => a.idx - b.idx);
}

function bbArrCustom(closes, period = 20, deviation = 2) {
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
  const monthlyPnl = perDay * 21;
  return {
    trades: trades.length,
    wr: +wr.toFixed(1),
    avgPnl: +(total / trades.length).toFixed(3),
    total: +total.toFixed(1),
    monthlyPnl: +monthlyPnl.toFixed(1),
  };
}

async function main() {
  console.log('🎯 BB + CONFLUENCE OPTIMIZATION ACROSS ALL TIMEFRAMES');
  console.log('📊 Tuning: BB deviation, volume, RSI zones, exits\n');

  // Parameter grid
  const bbDeviations = [1.5, 1.8, 2.0, 2.2, 2.5];
  const volumeThresholds = [1.1, 1.2, 1.3, 1.5];
  const rsiBullZones = [[30, 50], [35, 50], [40, 55]];
  const rsiBearZones = [[50, 70], [45, 65], [50, 65]];
  const exitCombos = [
    { sl: 0.5, tp: 0.75 }, { sl: 0.75, tp: 1.0 }, { sl: 1.0, tp: 1.0 },
    { sl: 1.0, tp: 1.5 }, { sl: 1.5, tp: 1.0 }, { sl: 1.5, tp: 1.5 },
    { sl: 2.0, tp: 1.0 }, { sl: 2.0, tp: 2.0 },
  ];

  const masterResults = [];

  for (const tf of TIMEFRAMES) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`⏱️  OPTIMIZING: ${tf}`);
    console.log(`${'='.repeat(70)}`);

    try {
      const candles = await fetchCandles(SYMBOL, tf, LOOKBACK_DAYS);
      if (candles.length < 300) {
        console.log(`❌ Insufficient data: ${candles.length} candles`);
        continue;
      }

      console.log(`✅ Loaded ${candles.length} candles`);
      const closes = candles.map(c => c.close);

      const ind = {
        ema200: emaArr(closes, 200),
        rsi: rsiArr(closes, 14),
        bb: bbArr(closes, 20, 2),
        avgVol: avgVolArr(candles, 20),
      };

      let bestForTf = null;
      let iterations = 0;
      const totalConfigs = bbDeviations.length * volumeThresholds.length *
                           rsiBullZones.length * rsiBearZones.length * exitCombos.length;

      for (const bbDev of bbDeviations) {
        for (const volThresh of volumeThresholds) {
          for (const [rsiMinBull, rsiMaxBull] of rsiBullZones) {
            for (const [rsiMinBear, rsiMaxBear] of rsiBearZones) {
              const params = { bbDeviation: bbDev, volumeThresh: volThresh,
                              rsiMinBull, rsiMaxBull, rsiMinBear, rsiMaxBear };
              const entries = entriesBBConfluence(candles, ind, params);
              if (entries.length < 10) continue;

              for (const ex of exitCombos) {
                const trades = simulate(entries, candles, ex.sl, ex.tp);
                const r = report(trades);
                if (!r || r.trades < 10) continue;

                iterations++;
                if (r.wr >= 70 && r.monthlyPnl >= 25) {
                  console.log(`✅ FOUND: BB=${bbDev} Vol=${volThresh} RSI=${rsiMinBull}-${rsiMaxBull}/${rsiMinBear}-${rsiMaxBear} SL=${ex.sl}% TP=${ex.tp}% → WR=${r.wr}% Monthly=${r.monthlyPnl}%`);
                  masterResults.push({ tf, ...params, ...ex, ...r });
                }

                const score = r.wr * 0.7 + Math.min(r.monthlyPnl, 50) * 0.3;
                if (!bestForTf || score > bestForTf.score) {
                  bestForTf = { tf, ...params, ...ex, ...r, score };
                }
              }
            }
          }
        }
      }

      if (bestForTf) {
        console.log(`\n🏆 Best for ${tf}: WR=${bestForTf.wr}% Monthly=${bestForTf.monthlyPnl}% (${bestForTf.trades} trades)`);
      }
    } catch (e) {
      console.error(`❌ Error for ${tf}:`, e.message);
    }
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 FINAL RESULTS - CONFIGS MEETING 70% WR + 25% MONTHLY');
  console.log(`${'='.repeat(70)}\n`);

  if (masterResults.length === 0) {
    console.log('⚠️  No perfect configs found. Adjust target or refine filters.');
  } else {
    masterResults.sort((a, b) => (b.wr * 0.7 + b.monthlyPnl * 0.3) - (a.wr * 0.7 + b.monthlyPnl * 0.3));
    console.log('Top Configurations:\n');
    masterResults.slice(0, 10).forEach((r, i) => {
      console.log(`${i+1}. [${r.tf}] BB=${r.bbDeviation} Vol=${r.volumeThresh} RSI=${r.rsiMinBull}-${r.rsiMaxBull}/${r.rsiMinBear}-${r.rsiMaxBear}`);
      console.log(`   SL=${r.sl}% TP=${r.tp}% → WR=${r.wr}% Monthly=${r.monthlyPnl}% (${r.trades} trades)\n`);
    });

    console.log('\n📝 RECOMMENDED DEPLOYMENT:');
    const byTf = {};
    for (const r of masterResults) {
      if (!byTf[r.tf]) byTf[r.tf] = r;
    }
    for (const tf of TIMEFRAMES) {
      if (byTf[tf]) {
        const r = byTf[tf];
        console.log(`\n${tf.toUpperCase()}:`);
        console.log(`  BB_DEVIATION: ${r.bbDeviation}`);
        console.log(`  MIN_VOLUME_PCT: ${r.volumeThresh}`);
        console.log(`  RSI_BULL_ZONE: [${r.rsiMinBull}, ${r.rsiMaxBull}]`);
        console.log(`  RSI_BEAR_ZONE: [${r.rsiMinBear}, ${r.rsiMaxBear}]`);
        console.log(`  SL_PCT: ${r.sl}`);
        console.log(`  TP_PCT: ${r.tp}`);
        console.log(`  EXPECTED: WR=${r.wr}% Monthly=${r.monthlyPnl}%`);
      }
    }
  }

  console.log('\n✅ Optimization complete');
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
