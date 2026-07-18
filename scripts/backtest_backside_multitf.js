const axios = require('axios');

const API = 'https://api.binance.com/api/v3';
const SYMBOL = 'BTCUSDT';
const LOOKBACK = 5;

async function fetchCandles(symbol, tf) {
  let all = [], endTime = Date.now();
  console.log(`    Fetching ${symbol} ${tf}...`);

  for (let i = 0; i < 200; i++) {
    try {
      const r = await axios.get(`${API}/klines`, {
        params: { symbol, interval: tf, endTime, limit: 1000 }
      });
      if (!r.data?.length) break;
      all.unshift(...r.data.map(k => ({ h: +k[2], l: +k[3], c: +k[4], time: new Date(+k[0]) })));
      endTime = +r.data[0][0] - 1;
      if (r.data.length < 1000) break;
      process.stdout.write('.');
    } catch(e) {
      break;
    }
  }
  console.log(` ✓ ${all.length} candles`);
  return all.sort((a, b) => a.time - b.time);
}

// BACKSIDE ONLY: Only checks lookback bars BEFORE (INSTANT SIGNALS - NO FUTURE WAIT)
function analyzeSwings_BacksideOnly(candles, lookback = 5) {
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
    worstTrade: Infinity
  };
  let lastHigh = null, lastLow = null;

  for (let i = lookback; i < candles.length; i++) {
    const c = candles[i];

    // Check if highest/lowest of bars BEFORE ONLY (no future bars needed)
    let isTop = true, isBot = true;
    for (let j = i - lookback; j <= i; j++) {
      if (j !== i) {
        if (candles[j].h > c.h) isTop = false;
        if (candles[j].l < c.l) isBot = false;
      }
    }

    // Trade confirmed reversals
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
      lastLow = c.l;
    }

    if (isTop && lastLow === null) lastHigh = c.h;
    if (isBot && lastHigh === null) lastLow = c.l;
  }

  return stats;
}

function formatTF(tf) {
  const map = { '30m': '30-MIN', '1h': '1-HOUR', '4h': '4-HOUR' };
  return map[tf] || tf;
}

(async () => {
  console.log('\n' + '='.repeat(140));
  console.log('🎯 BTC 1-YEAR BACKTEST - BACKSIDE-ONLY LOOKBACK ACROSS TIMEFRAMES');
  console.log('='.repeat(140) + '\n');

  const timeframes = ['30m', '1h', '4h'];
  const results = [];

  for (const tf of timeframes) {
    console.log(`📊 Testing ${formatTF(tf)}:`);
    const candles = await fetchCandles(SYMBOL, tf);

    if (candles.length < 50) {
      console.log(`❌ Insufficient data\n`);
      continue;
    }

    const stats = analyzeSwings_BacksideOnly(candles, LOOKBACK);

    if (stats.trades === 0) {
      console.log(`❌ No trades\n`);
      continue;
    }

    const wr = (stats.wins / stats.trades * 100);
    const avg = (stats.pnl / stats.trades);
    const pf = stats.winSum !== 0 && stats.lossSum !== 0
      ? (stats.winSum / Math.abs(stats.lossSum)).toFixed(2)
      : (stats.winSum !== 0 ? 'Inf' : 'N/A');

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
      tradesPerDay: (stats.trades / daysOfData).toFixed(2),
      winSum: stats.winSum,
      lossSum: stats.lossSum
    };

    results.push(result);

    console.log(`  📈 Data: ${daysOfData.toFixed(1)} days | ${candles.length} candles`);
    console.log(`  ✅ Trades: ${stats.trades} (${(stats.trades / daysOfData).toFixed(2)}/day)`);
    console.log(`     • Wins: ${stats.wins} | Losses: ${stats.losses}`);
    console.log(`  📊 Win Rate: ${wr.toFixed(2)}%`);
    console.log(`  💰 P&L: +${stats.pnl.toFixed(2)}% total | +${avg.toFixed(4)}%/trade`);
    console.log(`  🎯 Best: +${stats.bestTrade.toFixed(3)}% | Worst: ${stats.worstTrade.toFixed(3)}%`);
    console.log(`  📈 Profit Factor: ${pf}`);
    console.log();
  }

  if (results.length === 0) {
    console.log('❌ No valid results\n');
    process.exit(1);
  }

  // Comparison Summary
  console.log('='.repeat(140));
  console.log('\n📊 DETAILED COMPARISON:\n');

  console.log(`{'Timeframe':<12} | {'Trades':<8} | {'Trades/Day':<12} | {'WR':<7} | {'Total PnL':<12} | {'Avg/Trade':<10} | {'Best':<10} | {'Worst':<8} | {'PF':<8}`);
  console.log('─'.repeat(140));

  results.forEach(r => {
    const tf_str = formatTF(r.tf).padEnd(12);
    const trades_str = r.trades.toString().padEnd(8);
    const tpd_str = r.tradesPerDay.padEnd(12);
    const wr_str = r.wr.toFixed(2).padEnd(7);
    const pnl_str = `+${r.pnl.toFixed(2)}%`.padEnd(12);
    const avg_str = `+${r.avg.toFixed(4)}%`.padEnd(10);
    const best_str = `+${r.best.toFixed(3)}%`.padEnd(10);
    const worst_str = `${r.worst.toFixed(3)}%`.padEnd(8);
    const pf_str = r.pf.toString().padEnd(8);

    console.log(`${tf_str} | ${trades_str} | ${tpd_str} | ${wr_str} | ${pnl_str} | ${avg_str} | ${best_str} | ${worst_str} | ${pf_str}`);
  });

  console.log('\n' + '='.repeat(140));
  console.log('\n📈 COMPARISON vs 30m (BASELINE):\n');

  const baseline = results.find(r => r.tf === '30m');
  if (baseline) {
    results.forEach(r => {
      if (r.tf === '30m') {
        console.log(`${formatTF(r.tf).padEnd(12)} (BASELINE)`);
      } else {
        const trades_diff = r.trades - baseline.trades;
        const trades_diff_pct = ((r.trades / baseline.trades) * 100 - 100).toFixed(1);
        const wr_diff = r.wr - baseline.wr;
        const pnl_diff = r.pnl - baseline.pnl;
        const pnl_diff_pct = ((r.pnl / baseline.pnl) * 100 - 100).toFixed(1);
        const avg_diff = r.avg - baseline.avg;
        const tpd_diff = r.tradesPerDay - baseline.tradesPerDay;

        console.log(`\n${formatTF(r.tf).padEnd(12)}`);
        console.log(`  Trades: ${r.trades} (${trades_diff > 0 ? '+' : ''}${trades_diff} | ${trades_diff_pct}% ${trades_diff > 0 ? '↑ MORE' : '↓ FEWER'})`);
        console.log(`  Win Rate: ${r.wr.toFixed(2)}% (${wr_diff > 0 ? '+' : ''}${wr_diff.toFixed(2)}%)`);
        console.log(`  Total PnL: ${r.pnl.toFixed(2)}% (${pnl_diff > 0 ? '+' : ''}${pnl_diff.toFixed(2)}% | ${pnl_diff_pct}%)`);
        console.log(`  Avg/Trade: ${r.avg.toFixed(4)}% (${avg_diff > 0 ? '+' : ''}${avg_diff.toFixed(4)}%)`);
        console.log(`  Trades/Day: ${r.tradesPerDay} (${tpd_diff > 0 ? '+' : ''}${tpd_diff.toFixed(2)})`);
      }
    });
  }

  console.log('\n' + '='.repeat(140));
  console.log('\n🎯 KEY FINDINGS:\n');

  const sorted_by_pnl = [...results].sort((a, b) => b.pnl - a.pnl);
  const sorted_by_wr = [...results].sort((a, b) => b.wr - a.wr);
  const sorted_by_trades = [...results].sort((a, b) => b.trades - a.trades);

  console.log(`Most Profitable:    ${formatTF(sorted_by_pnl[0].tf)} with +${sorted_by_pnl[0].pnl.toFixed(2)}%`);
  console.log(`Best Win Rate:      ${formatTF(sorted_by_wr[0].tf)} with ${sorted_by_wr[0].wr.toFixed(2)}%`);
  console.log(`Most Trades:        ${formatTF(sorted_by_trades[0].tf)} with ${sorted_by_trades[0].trades} trades`);
  console.log(`Fewest Trades:      ${formatTF(sorted_by_trades[sorted_by_trades.length - 1].tf)} with ${sorted_by_trades[sorted_by_trades.length - 1].trades} trades`);

  console.log('\n' + '='.repeat(140));
  console.log('\n💡 RECOMMENDATION:\n');

  // Analysis
  const trades_reduction_1h = baseline ? ((baseline.trades - results.find(r => r.tf === '1h').trades) / baseline.trades * 100).toFixed(1) : 0;
  const trades_reduction_4h = baseline ? ((baseline.trades - results.find(r => r.tf === '4h').trades) / baseline.trades * 100).toFixed(1) : 0;

  const result_1h = results.find(r => r.tf === '1h');
  const result_4h = results.find(r => r.tf === '4h');

  console.log(`30m Baseline:`);
  console.log(`  • ${baseline.trades} trades/year | ${baseline.tradesPerDay} trades/day`);
  console.log(`  • ${baseline.wr.toFixed(2)}% win rate | +${baseline.pnl.toFixed(2)}% total P&L\n`);

  if (result_1h) {
    console.log(`1h vs 30m:`);
    console.log(`  • ${trades_reduction_1h}% FEWER trades (${result_1h.trades} vs ${baseline.trades})`);
    console.log(`  • Win Rate: ${result_1h.wr.toFixed(2)}% (${(result_1h.wr - baseline.wr).toFixed(2)}%)`);
    console.log(`  • Total P&L: +${result_1h.pnl.toFixed(2)}% (${((result_1h.pnl / baseline.pnl) * 100 - 100).toFixed(1)}%)`);
    console.log(`  • Avg/Trade: +${result_1h.avg.toFixed(4)}% vs +${baseline.avg.toFixed(4)}%\n`);
  }

  if (result_4h) {
    console.log(`4h vs 30m:`);
    console.log(`  • ${trades_reduction_4h}% FEWER trades (${result_4h.trades} vs ${baseline.trades})`);
    console.log(`  • Win Rate: ${result_4h.wr.toFixed(2)}% (${(result_4h.wr - baseline.wr).toFixed(2)}%)`);
    console.log(`  • Total P&L: +${result_4h.pnl.toFixed(2)}% (${((result_4h.pnl / baseline.pnl) * 100 - 100).toFixed(1)}%)`);
    console.log(`  • Avg/Trade: +${result_4h.avg.toFixed(4)}% vs +${baseline.avg.toFixed(4)}%\n`);
  }

  // Smart recommendation
  console.log(`PICK YOUR TIMEFRAME:\n`);

  if (result_1h && result_1h.wr >= 99 && result_1h.pnl >= baseline.pnl * 0.8) {
    console.log(`✅ RECOMMENDATION: Use 1h instead of 30m`);
    console.log(`   • ${trades_reduction_1h}% fewer trades (less noise, easier to manage)`);
    console.log(`   • Same ${result_1h.wr.toFixed(2)}% win rate`);
    console.log(`   • Only ${((baseline.pnl - result_1h.pnl) / baseline.pnl * 100).toFixed(1)}% less profit (acceptable trade-off)\n`);
  } else if (result_4h && result_4h.wr >= 99 && result_4h.pnl >= baseline.pnl * 0.6) {
    console.log(`✅ RECOMMENDATION: Use 4h for less frequent but solid signals`);
    console.log(`   • ${trades_reduction_4h}% fewer trades (${result_4h.tradesPerDay}/day vs ${baseline.tradesPerDay}/day)`);
    console.log(`   • Still ${result_4h.wr.toFixed(2)}% win rate`);
    console.log(`   • Fewer false signals to manage\n`);
  } else {
    console.log(`✅ RECOMMENDATION: Stick with 30m`);
    console.log(`   • Best overall balance of frequency and profitability`);
    console.log(`   • Higher win rate and total P&L`);
    console.log(`   • Most signals/opportunities per day\n`);
  }

  console.log('='.repeat(140) + '\n');

  process.exit(0);
})().catch(e => {
  console.error('\n❌ Error:', e.message);
  process.exit(1);
});
