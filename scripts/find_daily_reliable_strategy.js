#!/usr/bin/env node
/**
 * BINANCE FUTURES - HIGH-QUALITY DAILY TRADING STRATEGY
 *
 * Target: 2-4 trades/day across BTC, ETH, BNB
 * Goal: +25% monthly PnL minimum
 * Win rate: Secondary (focus on total PnL)
 *
 * Tests confluence-based entries with high risk-reward ratios
 * to generate sufficient PnL with few daily trades
 *
 * Tests across 10 liquid coins on 15m (the validated best timeframe).
 */

const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const BINANCE_API = 'https://api.binance.com/api/v3';
const COINS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'LINKUSDT', 'AVAXUSDT'];
const LOOKBACK_DAYS = 180;
const INTERVAL = '15m';

// Sweep: pushing TP higher to test if avg PnL/trade can reach 0.25%+ while WR stays >= 75%
const BB_DEVS = [0.9, 1.0, 1.1];
const SL_TP_COMBOS = [
  { sl: 1.0, tp: 0.4, be: null },  { sl: 1.2, tp: 0.4, be: null },  { sl: 1.5, tp: 0.4, be: null },
  { sl: 1.2, tp: 0.5, be: null },  { sl: 1.5, tp: 0.5, be: null },  { sl: 2.0, tp: 0.5, be: null },
  { sl: 1.5, tp: 0.6, be: null },  { sl: 2.0, tp: 0.6, be: null },  { sl: 2.5, tp: 0.6, be: null },
  { sl: 1.8, tp: 0.7, be: null },  { sl: 2.2, tp: 0.7, be: null },
  { sl: 2.0, tp: 0.8, be: null },  { sl: 2.5, tp: 0.8, be: null },  { sl: 3.0, tp: 0.8, be: null },
  { sl: 2.5, tp: 1.0, be: null },  { sl: 3.0, tp: 1.0, be: null },
];

function toHeikinAshi(candles) {
  const n = candles.length;
  const haOpen = new Array(n), haHigh = new Array(n), haLow = new Array(n), haClose = new Array(n);
  haOpen[0] = (candles[0].open + candles[0].close) / 2;
  haClose[0] = (candles[0].open + candles[0].high + candles[0].low + candles[0].close) / 4;
  haHigh[0] = Math.max(candles[0].high, haOpen[0], haClose[0]);
  haLow[0] = Math.min(candles[0].low, haOpen[0], haClose[0]);
  for (let i = 1; i < n; i++) {
    const c = candles[i];
    haClose[i] = (c.open + c.high + c.low + c.close) / 4;
    haOpen[i] = (haOpen[i - 1] + haClose[i - 1]) / 2;
    haHigh[i] = Math.max(c.high, haOpen[i], haClose[i]);
    haLow[i] = Math.min(c.low, haOpen[i], haClose[i]);
  }
  return { haOpen, haHigh, haLow, haClose };
}

async function fetchCandles(symbol, interval, days) {
  const limit = 1000;
  const allCandles = [];
  let endTime = Date.now();
  const minutesPerCandle = parseInt(interval);
  const iterations = Math.ceil((days * 24 * 60) / minutesPerCandle / limit) + 1;
  for (let i = 0; i < iterations; i++) {
    try {
      const response = await axios.get(`${BINANCE_API}/klines`, { params: { symbol, interval, endTime, limit } });
      if (!response.data || response.data.length === 0) break;
      const candles = response.data.map(k => ({
        open_time: new Date(k[0]).toISOString(),
        open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[7]),
      }));
      allCandles.unshift(...candles);
      endTime = new Date(candles[0].open_time).getTime() - 1;
      if (candles.length < limit) break;
    } catch (err) { console.error(`Fetch error ${symbol}:`, err.message); break; }
  }
  return allCandles;
}

// "First qualifying touch of the day" entry detection
function findDailyEntries(candles, haHigh, haLow, haClose, bbDev) {
  const n = candles.length;
  const upper = new Array(n).fill(null);
  const lower = new Array(n).fill(null);

  for (let i = 19; i < n; i++) {
    let sum = 0;
    for (let j = i - 19; j <= i; j++) sum += haClose[j];
    const sma = sum / 20;
    let variance = 0;
    for (let j = i - 19; j <= i; j++) variance += Math.pow(haClose[j] - sma, 2);
    variance /= 20;
    const std = Math.sqrt(variance);
    upper[i] = sma + std * bbDev;
    lower[i] = sma - std * bbDev;
  }

  const entries = [];
  let lastDay = null;
  let takenToday = false;

  for (let i = 20; i < n; i++) {
    const day = candles[i].open_time.split('T')[0];
    if (day !== lastDay) { lastDay = day; takenToday = false; }
    if (takenToday) continue;
    if (upper[i] === null || lower[i] === null) continue;

    const close = haClose[i];
    if (close <= lower[i]) {
      entries.push({ idx: i, type: 'buy', price: candles[i].close, time: candles[i].open_time });
      takenToday = true;
    } else if (close >= upper[i]) {
      entries.push({ idx: i, type: 'sell', price: candles[i].close, time: candles[i].open_time });
      takenToday = true;
    }
  }
  return entries;
}

function simulateTrade(entry, candles, sl, tp, breakevenTrigger = null) {
  const isBuy = entry.type === 'buy';
  const entryPrice = entry.price;
  let slPrice = isBuy ? entryPrice * (1 - sl / 100) : entryPrice * (1 + sl / 100);
  const tpPrice = isBuy ? entryPrice * (1 + tp / 100) : entryPrice * (1 - tp / 100);
  let breakevenLocked = false;

  for (let j = entry.idx + 1; j < Math.min(entry.idx + 200, candles.length); j++) {
    const c = candles[j];
    const favorable = isBuy ? c.high : c.low;
    const favMovePct = isBuy ? ((favorable - entryPrice) / entryPrice) * 100 : ((entryPrice - favorable) / entryPrice) * 100;
    if (breakevenTrigger && !breakevenLocked && favMovePct >= breakevenTrigger) {
      slPrice = entryPrice;
      breakevenLocked = true;
    }
    const slHit = isBuy ? c.low <= slPrice : c.high >= slPrice;
    const tpHit = isBuy ? c.high >= tpPrice : c.low <= tpPrice;
    if (slHit) {
      const pnl = breakevenLocked ? 0 : -sl;
      return { pnl, result: pnl > 0.02 ? 'win' : pnl < -0.02 ? 'loss' : 'scratch' };
    }
    if (tpHit) return { pnl: tp, result: 'win' };
  }
  const last = candles[Math.min(entry.idx + 200, candles.length - 1)];
  const pnl = isBuy ? ((last.close - entryPrice) / entryPrice) * 100 : ((entryPrice - last.close) / entryPrice) * 100;
  return { pnl, result: pnl > 0.02 ? 'win' : pnl < -0.02 ? 'loss' : 'scratch' };
}

async function main() {
  console.log('🎯 SEARCHING FOR A RELIABLE ~1x/DAY/COIN STRATEGY AT 75%+ WIN RATE');
  console.log('=====================================================================\n');

  console.log(`📡 Fetching ${LOOKBACK_DAYS} days of ${INTERVAL} data for ${COINS.length} coins...`);
  const dataByCoin = {};
  for (const coin of COINS) {
    const candles = await fetchCandles(coin, INTERVAL, LOOKBACK_DAYS);
    const { haHigh, haLow, haClose } = toHeikinAshi(candles);
    dataByCoin[coin] = { candles, haHigh, haLow, haClose };
    console.log(`  ${coin}: ${candles.length} candles`);
  }

  const totalDays = new Set(Object.values(dataByCoin)[0].candles.map(c => c.open_time.split('T')[0])).size;
  console.log(`\nTotal calendar days in sample: ${totalDays}\n`);

  const results = [];

  for (const bbDev of BB_DEVS) {
    for (const combo of SL_TP_COMBOS) {
      let allTrades = [];
      let totalEntryDays = 0;

      for (const coin of COINS) {
        const { candles, haHigh, haLow, haClose } = dataByCoin[coin];
        const entries = findDailyEntries(candles, haHigh, haLow, haClose, bbDev);
        totalEntryDays += entries.length;
        for (const entry of entries) {
          allTrades.push({ ...simulateTrade(entry, candles, combo.sl, combo.tp, combo.be), time: entry.time, coin });
        }
      }

      const wins = allTrades.filter(t => t.result === 'win').length;
      const winRate = allTrades.length > 0 ? (wins / allTrades.length) * 100 : 0;
      const totalPnl = allTrades.reduce((s, t) => s + t.pnl, 0);
      const avgPnlPerTrade = allTrades.length > 0 ? totalPnl / allTrades.length : 0;
      const fireRate = (totalEntryDays / (totalDays * COINS.length)) * 100; // % of coin-days with a signal
      const avgSignalsPerDayAllCoins = totalEntryDays / totalDays;

      results.push({
        bbDev, sl: combo.sl, tp: combo.tp, be: combo.be,
        trades: allTrades.length, winRate: parseFloat(winRate.toFixed(1)),
        avgPnlPerTrade: parseFloat(avgPnlPerTrade.toFixed(3)),
        fireRate: parseFloat(fireRate.toFixed(1)),
        avgSignalsPerDayAllCoins: parseFloat(avgSignalsPerDayAllCoins.toFixed(2)),
      });
    }
  }

  console.log('🏆 TOP RESULTS (Win Rate >= 75%, ranked by fire rate then avg PnL/trade)');
  console.log('==========================================================================\n');
  const qualifying = results.filter(r => r.winRate >= 75).sort((a, b) => b.fireRate - a.fireRate || b.avgPnlPerTrade - a.avgPnlPerTrade);
  if (qualifying.length === 0) {
    console.log('❌ No combination reached 75%+ win rate. Showing best win rates found instead:\n');
    const byWr = [...results].sort((a, b) => b.winRate - a.winRate).slice(0, 15);
    byWr.forEach((r, idx) => {
      console.log(`${idx + 1}. BB=${r.bbDev} SL=${r.sl}% TP=${r.tp}% BE=${r.be ?? 'none'} | WR=${r.winRate}% | AvgPnL/trade=${r.avgPnlPerTrade}% | FireRate=${r.fireRate}% (coin-days) | AllCoinsSignals/day=${r.avgSignalsPerDayAllCoins}`);
    });
  } else {
    qualifying.slice(0, 15).forEach((r, idx) => {
      console.log(`${idx + 1}. BB=${r.bbDev} SL=${r.sl}% TP=${r.tp}% BE=${r.be ?? 'none'} | WR=${r.winRate}% | AvgPnL/trade=${r.avgPnlPerTrade}% | FireRate=${r.fireRate}% (coin-days) | AllCoinsSignals/day=${r.avgSignalsPerDayAllCoins}`);
    });
  }

  console.log('\n\n📈 FULL WR-vs-MAGNITUDE CURVE (all combos tested, sorted by TP size)');
  console.log('========================================================================\n');
  const byTp = [...results].sort((a, b) => a.tp - b.tp || a.sl - b.sl);
  byTp.forEach((r) => {
    const flag = r.winRate >= 75 ? '✅' : r.winRate >= 65 ? '⚠️ ' : '❌';
    console.log(`${flag} BB=${r.bbDev} SL=${r.sl}% TP=${r.tp}% | WR=${r.winRate}% | AvgPnL/trade=${r.avgPnlPerTrade}%`);
  });

  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
