const axios = require('axios');

const API = 'https://api.binance.com/api/v3';
const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
const TFS = ['15m', '1h', '4h'];
const LOOKBACK = 5;

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
        h: +k[2], l: +k[3]
      })));
      endTime = +r.data[0][0] - 1;
      if (r.data.length < 1000) break;
    } catch(e) { break; }
  }
  return all.sort((a, b) => a.time - b.time);
}

function detectReversals(candles) {
  const reversals = [];
  let state = 0; // 0=none, 1=top, 2=bottom
  
  for (let i = LOOKBACK; i < candles.length - LOOKBACK; i++) {
    const c = candles[i];
    
    // Check if highest
    let isTop = true;
    for (let j = i - LOOKBACK; j <= i + LOOKBACK; j++) {
      if (j !== i && candles[j].h > c.h) {
        isTop = false;
        break;
      }
    }
    
    // Check if lowest
    let isBot = true;
    for (let j = i - LOOKBACK; j <= i + LOOKBACK; j++) {
      if (j !== i && candles[j].l < c.l) {
        isBot = false;
        break;
      }
    }
    
    // State machine (like Pine Script)
    if (isTop && state !== 1) {
      if (state === 2) {
        // Reversal: bottom → top
        reversals.push({ idx: i, type: 'bottom_to_top', price: c.h, time: c.time });
      }
      state = 1;
    } else if (isBot && state !== 2) {
      if (state === 1) {
        // Reversal: top → bottom
        reversals.push({ idx: i, type: 'top_to_bottom', price: c.l, time: c.time });
      }
      state = 2;
    }
  }
  
  return reversals;
}

function generateTrades(reversals, candles) {
  const trades = [];
  
  for (let i = 0; i < reversals.length - 1; i++) {
    const entry = reversals[i];
    const exit = reversals[i + 1];
    
    if (entry.type === 'top_to_bottom') {
      // Short at bottom of reversal, exit at next top
      const pnl = ((entry.price - exit.price) / entry.price) * 100;
      trades.push({
        time: entry.time,
        type: 'short',
        entry: entry.price,
        exit: exit.price,
        pnl: pnl,
        win: pnl > 0
      });
    } else if (entry.type === 'bottom_to_top') {
      // Long at top of reversal, exit at next bottom
      const pnl = ((exit.price - entry.price) / entry.price) * 100;
      trades.push({
        time: entry.time,
        type: 'long',
        entry: entry.price,
        exit: exit.price,
        pnl: pnl,
        win: pnl > 0
      });
    }
  }
  
  return trades;
}

function getMetrics(trades) {
  if (!trades.length) return null;
  const wins = trades.filter(t => t.win).length;
  const losses = trades.length - wins;
  const wr = (wins / trades.length * 100).toFixed(1);
  const total = trades.reduce((s, t) => s + t.pnl, 0).toFixed(2);
  const avg = (total / trades.length).toFixed(4);
  const best = Math.max(...trades.map(t => t.pnl)).toFixed(4);
  const worst = Math.min(...trades.map(t => t.pnl)).toFixed(4);
  
  return { trades: trades.length, wins, losses, wr, total, avg, best, worst };
}

(async () => {
  console.log('🎯 SWING REVERSAL BACKTEST - 1 YEAR\n');
  console.log('Strategy: Trade reversals (bottom→top = LONG, top→bottom = SHORT)');
  console.log('Lookback: 5 bars');
  console.log('Coins: BTC, ETH, BNB | Timeframes: 15m, 1h, 4h\n');
  console.log('='.repeat(80) + '\n');
  
  let allTrades = [];
  
  for (const sym of SYMBOLS) {
    console.log(`📈 ${sym}`);
    for (const tf of TFS) {
      process.stdout.write(`  ${tf}... `);
      const c = await fetchCandles(sym, tf);
      if (c.length < 200) { console.log('❌'); continue; }
      
      const reversals = detectReversals(c);
      const trades = generateTrades(reversals, c);
      
      for (const t of trades) {
        t.symbol = sym;
        t.tf = tf;
      }
      
      allTrades.push(...trades);
      console.log(`✅ ${reversals.length} reversals → ${trades.length} trades`);
    }
  }
  
  console.log(`\nTotal Trades: ${allTrades.length}\n`);
  if (allTrades.length === 0) {
    console.log('❌ No trades');
    process.exit(0);
  }
  
  allTrades.sort((a, b) => a.time - b.time);
  
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  
  const today = allTrades.filter(t => t.time > new Date(now - oneDay));
  const week = allTrades.filter(t => t.time > new Date(now - 7 * oneDay));
  const month = allTrades.filter(t => t.time > new Date(now - 30 * oneDay));
  const six = allTrades.filter(t => t.time > new Date(now - 180 * oneDay));
  const year = allTrades;
  
  console.log('='.repeat(80));
  console.log('📊 PERFORMANCE BREAKDOWN\n');
  
  const periods = [
    { data: today, label: 'TODAY (24h)', show: today.length > 0 },
    { data: week, label: '1 WEEK' },
    { data: month, label: '30 DAYS' },
    { data: six, label: '6 MONTHS' },
    { data: year, label: '1 YEAR (FULL)' },
  ];
  
  for (const p of periods) {
    if (!p.show && p.data.length === 0) continue;
    const m = getMetrics(p.data);
    if (!m) continue;
    
    console.log(`${p.label}:`);
    console.log(`  📊 Trades: ${m.trades} | Wins: ${m.wins} (${m.wr}%) | Losses: ${m.losses}`);
    console.log(`  💰 Total PnL: ${m.total}% | Avg/Trade: ${m.avg}%`);
    console.log(`  📈 Best: +${m.best}% | Worst: ${m.worst}%`);
    
    const monthlyEq = (parseFloat(m.total) / 365) * 30;
    const dailyEq = parseFloat(m.total) / 365;
    console.log(`  📅 Daily Avg: ${dailyEq.toFixed(3)}% | Monthly Equiv: ${monthlyEq.toFixed(1)}%`);
    console.log();
  }
  
  const yearM = getMetrics(year);
  
  console.log('='.repeat(80));
  console.log('\n✅ 1-YEAR ANNUAL RESULTS:\n');
  console.log(`Total Trades: ${yearM.trades}`);
  console.log(`Wins: ${yearM.wins} | Losses: ${yearM.losses}`);
  console.log(`Win Rate: ${yearM.wr}%`);
  console.log(`Total Annual PnL: ${yearM.total}%`);
  console.log(`Avg PnL/Trade: ${yearM.avg}%`);
  console.log(`Best Trade: +${yearM.best}%`);
  console.log(`Worst Trade: ${yearM.worst}%`);
  console.log(`\nDaily Average: ${(parseFloat(yearM.total) / 365).toFixed(3)}%`);
  console.log(`Monthly Average: ${(parseFloat(yearM.total) / 12).toFixed(1)}%`);
  console.log(`Trades per Day: ${(yearM.trades / 365).toFixed(2)}`);
  
  const annual = parseFloat(yearM.total);
  if (annual >= 25) {
    console.log(`\n✅ EXCELLENT! +25% monthly target is achievable!\n`);
  } else if (annual >= 15) {
    console.log(`\n✅ GREAT! +15-20% annual is solid performance!\n`);
  } else if (annual >= 5) {
    console.log(`\n⚠️ Modest but positive results. Consider optimizing entry filters.\n`);
  } else {
    console.log(`\n❌ Results below +5%. Strategy needs refinement.\n`);
  }
  
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
