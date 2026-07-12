const axios = require('axios');

const API = 'https://api.binance.com/api/v3';
const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
const TFS = ['1h', '4h'];

async function fetchCandles(symbol, tf) {
  let all = [], endTime = Date.now();
  for (let i = 0; i < 150; i++) {
    try {
      const r = await axios.get(`${API}/klines`, {
        params: { symbol, interval: tf, endTime, limit: 1000 }
      });
      if (!r.data?.length) break;
      all.unshift(...r.data.map(k => ({
        time: new Date(+k[0]),
        o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[7]
      })));
      endTime = +r.data[0][0] - 1;
      if (r.data.length < 1000) break;
    } catch(e) { break; }
  }
  return all.sort((a, b) => a.time - b.time);
}

function emaArr(closes, p) {
  const out = new Array(closes.length).fill(null);
  if (closes.length < p) return out;
  const k = 2 / (p + 1);
  let prev = closes.slice(0, p).reduce((a, b) => a + b) / p;
  out[p - 1] = prev;
  for (let i = p; i < closes.length; i++) {
    prev = closes[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

function rsiArr(closes, p = 14) {
  const out = new Array(closes.length).fill(null);
  if (closes.length < p + 1) return out;
  let g = 0, l = 0;
  for (let i = 1; i <= p; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) g += d; else l -= d;
  }
  g /= p; l /= p;
  out[p] = 100 - 100 / (1 + (l === 0 ? 100 : g / l));
  for (let i = p + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    g = (g * (p - 1) + Math.max(d, 0)) / p;
    l = (l * (p - 1) + Math.max(-d, 0)) / p;
    out[i] = 100 - 100 / (1 + (l === 0 ? 100 : g / l));
  }
  return out;
}

function entriesSR(c) {
  const out = [];
  const per = 40;
  const closes = c.map(x => x.c);
  const ema50 = emaArr(closes, 50);
  const ema200 = emaArr(closes, 200);
  const rsi = rsiArr(closes, 14);
  
  for (let i = per + 210; i < c.length; i++) {
    if (!ema50[i] || !ema200[i] || !rsi[i]) continue;
    
    let res = -Infinity, sup = Infinity;
    for (let j = i - per; j < i; j++) {
      res = Math.max(res, c[j].h);
      sup = Math.min(sup, c[j].l);
    }
    
    const vol_avg_loc = c.slice(Math.max(0, i - 20), i).reduce((a, b) => a + b.v, 0) / 20;
    const upT = ema50[i] > ema200[i];
    const dnT = ema50[i] < ema200[i];
    
    if (upT && c[i-1].c < res && c[i].c > res && c[i].v > vol_avg_loc * 1.5 && 
        rsi[i] > 25 && rsi[i] < 75 && c[i].c > c[i].o) {
      out.push({ idx: i, type: 'buy', time: c[i].time });
    }
    
    if (dnT && c[i-1].c > sup && c[i].c < sup && c[i].v > vol_avg_loc * 1.5 && 
        rsi[i] > 25 && rsi[i] < 75 && c[i].c < c[i].o) {
      out.push({ idx: i, type: 'sell', time: c[i].time });
    }
  }
  
  return out;
}

function simulate(entries, c, sl, tp) {
  const trades = [];
  let last = -1;
  
  for (const e of entries) {
    if (e.idx <= last) continue;
    
    const buy = e.type === 'buy';
    const entry = c[e.idx].c;
    const sl_p = buy ? entry * (1 - sl/100) : entry * (1 + sl/100);
    const tp_p = buy ? entry * (1 + tp/100) : entry * (1 - tp/100);
    
    for (let j = e.idx + 1; j < Math.min(e.idx + 100, c.length); j++) {
      if (buy ? c[j].l <= sl_p : c[j].h >= sl_p) {
        const pnl = buy ? -sl : -sl;
        trades.push({ time: c[e.idx].time, pnl, win: false });
        last = j;
        break;
      }
      if (buy ? c[j].h >= tp_p : c[j].l <= tp_p) {
        const pnl = buy ? tp : -tp;
        trades.push({ time: c[e.idx].time, pnl, win: true });
        last = j;
        break;
      }
    }
  }
  
  return trades;
}

(async () => {
  console.log('🎯 COMPREHENSIVE 1-YEAR BACKTEST\n');
  console.log('Strategy: High-Confluence SR Breakout');
  console.log('Coins: BTC, ETH, BNB');
  console.log('Timeframes: 1h + 4h');
  console.log('Entry: SR break + EMA trend + Volume spike + RSI zone');
  console.log('SL: 1.5% | TP: 3.5%\n');
  console.log('='.repeat(80) + '\n');
  
  let allTrades = [];
  
  for (const sym of SYMBOLS) {
    console.log(`📈 ${sym}...`);
    
    for (const tf of TFS) {
      process.stdout.write(`  ${tf}... `);
      const c = await fetchCandles(sym, tf);
      if (c.length < 500) { console.log('❌'); continue; }
      
      const entries = entriesSR(c);
      console.log(`✅ ${entries.length} entries`);
      
      if (entries.length < 10) continue;
      
      const trades = simulate(entries, c, 1.5, 3.5);
      
      for (const t of trades) {
        t.symbol = sym;
        t.tf = tf;
      }
      
      allTrades.push(...trades);
    }
  }
  
  console.log(`\n\nTotal Trades: ${allTrades.length}\n`);
  
  if (allTrades.length === 0) {
    console.log('❌ No trades generated');
    process.exit(0);
  }
  
  allTrades.sort((a, b) => a.time - b.time);
  
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;
  const oneMonth = 30 * oneDay;
  const sixMonth = 180 * oneDay;
  
  function getMetrics(trades) {
    if (!trades.length) return null;
    const wins = trades.filter(t => t.win).length;
    const losses = trades.filter(t => !t.win).length;
    const wr = (wins / trades.length * 100).toFixed(1);
    const total = trades.reduce((s, t) => s + t.pnl, 0).toFixed(2);
    const avg = (total / trades.length).toFixed(3);
    const best = Math.max(...trades.map(t => t.pnl)).toFixed(2);
    const worst = Math.min(...trades.map(t => t.pnl)).toFixed(2);
    return { trades: trades.length, wins, losses, wr, total, avg, best, worst };
  }
  
  const today = allTrades.filter(t => t.time > new Date(now - oneDay));
  const week = allTrades.filter(t => t.time > new Date(now - oneWeek));
  const month = allTrades.filter(t => t.time > new Date(now - oneMonth));
  const six = allTrades.filter(t => t.time > new Date(now - sixMonth));
  const year = allTrades;
  
  console.log('='.repeat(80));
  console.log('📊 PERFORMANCE METRICS\n');
  
  const periods = [
    { data: today, label: 'TODAY (24h)', show: today.length > 0 },
    { data: week, label: '1 WEEK', show: true },
    { data: month, label: '30 DAYS', show: true },
    { data: six, label: '6 MONTHS', show: true },
    { data: year, label: '1 YEAR (FULL BACKTEST)', show: true },
  ];
  
  for (const p of periods) {
    if (!p.show) continue;
    const m = getMetrics(p.data);
    if (!m) {
      console.log(`${p.label}: No trades\n`);
      continue;
    }
    
    console.log(`${p.label}:`);
    console.log(`  📊 Trades: ${m.trades} | Wins: ${m.wins} | Losses: ${m.losses}`);
    console.log(`  🎯 Win Rate: ${m.wr}%`);
    console.log(`  💰 Total PnL: ${m.total}% | Avg/Trade: ${m.avg}%`);
    console.log(`  📈 Best Trade: +${m.best}% | Worst Trade: ${m.worst}%`);
    console.log();
  }
  
  const y = getMetrics(year);
  console.log('='.repeat(80));
  console.log('\n✅ ANNUAL SUMMARY:\n');
  console.log(`Total Trades: ${y.trades}`);
  console.log(`Win Rate: ${y.wr}%`);
  console.log(`Total Annual PnL: ${y.total}%`);
  console.log(`Average PnL/Trade: ${y.avg}%`);
  console.log(`Monthly Average: ${(y.total / 12).toFixed(1)}%`);
  console.log(`Daily Average: ${(y.total / 365).toFixed(2)}%`);
  console.log(`\nAchieved Target: ${y.total >= 15 ? '✅ YES (+15-20% sustainable)' : '⚠️  Below +15% target'}\n`);
  
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
