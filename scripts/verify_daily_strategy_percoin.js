#!/usr/bin/env node
const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const BINANCE_API = 'https://api.binance.com/api/v3';
const COINS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'LINKUSDT', 'AVAXUSDT'];
const LOOKBACK_DAYS = 180;
const INTERVAL = '15m';
const BB_DEV = 1.1, SL = 0.9, TP = 0.35;

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
  const iterations = Math.ceil((days * 24 * 60) / parseInt(interval) / limit) + 1;
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

function findDailyEntries(candles, haClose, bbDev) {
  const n = candles.length;
  const upper = new Array(n).fill(null), lower = new Array(n).fill(null);
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
  let lastDay = null, takenToday = false;
  for (let i = 20; i < n; i++) {
    const day = candles[i].open_time.split('T')[0];
    if (day !== lastDay) { lastDay = day; takenToday = false; }
    if (takenToday || upper[i] === null || lower[i] === null) continue;
    const close = haClose[i];
    if (close <= lower[i]) { entries.push({ idx: i, type: 'buy', price: candles[i].close, time: candles[i].open_time }); takenToday = true; }
    else if (close >= upper[i]) { entries.push({ idx: i, type: 'sell', price: candles[i].close, time: candles[i].open_time }); takenToday = true; }
  }
  return entries;
}

function simulateTrade(entry, candles, sl, tp) {
  const isBuy = entry.type === 'buy';
  const entryPrice = entry.price;
  const slPrice = isBuy ? entryPrice * (1 - sl / 100) : entryPrice * (1 + sl / 100);
  const tpPrice = isBuy ? entryPrice * (1 + tp / 100) : entryPrice * (1 - tp / 100);
  for (let j = entry.idx + 1; j < Math.min(entry.idx + 200, candles.length); j++) {
    const c = candles[j];
    const slHit = isBuy ? c.low <= slPrice : c.high >= slPrice;
    const tpHit = isBuy ? c.high >= tpPrice : c.low <= tpPrice;
    if (slHit) return { pnl: -sl, result: 'loss' };
    if (tpHit) return { pnl: tp, result: 'win' };
  }
  const last = candles[Math.min(entry.idx + 200, candles.length - 1)];
  const pnl = isBuy ? ((last.close - entryPrice) / entryPrice) * 100 : ((entryPrice - last.close) / entryPrice) * 100;
  return { pnl, result: pnl > 0.02 ? 'win' : pnl < -0.02 ? 'loss' : 'scratch' };
}

async function main() {
  console.log(`🔍 PER-COIN VERIFICATION: BB=${BB_DEV} SL=${SL}% TP=${TP}%\n`);
  let grandTotal = { trades: 0, wins: 0, pnl: 0 };

  for (const coin of COINS) {
    const candles = await fetchCandles(coin, INTERVAL, LOOKBACK_DAYS);
    const { haClose } = toHeikinAshi(candles);
    const entries = findDailyEntries(candles, haClose, BB_DEV);
    const trades = entries.map(e => simulateTrade(e, candles, SL, TP));
    const wins = trades.filter(t => t.result === 'win').length;
    const wr = (wins / trades.length) * 100;
    const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
    const days = new Set(entries.map(e => e.time.split('T')[0])).size;
    console.log(`${coin}: ${trades.length} trades over ${days} days | WR=${wr.toFixed(1)}% | AvgPnL/trade=${(totalPnl / trades.length).toFixed(3)}% | TotalPnL=${totalPnl.toFixed(1)}%`);
    grandTotal.trades += trades.length;
    grandTotal.wins += wins;
    grandTotal.pnl += totalPnl;
  }

  console.log(`\n📊 AGGREGATE: ${grandTotal.trades} trades | WR=${(grandTotal.wins / grandTotal.trades * 100).toFixed(1)}% | AvgPnL/trade=${(grandTotal.pnl / grandTotal.trades).toFixed(3)}%`);
  process.exit(0);
}
main().catch(err => { console.error(err); process.exit(1); });
