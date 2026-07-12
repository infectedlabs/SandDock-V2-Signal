const axios = require('axios');

const API = 'https://api.binance.com/api/v3';

async function fetchCandles(symbol, tf, limit = 1000) {
  try {
    const r = await axios.get(`${API}/klines`, {
      params: { symbol, interval: tf, limit }
    });
    return r.data ? r.data.map(k => ({ h: +k[2], l: +k[3], time: new Date(+k[0]) })) : [];
  } catch (e) { return []; }
}

function analyzeSwings(candles, lb = 5) {
  let stats = { tops: 0, bots: 0, pnl: 0, wins: 0, trades: 0 };
  let lastHigh = null, lastLow = null;
  let inUptrend = false;
  
  for (let i = lb; i < candles.length - lb; i++) {
    const c = candles[i];
    
    // Check swing
    let isTop = true, isBot = true;
    for (let j = i - lb; j <= i + lb; j++) {
      if (j !== i) {
        if (candles[j].h > c.h) isTop = false;
        if (candles[j].l < c.l) isBot = false;
      }
    }
    
    // Track confirmed reversals only
    if (isTop && lastLow !== null) {
      const pnl = ((c.h - lastLow) / lastLow) * 100;
      stats.pnl += pnl;
      if (pnl > 0) stats.wins++;
      stats.trades++;
      lastHigh = c.h;
      inUptrend = true;
    }
    
    if (isBot && lastHigh !== null) {
      const pnl = ((lastHigh - c.l) / lastHigh) * 100;
      stats.pnl += pnl;
      if (pnl > 0) stats.wins++;
      stats.trades++;
      lastLow = c.l;
      inUptrend = false;
    }
    
    if (isTop && lastLow === null) lastHigh = c.h;
    if (isBot && lastHigh === null) lastLow = c.l;
  }
  
  return stats;
}

(async () => {
  console.log('🎯 SWING SIGNAL BACKTEST - 1 YEAR (SIMPLIFIED)\n');
  console.log('='.repeat(80) + '\n');
  
  const coins = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
  const tfs = ['15m', '1h', '4h'];
  
  let totalPnL = 0, totalTrades = 0, totalWins = 0;
  
  console.log('RECENT PERFORMANCE (Last 1000 candles per timeframe):\n');
  
  for (const coin of coins) {
    console.log(`📈 ${coin}:`);
    let coinPnL = 0, coinTrades = 0, coinWins = 0;
    
    for (const tf of tfs) {
      process.stdout.write(`  ${tf.padEnd(4)}`);
      const c = await fetchCandles(coin, tf);
      if (c.length < 100) { console.log(' ❌'); continue; }
      
      const stats = analyzeSwings(c, 5);
      coinPnL += stats.pnl;
      coinTrades += stats.trades;
      coinWins += stats.wins;
      
      const wr = stats.trades > 0 ? (stats.wins / stats.trades * 100).toFixed(1) : '0';
      console.log(` → Trades: ${stats.trades} | WR: ${wr}% | PnL: ${stats.pnl.toFixed(2)}%`);
    }
    
    console.log(`  💰 ${coin} Total: ${coinPnL.toFixed(2)}% from ${coinTrades} trades\n`);
    totalPnL += coinPnL;
    totalTrades += coinTrades;
    totalWins += coinWins;
  }
  
  console.log('='.repeat(80));
  console.log('\n✅ SUMMARY (Last 1000 candles = ~30 days per timeframe):\n');
  console.log(`Total Trades: ${totalTrades}`);
  console.log(`Total Wins: ${totalWins}`);
  console.log(`Win Rate: ${totalTrades > 0 ? (totalWins/totalTrades*100).toFixed(1) : 0}%`);
  console.log(`Total PnL: ${totalPnL.toFixed(2)}%`);
  console.log(`Avg/Trade: ${totalTrades > 0 ? (totalPnL/totalTrades).toFixed(4) : 0}%`);
  console.log(`\nAnnualized (if pattern holds): ${(totalPnL * 12).toFixed(1)}%`);
  console.log(`Monthly Average: ${(totalPnL).toFixed(2)}%`);
  
  if (totalPnL >= 20) {
    console.log(`\n✅ STRONG! This strategy is working well!\n`);
  }
  
  process.exit(0);
})().catch(e => console.error(e) || process.exit(1));
