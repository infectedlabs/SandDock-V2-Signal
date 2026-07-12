const axios = require('axios');

const API = 'https://api.binance.com/api/v3';

async function fetchCandles(symbol, tf) {
  let all = [], endTime = Date.now();
  console.log(`    Fetching ${symbol} ${tf}...`);
  
  for (let i = 0; i < 200; i++) {
    try {
      const r = await axios.get(`${API}/klines`, {
        params: { symbol, interval: tf, endTime, limit: 1000 }
      });
      if (!r.data?.length) break;
      all.unshift(...r.data.map(k => ({ h: +k[2], l: +k[3], time: new Date(+k[0]) })));
      endTime = +r.data[0][0] - 1;
      if (r.data.length < 1000) break;
      process.stdout.write('.');
    } catch(e) { break; }
  }
  console.log(` ${all.length} candles loaded`);
  return all.sort((a, b) => a.time - b.time);
}

function analyzeSwings(candles, lb = 5) {
  let stats = { 
    tops: 0, bots: 0, pnl: 0, wins: 0, trades: 0, 
    winSum: 0, lossSum: 0, bestTrade: -Infinity, worstTrade: Infinity 
  };
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
    
    // Track confirmed reversals
    if (isTop && lastLow !== null) {
      const pnl = ((c.h - lastLow) / lastLow) * 100;
      stats.pnl += pnl;
      stats.winSum += pnl;
      if (pnl > 0) stats.wins++;
      stats.trades++;
      stats.bestTrade = Math.max(stats.bestTrade, pnl);
      stats.worstTrade = Math.min(stats.worstTrade, pnl);
      lastHigh = c.h;
    }
    
    if (isBot && lastHigh !== null) {
      const pnl = ((lastHigh - c.l) / lastHigh) * 100;
      stats.pnl += pnl;
      stats.winSum += pnl;
      if (pnl > 0) stats.wins++;
      stats.trades++;
      stats.bestTrade = Math.max(stats.bestTrade, pnl);
      stats.worstTrade = Math.min(stats.worstTrade, pnl);
      lastLow = c.l;
    }
    
    if (isTop && lastLow === null) lastHigh = c.h;
    if (isBot && lastHigh === null) lastLow = c.l;
  }
  
  stats.lossSum = stats.pnl - stats.winSum;
  return stats;
}

(async () => {
  console.log('🎯 BTC 1-YEAR BACKTEST - TIMEFRAME COMPARISON\n');
  console.log('='.repeat(80) + '\n');
  
  const symbol = 'BTCUSDT';
  const timeframes = ['30m', '1h', '4h'];
  const results = [];
  
  for (const tf of timeframes) {
    console.log(`\n📈 Fetching BTC ${tf.toUpperCase()}...`);
    const candles = await fetchCandles(symbol, tf);
    
    if (candles.length < 100) {
      console.log(`❌ Insufficient data\n`);
      continue;
    }
    
    const stats = analyzeSwings(candles, 5);
    
    if (stats.trades === 0) {
      console.log(`❌ No trades generated\n`);
      continue;
    }
    
    const wr = (stats.wins / stats.trades * 100).toFixed(2);
    const avg = (stats.pnl / stats.trades).toFixed(4);
    const pf = stats.winSum !== 0 ? Math.abs(stats.winSum / stats.lossSum).toFixed(2) : 'N/A';
    
    const result = {
      tf,
      candles: candles.length,
      trades: stats.trades,
      wins: stats.wins,
      losses: stats.trades - stats.wins,
      wr: parseFloat(wr),
      pnl: stats.pnl,
      avg: parseFloat(avg),
      best: stats.bestTrade,
      worst: stats.worstTrade,
      pf: pf
    };
    
    results.push(result);
    
    console.log(`✅ Complete!\n`);
    console.log(`  Candles: ${stats.trades} trades from ${candles.length} candles`);
    console.log(`  Wins/Losses: ${stats.wins}/${stats.trades - stats.wins}`);
    console.log(`  Win Rate: ${wr}%`);
    console.log(`  Total PnL: ${stats.pnl.toFixed(2)}%`);
    console.log(`  Avg/Trade: ${avg}%`);
    console.log(`  Best Trade: +${stats.bestTrade.toFixed(3)}%`);
    console.log(`  Worst Trade: ${stats.worstTrade.toFixed(3)}%`);
    console.log(`  Profit Factor: ${pf}`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 COMPARISON SUMMARY:\n');
  
  // Sort by PnL
  results.sort((a, b) => b.pnl - a.pnl);
  
  console.log('Ranked by Total PnL:\n');
  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.tf.toUpperCase().padEnd(4)} | Trades: ${r.trades.toString().padEnd(4)} | WR: ${r.wr.toFixed(1).padEnd(5)}% | PnL: ${r.pnl.toFixed(2).padEnd(8)}% | Avg: ${r.avg.toFixed(4).padEnd(8)}% | PF: ${r.pf}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('\n🏆 WINNER:\n');
  
  const winner = results[0];
  console.log(`Timeframe: ${winner.tf.toUpperCase()}`);
  console.log(`Total Trades: ${winner.trades}`);
  console.log(`Win Rate: ${winner.wr.toFixed(2)}%`);
  console.log(`Annual PnL: ${winner.pnl.toFixed(2)}%`);
  console.log(`Monthly Average: ${(winner.pnl / 12).toFixed(2)}%`);
  console.log(`Daily Average: ${(winner.pnl / 365).toFixed(3)}%`);
  console.log(`Avg Profit/Trade: ${winner.avg.toFixed(4)}%`);
  console.log(`Signals Per Day: ${(winner.trades / 365).toFixed(1)}`);
  
  if (winner.pnl >= 25) {
    console.log(`\n✅ MEETS +25% TARGET!\n`);
  } else if (winner.pnl >= 15) {
    console.log(`\n✅ SOLID PERFORMANCE (+15-25% range)\n`);
  } else {
    console.log(`\n⚠️ Below expectations\n`);
  }
  
  process.exit(0);
})().catch(e => console.error(e) || process.exit(1));
