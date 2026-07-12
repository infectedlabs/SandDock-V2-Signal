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
  let stats = { tops: 0, bots: 0, pnl: 0, wins: 0, trades: 0, trades_list: [] };
  let lastHigh = null, lastLow = null;
  
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
      stats.trades_list.push({ type: 'long', pnl, win: pnl > 0 });
      lastHigh = c.h;
    }
    
    if (isBot && lastHigh !== null) {
      const pnl = ((lastHigh - c.l) / lastHigh) * 100;
      stats.pnl += pnl;
      if (pnl > 0) stats.wins++;
      stats.trades++;
      stats.trades_list.push({ type: 'short', pnl, win: pnl > 0 });
      lastLow = c.l;
    }
    
    if (isTop && lastLow === null) lastHigh = c.h;
    if (isBot && lastHigh === null) lastLow = c.l;
  }
  
  return stats;
}

(async () => {
  console.log('🎯 SWING SIGNAL BACKTEST - 30m TIMEFRAME\n');
  console.log('='.repeat(80) + '\n');
  
  const coins = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
  const tf = '30m';
  
  let totalPnL = 0, totalTrades = 0, totalWins = 0;
  const results = [];
  
  console.log('30m TIMEFRAME ANALYSIS:\n');
  
  for (const coin of coins) {
    process.stdout.write(`${coin.padEnd(10)} ... `);
    const c = await fetchCandles(coin, tf);
    
    if (c.length < 100) { 
      console.log('❌ Not enough data');
      continue; 
    }
    
    const stats = analyzeSwings(c, 5);
    
    if (stats.trades === 0) {
      console.log('❌ No trades');
      continue;
    }
    
    totalPnL += stats.pnl;
    totalTrades += stats.trades;
    totalWins += stats.wins;
    
    const wr = (stats.wins / stats.trades * 100).toFixed(1);
    const avg = (stats.pnl / stats.trades).toFixed(4);
    
    console.log(`✅`);
    console.log(`  Trades: ${stats.trades.toString().padEnd(4)} | Wins: ${stats.wins.toString().padEnd(4)} | WR: ${wr.padEnd(5)}% | PnL: ${stats.pnl.toFixed(2).padEnd(8)}% | Avg: ${avg}%`);
    
    results.push({
      coin,
      trades: stats.trades,
      wins: stats.wins,
      wr: parseFloat(wr),
      pnl: stats.pnl,
      avg: parseFloat(avg)
    });
    
    console.log();
  }
  
  console.log('='.repeat(80));
  console.log('\n📊 30m TIMEFRAME SUMMARY:\n');
  
  console.log('Individual Coins:');
  results.forEach(r => {
    console.log(`  ${r.coin.padEnd(10)}: ${r.trades} trades | WR ${r.wr}% | +${r.pnl.toFixed(2)}% | Avg: ${r.avg.toFixed(4)}%/trade`);
  });
  
  console.log(`\nCombined Results:`);
  console.log(`  Total Trades: ${totalTrades}`);
  console.log(`  Total Wins: ${totalWins} | Losses: ${totalTrades - totalWins}`);
  console.log(`  Win Rate: ${totalTrades > 0 ? (totalWins/totalTrades*100).toFixed(1) : 0}%`);
  console.log(`  Total PnL: ${totalPnL.toFixed(2)}%`);
  console.log(`  Avg/Trade: ${totalTrades > 0 ? (totalPnL/totalTrades).toFixed(4) : 0}%`);
  
  const daysOfData = (1000 * 30) / (24 * 60); // 1000 candles × 30 min per candle
  console.log(`\nData Period: ~${daysOfData.toFixed(0)} days`);
  
  if (daysOfData > 0) {
    const dailyAvg = totalPnL / daysOfData;
    const monthlyEquiv = dailyAvg * 21; // 21 trading days
    const annualEquiv = monthlyEquiv * 12;
    
    console.log(`  Daily Average: ${dailyAvg.toFixed(3)}%`);
    console.log(`  Monthly (21 days): ${monthlyEquiv.toFixed(1)}%`);
    console.log(`  Annual (if pattern holds): ${annualEquiv.toFixed(1)}%`);
  }
  
  console.log();
  
  if (totalPnL >= 50) {
    console.log('✅ EXCELLENT! 30m timeframe is highly profitable!\n');
  } else if (totalPnL >= 20) {
    console.log('✅ VERY GOOD! 30m timeframe performs well!\n');
  } else if (totalPnL >= 0) {
    console.log('✅ POSITIVE! 30m timeframe is profitable.\n');
  } else {
    console.log('⚠️ Negative results on 30m.\n');
  }
  
  process.exit(0);
})().catch(e => console.error(e) || process.exit(1));
