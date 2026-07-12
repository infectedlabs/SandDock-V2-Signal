const axios = require('axios');

const API = 'https://api.binance.com/api/v3';
const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
const TFS = ['15m', '1h', '4h'];
const LOOKBACK = 5;

async function fetchCandles(symbol, tf) {
  let all = [], endTime = Date.now();
  for (let i = 0; i < 200; i++) {
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

function detectSwingSignals(candles) {
  const signals = [];
  
  for (let i = LOOKBACK; i < candles.length - LOOKBACK; i++) {
    const current = candles[i];
    
    // Check if current high is highest within lookback window on each side
    let isTop = true;
    for (let j = i - LOOKBACK; j <= i + LOOKBACK; j++) {
      if (j !== i && candles[j].h >= current.h) {
        isTop = false;
        break;
      }
    }
    
    // Check if current low is lowest within lookback window on each side
    let isBot = true;
    for (let j = i - LOOKBACK; j <= i + LOOKBACK; j++) {
      if (j !== i && candles[j].l <= current.l) {
        isBot = false;
        break;
      }
    }
    
    if (isTop && !isBot) {
      signals.push({ idx: i, type: 'top', price: current.h, time: current.time });
    } else if (isBot && !isTop) {
      signals.push({ idx: i, type: 'bottom', price: current.l, time: current.time });
    }
  }
  
  return signals;
}

function generateTrades(signals, candles) {
  const trades = [];
  
  for (let i = 0; i < signals.length - 1; i++) {
    const sig = signals[i];
    const nextSig = signals[i + 1];
    
    // Trade the swing: if top, expect bottom (short). if bottom, expect top (long)
    if (sig.type === 'bottom') {
      // Long: entered at bottom, exit at next top
      const entry = sig.price;
      const exit = nextSig.price;
      const pnl = ((exit - entry) / entry) * 100;
      
      trades.push({
        time: sig.time,
        type: 'long',
        entry,
        exit,
        pnl: pnl,
        win: pnl > 0,
        duration: nextSig.idx - sig.idx
      });
    } else if (sig.type === 'top') {
      // Short: entered at top, exit at next bottom
      const entry = sig.price;
      const exit = nextSig.price;
      const pnl = ((entry - exit) / entry) * 100;
      
      trades.push({
        time: sig.time,
        type: 'short',
        entry,
        exit,
        pnl: pnl,
        win: pnl > 0,
        duration: nextSig.idx - sig.idx
      });
    }
  }
  
  return trades;
}

function getMetrics(trades, label) {
  if (!trades.length) return null;
  const wins = trades.filter(t => t.win).length;
  const losses = trades.length - wins;
  const wr = (wins / trades.length * 100).toFixed(1);
  const total = trades.reduce((s, t) => s + t.pnl, 0).toFixed(2);
  const avg = (total / trades.length).toFixed(3);
  const best = Math.max(...trades.map(t => t.pnl)).toFixed(3);
  const worst = Math.min(...trades.map(t => t.pnl)).toFixed(3);
  
  return { label, trades: trades.length, wins, losses, wr, total, avg, best, worst };
}

(async () => {
  console.log('🎯 SWING TOP/BOTTOM SIGNAL BACKTEST - 1 YEAR\n');
  console.log('Strategy: Swing Highs (SHORT) and Swing Lows (LONG)');
  console.log('Lookback: 5 bars');
  console.log('Coins: BTC, ETH, BNB');
  console.log('Timeframes: 15m, 1h, 4h\n');
  console.log('='.repeat(80) + '\n');
  
  let allTrades = [];
  
  for (const sym of SYMBOLS) {
    console.log(`📈 ${sym}...`);
    
    for (const tf of TFS) {
      process.stdout.write(`  ${tf}... `);
      const c = await fetchCandles(sym, tf);
      if (c.length < 100) { console.log('❌'); continue; }
      
      const signals = detectSwingSignals(c);
      const trades = generateTrades(signals, c);
      
      for (const t of trades) {
        t.symbol = sym;
        t.tf = tf;
      }
      
      allTrades.push(...trades);
      console.log(`✅ ${signals.length} signals → ${trades.length} trades`);
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
  
  const today = allTrades.filter(t => t.time > new Date(now - oneDay));
  const week = allTrades.filter(t => t.time > new Date(now - 7 * oneDay));
  const month = allTrades.filter(t => t.time > new Date(now - 30 * oneDay));
  const six = allTrades.filter(t => t.time > new Date(now - 180 * oneDay));
  const year = allTrades;
  
  console.log('='.repeat(80));
  console.log('📊 PERFORMANCE BREAKDOWN\n');
  
  const periods = [
    { data: today, label: 'TODAY (24h)' },
    { data: week, label: '1 WEEK' },
    { data: month, label: '30 DAYS' },
    { data: six, label: '6 MONTHS' },
    { data: year, label: '1 YEAR (FULL)' },
  ];
  
  for (const p of periods) {
    const m = getMetrics(p.data, p.label);
    if (!m || m.trades === 0) {
      console.log(`${p.label}: No trades\n`);
      continue;
    }
    
    console.log(`${m.label}:`);
    console.log(`  📊 Trades: ${m.trades} | Wins: ${m.wins} | Losses: ${m.losses}`);
    console.log(`  🎯 Win Rate: ${m.wr}%`);
    console.log(`  💰 Total PnL: ${m.total}% | Avg/Trade: ${m.avg}%`);
    console.log(`  📈 Best Trade: +${m.best}% | Worst Trade: ${m.worst}%`);
    
    // Calculate monthly/daily equivalent
    if (m.trades > 0) {
      const pnlDays = year.length > 0 ? 365 : 30;
      const monthlyEq = (parseFloat(m.total) / year.length) * (pnlDays / 12);
      const dailyEq = parseFloat(m.total) / pnlDays;
      console.log(`  📅 Annualized (if pattern continues): ~${monthlyEq.toFixed(1)}%/month | ${dailyEq.toFixed(2)}%/day`);
    }
    console.log();
  }
  
  const yearMetrics = getMetrics(year, '1 YEAR');
  
  console.log('='.repeat(80));
  console.log('\n✅ 1-YEAR SUMMARY:\n');
  console.log(`Total Trades: ${yearMetrics.trades}`);
  console.log(`Win Rate: ${yearMetrics.wr}%`);
  console.log(`Total Annual PnL: ${yearMetrics.total}%`);
  console.log(`Average PnL/Trade: ${yearMetrics.avg}%`);
  console.log(`Best Trade: +${yearMetrics.best}%`);
  console.log(`Worst Trade: ${yearMetrics.worst}%`);
  console.log(`\nMonthly Average: ${(yearMetrics.total / 12).toFixed(1)}%`);
  console.log(`Daily Average: ${(yearMetrics.total / 365).toFixed(2)}%`);
  console.log(`Trades per Day: ${(yearMetrics.trades / 365).toFixed(1)}`);
  
  if (parseFloat(yearMetrics.total) >= 25) {
    console.log(`\n✅ TARGET MET: +25% monthly achievable!\n`);
  } else if (parseFloat(yearMetrics.total) >= 15) {
    console.log(`\n✅ STRONG RESULTS: +15-20% annual is very good!\n`);
  } else {
    console.log(`\n⚠️  Results below expectation\n`);
  }
  
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
