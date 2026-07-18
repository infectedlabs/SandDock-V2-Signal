const axios = require('axios');

const API = 'https://api.binance.com/api/v3';
const SYMBOL = 'BTCUSDT';
const LOOKBACK = 5;

async function fetchCandles(symbol, tf, limit = 1000) {
  let all = [], endTime = Date.now();
  console.log(`    Fetching ${symbol} ${tf} (1 year of data)...`);

  for (let i = 0; i < 200; i++) {
    try {
      const r = await axios.get(`${API}/klines`, {
        params: { symbol, interval: tf, endTime, limit }
      });
      if (!r.data?.length) break;
      all.unshift(...r.data.map(k => ({ h: +k[2], l: +k[3], c: +k[4], time: new Date(+k[0]) })));
      endTime = +r.data[0][0] - 1;
      if (r.data.length < 1000) break;
      process.stdout.write('.');
    } catch(e) {
      console.error(`Error fetching: ${e.message}`);
      break;
    }
  }
  console.log(` ✓ ${all.length} candles loaded\n`);
  return all.sort((a, b) => a.time - b.time);
}

function analyzeSwings(candles, lookback = 5) {
  let stats = {
    tops: 0,
    bots: 0,
    pnl: 0,
    wins: 0,
    losses: 0,
    trades: 0,
    winSum: 0,
    lossSum: 0,
    bestTrade: -Infinity,
    worstTrade: Infinity,
    trades_list: []
  };
  let lastHigh = null, lastLow = null;

  for (let i = lookback; i < candles.length - lookback; i++) {
    const c = candles[i];

    // Check if this bar is a swing high (highest of lookback bars before and after)
    let isTop = true, isBot = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i) {
        if (candles[j].h > c.h) isTop = false;
        if (candles[j].l < c.l) isBot = false;
      }
    }

    // Track confirmed reversals: top after bottom, bottom after top
    if (isTop && lastLow !== null) {
      const pnl = ((c.h - lastLow) / lastLow) * 100;
      stats.pnl += pnl;
      if (pnl > 0) {
        stats.wins++;
        stats.winSum += pnl;
      } else {
        stats.losses++;
        stats.lossSum += pnl;
      }
      stats.trades++;
      stats.bestTrade = Math.max(stats.bestTrade, pnl);
      stats.worstTrade = Math.min(stats.worstTrade, pnl);
      stats.trades_list.push({ type: 'LONG', pnl, time: c.time });
      lastHigh = c.h;
    }

    if (isBot && lastHigh !== null) {
      const pnl = ((lastHigh - c.l) / lastHigh) * 100;
      stats.pnl += pnl;
      if (pnl > 0) {
        stats.wins++;
        stats.winSum += pnl;
      } else {
        stats.losses++;
        stats.lossSum += pnl;
      }
      stats.trades++;
      stats.bestTrade = Math.max(stats.bestTrade, pnl);
      stats.worstTrade = Math.min(stats.worstTrade, pnl);
      stats.trades_list.push({ type: 'SHORT', pnl, time: c.time });
      lastLow = c.l;
    }

    // Initialize on first signals
    if (isTop && lastLow === null) lastHigh = c.h;
    if (isBot && lastHigh === null) lastLow = c.l;
  }

  return stats;
}

function formatTimeframe(tf) {
  const map = { '5m': '5-MIN', '15m': '15-MIN', '30m': '30-MIN' };
  return map[tf] || tf;
}

(async () => {
  console.log('\n' + '='.repeat(100));
  console.log('🎯 BTC 1-YEAR BACKTEST - MULTI-TIMEFRAME COMPARISON (Lookback=5)');
  console.log('='.repeat(100) + '\n');

  const timeframes = ['5m', '15m', '30m'];
  const results = [];

  // Fetch and analyze each timeframe
  for (const tf of timeframes) {
    console.log(`📊 Testing ${formatTimeframe(tf)} Timeframe:`);
    const candles = await fetchCandles(SYMBOL, tf);

    if (candles.length < 50) {
      console.log(`❌ Insufficient data (only ${candles.length} candles)\n`);
      continue;
    }

    const stats = analyzeSwings(candles, LOOKBACK);

    if (stats.trades === 0) {
      console.log(`❌ No valid swing trades detected\n`);
      continue;
    }

    const wr = (stats.wins / stats.trades * 100);
    const avg = (stats.pnl / stats.trades);
    const pf = stats.winSum !== 0 && stats.lossSum !== 0
      ? (stats.winSum / Math.abs(stats.lossSum)).toFixed(2)
      : (stats.winSum !== 0 ? 'Inf' : 'N/A');

    // Calculate time period
    const timeSpanMs = candles[candles.length - 1].time - candles[0].time;
    const daysOfData = timeSpanMs / (1000 * 60 * 60 * 24);

    const result = {
      tf,
      candles: candles.length,
      daysOfData: daysOfData,
      trades: stats.trades,
      wins: stats.wins,
      losses: stats.losses,
      wr: wr,
      pnl: stats.pnl,
      avg: avg,
      best: stats.bestTrade,
      worst: stats.worstTrade,
      pf: pf,
      tradesPerDay: (stats.trades / daysOfData).toFixed(2)
    };

    results.push(result);

    console.log(`  📈 Data Period: ${daysOfData.toFixed(1)} days (${candles.length} candles)`);
    console.log(`  ✅ Total Trades: ${stats.trades}`);
    console.log(`     • Wins: ${stats.wins} | Losses: ${stats.losses}`);
    console.log(`     • Win Rate: ${wr.toFixed(2)}%`);
    console.log(`     • Trades/Day: ${result.tradesPerDay}`);
    console.log(`  📊 P&L Metrics:`);
    console.log(`     • Total PnL: +${stats.pnl.toFixed(2)}%`);
    console.log(`     • Avg/Trade: ${avg > 0 ? '+' : ''}${avg.toFixed(4)}%`);
    console.log(`     • Best Trade: +${stats.bestTrade.toFixed(3)}%`);
    console.log(`     • Worst Trade: ${stats.worstTrade.toFixed(3)}%`);
    console.log(`     • Profit Factor: ${pf}`);
    console.log(`     • Monthly Avg: ${(stats.pnl / 12).toFixed(2)}% (if annual pattern holds)`);
    console.log();
  }

  // Comparison Summary
  console.log('='.repeat(100));
  console.log('\n📊 COMPARISON SUMMARY:\n');

  if (results.length === 0) {
    console.log('❌ No valid results to compare\n');
    process.exit(1);
  }

  // Sort by win rate for comparison
  const sortedByWR = [...results].sort((a, b) => b.wr - a.wr);
  const sortedByPnL = [...results].sort((a, b) => b.pnl - a.pnl);

  console.log('RANKED BY WIN RATE:\n');
  sortedByWR.forEach((r, i) => {
    console.log(`${i + 1}. ${formatTimeframe(r.tf).padEnd(10)} | WR: ${r.wr.toFixed(2)}% | Trades: ${r.trades.toString().padEnd(4)} | PnL: ${r.pnl > 0 ? '+' : ''}${r.pnl.toFixed(2)}% | Avg: ${r.avg > 0 ? '+' : ''}${r.avg.toFixed(4)}%`);
  });

  console.log('\nRANKED BY TOTAL P&L:\n');
  sortedByPnL.forEach((r, i) => {
    console.log(`${i + 1}. ${formatTimeframe(r.tf).padEnd(10)} | PnL: ${r.pnl > 0 ? '+' : ''}${r.pnl.toFixed(2)}% | WR: ${r.wr.toFixed(2)}% | Trades: ${r.trades.toString().padEnd(4)} | Avg: ${r.avg > 0 ? '+' : ''}${r.avg.toFixed(4)}%`);
  });

  console.log('\nTRADES PER DAY (Scalping Frequency):\n');
  [...results].sort((a, b) => parseFloat(b.tradesPerDay) - parseFloat(a.tradesPerDay)).forEach((r, i) => {
    console.log(`${i + 1}. ${formatTimeframe(r.tf).padEnd(10)} | Trades/Day: ${r.tradesPerDay} | Total Trades: ${r.trades}`);
  });

  console.log('\n' + '='.repeat(100));
  console.log('\n🏆 KEY FINDINGS:\n');

  const best30m = results.find(r => r.tf === '30m');
  const best5m = results.find(r => r.tf === '5m');
  const best15m = results.find(r => r.tf === '15m');

  if (best30m) {
    console.log(`30m (CURRENT):`);
    console.log(`  • Win Rate: ${best30m.wr.toFixed(2)}%`);
    console.log(`  • Total PnL: ${best30m.pnl > 0 ? '+' : ''}${best30m.pnl.toFixed(2)}%`);
    console.log(`  • Trades: ${best30m.trades} (${best30m.tradesPerDay} per day)`);
    console.log();
  }

  if (best5m) {
    console.log(`5m (FASTER):`);
    const wr_diff = best5m.wr - (best30m?.wr || 0);
    const pnl_diff = best5m.pnl - (best30m?.pnl || 0);
    console.log(`  • Win Rate: ${best5m.wr.toFixed(2)}% (${wr_diff > 0 ? '+' : ''}${wr_diff.toFixed(2)}% vs 30m)`);
    console.log(`  • Total PnL: ${best5m.pnl > 0 ? '+' : ''}${best5m.pnl.toFixed(2)}% (${pnl_diff > 0 ? '+' : ''}${pnl_diff.toFixed(2)}% vs 30m)`);
    console.log(`  • Trades: ${best5m.trades} (${best5m.tradesPerDay} per day) - ${((best5m.trades / (best30m?.trades || 1)) * 100).toFixed(0)}% more trades than 30m`);
    console.log(`  • Verdict: ${best5m.wr < best30m?.wr ? '⚠️ Lower accuracy' : '✅ Better accuracy'} | ${best5m.pnl > best30m?.pnl ? '✅ Higher profits' : '❌ Lower profits'}`);
    console.log();
  }

  if (best15m) {
    console.log(`15m (MIDDLE GROUND):`);
    const wr_diff = best15m.wr - (best30m?.wr || 0);
    const pnl_diff = best15m.pnl - (best30m?.pnl || 0);
    console.log(`  • Win Rate: ${best15m.wr.toFixed(2)}% (${wr_diff > 0 ? '+' : ''}${wr_diff.toFixed(2)}% vs 30m)`);
    console.log(`  • Total PnL: ${best15m.pnl > 0 ? '+' : ''}${best15m.pnl.toFixed(2)}% (${pnl_diff > 0 ? '+' : ''}${pnl_diff.toFixed(2)}% vs 30m)`);
    console.log(`  • Trades: ${best15m.trades} (${best15m.tradesPerDay} per day) - ${((best15m.trades / (best30m?.trades || 1)) * 100).toFixed(0)}% more trades than 30m`);
    console.log(`  • Verdict: ${best15m.wr < best30m?.wr ? '⚠️ Lower accuracy' : '✅ Better accuracy'} | ${best15m.pnl > best30m?.pnl ? '✅ Higher profits' : '❌ Lower profits'}`);
    console.log();
  }

  console.log('='.repeat(100));
  console.log('\n💡 RECOMMENDATION:\n');

  const worstWR = Math.min(...results.map(r => r.wr));
  if (worstWR < 60) {
    console.log('⚠️  All timeframes show win rates below 60%.');
    console.log('    Consider: Reduce lookback further, add volume filters, or adjust entry logic.\n');
  }

  const leader = sortedByPnL[0];
  if (leader.tf !== '30m') {
    console.log(`✅ ${formatTimeframe(leader.tf)} outperforms 30m!`);
    console.log(`   Switch from 30m to ${formatTimeframe(leader.tf)} for ${((leader.pnl / (best30m?.pnl || 1)) * 100 - 100).toFixed(0)}% better returns.\n`);
  } else {
    console.log(`✅ 30m remains the best performer.`);
    console.log(`   Faster timeframes trade accuracy for higher trade frequency but lower profits.\n`);
  }

  console.log('='.repeat(100) + '\n');

  process.exit(0);
})().catch(e => {
  console.error('\n❌ Error:', e.message);
  console.error(e.stack);
  process.exit(1);
});
