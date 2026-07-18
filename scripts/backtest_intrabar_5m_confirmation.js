const axios = require('axios');

const API = 'https://api.binance.com/api/v3';
const SYMBOL = 'BTCUSDT';
const LOOKBACK = 5;

async function fetchCandles(symbol, tf, limit = 1000) {
  let all = [], endTime = Date.now();
  console.log(`    Fetching ${symbol} ${tf}...`);

  for (let i = 0; i < 200; i++) {
    try {
      const r = await axios.get(`${API}/klines`, {
        params: { symbol, interval: tf, endTime, limit }
      });
      if (!r.data?.length) break;
      all.unshift(...r.data.map(k => ({ h: +k[2], l: +k[3], c: +k[4], time: new Date(+k[0]), open_time: new Date(+k[0]).toISOString() })));
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

// BACKSIDE ONLY: Only checks lookback bars BEFORE
function analyzeSwings_Backside(candles, lookback = 5) {
  let stats = {
    pnl: 0, wins: 0, losses: 0, trades: 0,
    winSum: 0, lossSum: 0, bestTrade: -Infinity, worstTrade: Infinity
  };
  let lastHigh = null, lastLow = null;

  for (let i = lookback; i < candles.length; i++) {
    const c = candles[i];

    let isTop = true, isBot = true;
    for (let j = i - lookback; j <= i; j++) {
      if (j !== i) {
        if (candles[j].h > c.h) isTop = false;
        if (candles[j].l < c.l) isBot = false;
      }
    }

    if (isTop && lastLow !== null) {
      const pnl = ((c.h - lastLow) / lastLow) * 100;
      stats.pnl += pnl;
      if (pnl > 0) { stats.wins++; stats.winSum += pnl; }
      else { stats.losses++; stats.lossSum += pnl; }
      stats.trades++;
      stats.bestTrade = Math.max(stats.bestTrade, pnl);
      stats.worstTrade = Math.min(stats.worstTrade, pnl);
      lastHigh = c.h;
    }

    if (isBot && lastHigh !== null) {
      const pnl = ((lastHigh - c.l) / lastHigh) * 100;
      stats.pnl += pnl;
      if (pnl > 0) { stats.wins++; stats.winSum += pnl; }
      else { stats.losses++; stats.lossSum += pnl; }
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

// INTRABAR 5M CONFIRMATION: Detects swings on 5m data within 1h candles
// Returns signals with their detection time (when 5m swing formed, not 1h close)
function analyzeIntrabar5m(candles1h, candles5m, lookback = 5) {
  let stats = {
    pnl: 0, wins: 0, losses: 0, trades: 0,
    winSum: 0, lossSum: 0, bestTrade: -Infinity, worstTrade: Infinity,
    avgDetectionMinutes: 0, detectionTimes: []
  };
  let lastHigh = null, lastLow = null;
  let last1hBarIndex = -1;

  // Process 5m candles and detect swings as they form
  for (let i = lookback; i < candles5m.length; i++) {
    const c5m = candles5m[i];

    // Find which 1h bar this 5m candle belongs to
    const current1hIndex = Math.floor(i / 12); // 12 x 5m candles = 1h

    // Skip if we haven't moved to a new 1h bar (intrabar detection)
    if (current1hIndex === last1hBarIndex && i < candles5m.length - 1) {
      continue;
    }

    // Check if current 5m candle is a swing high (highest of past bars only)
    let isTop = true, isBot = true;
    for (let j = i - lookback; j <= i; j++) {
      if (j !== i) {
        if (candles5m[j].h > c5m.h) isTop = false;
        if (candles5m[j].l < c5m.l) isBot = false;
      }
    }

    // Calculate minutes until 1h close
    let minutesUntilClose = 0;
    if (i < candles5m.length - 1) {
      const nextCandle = candles5m[i + 1];
      const currentHourEnd = new Date(c5m.time);
      currentHourEnd.setHours(currentHourEnd.getHours() + 1);
      minutesUntilClose = Math.max(0, (currentHourEnd - c5m.time) / (1000 * 60));
    }

    // Generate signals on 5m swing detection
    if (isTop && lastLow !== null) {
      const pnl = ((c5m.h - lastLow) / lastLow) * 100;
      stats.pnl += pnl;
      if (pnl > 0) { stats.wins++; stats.winSum += pnl; }
      else { stats.losses++; stats.lossSum += pnl; }
      stats.trades++;
      stats.bestTrade = Math.max(stats.bestTrade, pnl);
      stats.worstTrade = Math.min(stats.worstTrade, pnl);
      stats.detectionTimes.push(minutesUntilClose);
      lastHigh = c5m.h;
    }

    if (isBot && lastHigh !== null) {
      const pnl = ((lastHigh - c5m.l) / lastHigh) * 100;
      stats.pnl += pnl;
      if (pnl > 0) { stats.wins++; stats.winSum += pnl; }
      else { stats.losses++; stats.lossSum += pnl; }
      stats.trades++;
      stats.bestTrade = Math.max(stats.bestTrade, pnl);
      stats.worstTrade = Math.min(stats.worstTrade, pnl);
      stats.detectionTimes.push(minutesUntilClose);
      lastLow = c5m.l;
    }

    if (isTop && lastLow === null) lastHigh = c5m.h;
    if (isBot && lastHigh === null) lastLow = c5m.l;

    last1hBarIndex = current1hIndex;
  }

  if (stats.detectionTimes.length > 0) {
    stats.avgDetectionMinutes = stats.detectionTimes.reduce((a, b) => a + b, 0) / stats.detectionTimes.length;
  }

  return stats;
}

(async () => {
  console.log('\n' + '='.repeat(140));
  console.log('🎯 BTC 1-YEAR BACKTEST - INTRABAR 5M vs 1H CANDLE CLOSE');
  console.log('='.repeat(140) + '\n');

  console.log('📊 Fetching data...\n');
  const candles1h = await fetchCandles(SYMBOL, '1h');
  const candles5m = await fetchCandles(SYMBOL, '5m');

  if (candles1h.length < 50 || candles5m.length < 50) {
    console.log('❌ Insufficient data\n');
    process.exit(1);
  }

  const timeSpanMs = candles1h[candles1h.length - 1].time - candles1h[0].time;
  const daysOfData = timeSpanMs / (1000 * 60 * 60 * 24);

  console.log('📊 Analyzing both strategies...\n');

  // Strategy 1: 1h Candle Close (Backside Only)
  const stats1h = analyzeSwings_Backside(candles1h, LOOKBACK);

  // Strategy 2: Intrabar 5m Confirmation
  const statsIntrabar = analyzeIntrabar5m(candles1h, candles5m, LOOKBACK);

  const wr1h = (stats1h.wins / stats1h.trades * 100);
  const wrIntrabar = (statsIntrabar.wins / statsIntrabar.trades * 100);

  // Print results for 1H CANDLE CLOSE
  console.log('📍 STRATEGY 1: 1H CANDLE CLOSE (Current Implementation)');
  console.log('   (Waits for 1h candle to fully close before signal)\n');
  console.log(`  📈 Data Period: ${daysOfData.toFixed(1)} days (${candles1h.length} candles)`);
  console.log(`  ✅ Total Trades: ${stats1h.trades}`);
  console.log(`     • Wins: ${stats1h.wins} | Losses: ${stats1h.losses}`);
  console.log(`     • Win Rate: ${wr1h.toFixed(2)}%`);
  console.log(`     • Trades/Day: ${(stats1h.trades / daysOfData).toFixed(2)}`);
  console.log(`  📊 P&L Metrics:`);
  console.log(`     • Total PnL: +${stats1h.pnl.toFixed(2)}%`);
  console.log(`     • Avg/Trade: +${(stats1h.pnl / stats1h.trades).toFixed(4)}%`);
  console.log(`     • Best Trade: +${stats1h.bestTrade.toFixed(3)}%`);
  console.log(`     • Worst Trade: ${stats1h.worstTrade.toFixed(3)}%`);
  console.log(`     • Monthly Avg: ${(stats1h.pnl / 12).toFixed(2)}%\n`);

  // Print results for INTRABAR 5M
  console.log('📍 STRATEGY 2: INTRABAR 5M CONFIRMATION (New Proposal)');
  console.log('   (Signals fire on 5m swing, before 1h close)\n');
  console.log(`  📈 Data Period: ${daysOfData.toFixed(1)} days`);
  console.log(`  ✅ Total Trades: ${statsIntrabar.trades}`);
  console.log(`     • Wins: ${statsIntrabar.wins} | Losses: ${statsIntrabar.losses}`);
  console.log(`     • Win Rate: ${wrIntrabar.toFixed(2)}%`);
  console.log(`     • Trades/Day: ${(statsIntrabar.trades / daysOfData).toFixed(2)}`);
  console.log(`  📊 P&L Metrics:`);
  console.log(`     • Total PnL: +${statsIntrabar.pnl.toFixed(2)}%`);
  console.log(`     • Avg/Trade: +${(statsIntrabar.pnl / statsIntrabar.trades).toFixed(4)}%`);
  console.log(`     • Best Trade: +${statsIntrabar.bestTrade.toFixed(3)}%`);
  console.log(`     • Worst Trade: ${statsIntrabar.worstTrade.toFixed(3)}%`);
  console.log(`     • Monthly Avg: ${(statsIntrabar.pnl / 12).toFixed(2)}%`);
  console.log(`  ⏱️  AVG Detection Before 1h Close: ${statsIntrabar.avgDetectionMinutes.toFixed(1)} minutes EARLY\n`);

  // Comparison
  console.log('='.repeat(140));
  console.log('\n📊 HEAD-TO-HEAD COMPARISON:\n');

  const trades_diff = statsIntrabar.trades - stats1h.trades;
  const trades_diff_pct = ((statsIntrabar.trades / stats1h.trades) * 100 - 100).toFixed(1);
  const wr_diff = wrIntrabar - wr1h;
  const pnl_diff = statsIntrabar.pnl - stats1h.pnl;
  const pnl_diff_pct = ((statsIntrabar.pnl / stats1h.pnl) * 100 - 100).toFixed(1);
  const avg_diff = (statsIntrabar.pnl / statsIntrabar.trades) - (stats1h.pnl / stats1h.trades);

  console.log(`Metric                     | 1h Candle Close    | Intrabar 5m        | Difference`);
  console.log('─'.repeat(140));
  console.log(`Total Trades               | ${stats1h.trades.toString().padEnd(18)} | ${statsIntrabar.trades.toString().padEnd(18)} | ${trades_diff > 0 ? '+' : ''}${trades_diff} (${trades_diff_pct}%)`);
  console.log(`Win Rate                   | ${wr1h.toFixed(2).padEnd(18)}% | ${wrIntrabar.toFixed(2).padEnd(18)}% | ${wr_diff > 0 ? '+' : ''}${wr_diff.toFixed(2)}%`);
  console.log(`Total PnL                  | ${stats1h.pnl.toFixed(2).padEnd(18)}% | ${statsIntrabar.pnl.toFixed(2).padEnd(18)}% | ${pnl_diff > 0 ? '+' : ''}${pnl_diff.toFixed(2)}% (${pnl_diff_pct}%)`);
  console.log(`Avg per Trade              | ${(stats1h.pnl / stats1h.trades).toFixed(4).padEnd(18)}% | ${(statsIntrabar.pnl / statsIntrabar.trades).toFixed(4).padEnd(18)}% | ${avg_diff > 0 ? '+' : ''}${avg_diff.toFixed(4)}%`);
  console.log(`Signal Delay               | 0 min (at 1h close)| ${statsIntrabar.avgDetectionMinutes.toFixed(1)} min BEFORE close | ${statsIntrabar.avgDetectionMinutes.toFixed(1)} min FASTER`);
  console.log();

  console.log('='.repeat(140));
  console.log('\n🚀 KEY FINDINGS:\n');

  console.log(`SIGNAL TIMING:`);
  console.log(`  • 1h Strategy: Signals fire when 1h candle CLOSES`);
  console.log(`  • Intrabar Strategy: Signals fire ${statsIntrabar.avgDetectionMinutes.toFixed(0)} minutes BEFORE 1h close`);
  console.log(`  • Speed Advantage: ~${statsIntrabar.avgDetectionMinutes.toFixed(0)} minute average head start\n`);

  console.log(`SIGNAL VOLUME:`);
  console.log(`  • 1h: ${stats1h.trades} trades (${(stats1h.trades / daysOfData).toFixed(2)}/day)`);
  console.log(`  • Intrabar: ${statsIntrabar.trades} trades (${(statsIntrabar.trades / daysOfData).toFixed(2)}/day)`);
  console.log(`  • Difference: ${trades_diff > 0 ? '+' : ''}${trades_diff} trades (${trades_diff_pct}%)\n`);

  console.log(`PROFITABILITY:`);
  console.log(`  • 1h Total: +${stats1h.pnl.toFixed(2)}% (${(stats1h.pnl / 12).toFixed(2)}%/month)`);
  console.log(`  • Intrabar Total: +${statsIntrabar.pnl.toFixed(2)}% (${(statsIntrabar.pnl / 12).toFixed(2)}%/month)`);
  console.log(`  • Difference: ${pnl_diff > 0 ? '+' : ''}${pnl_diff.toFixed(2)}% (${pnl_diff_pct}%)\n`);

  console.log(`ACCURACY:`);
  console.log(`  • 1h Win Rate: ${wr1h.toFixed(2)}%`);
  console.log(`  • Intrabar Win Rate: ${wrIntrabar.toFixed(2)}%`);
  console.log(`  • Difference: ${wr_diff > 0 ? '+' : ''}${wr_diff.toFixed(2)}%\n`);

  console.log('='.repeat(140));
  console.log('\n💡 RECOMMENDATION:\n');

  if (statsIntrabar.trades > stats1h.trades && wrIntrabar >= 95 && statsIntrabar.pnl >= stats1h.pnl * 0.95) {
    console.log(`🎯 SWITCH TO INTRABAR 5M!`);
    console.log(`   ✅ ${trades_diff_pct}% more signals (earlier detection)`);
    console.log(`   ✅ ${statsIntrabar.avgDetectionMinutes.toFixed(0)} minute average head start`);
    console.log(`   ✅ Win rate: ${wrIntrabar.toFixed(2)}% (maintained)`);
    console.log(`   ✅ Profit impact: ${pnl_diff_pct}% (acceptable trade-off for speed)\n`);
    console.log(`   IMPLEMENTATION:Use request.security() to scan 5m data within 1h context`);
    console.log(`   Result: Live intrabar signals without waiting for full 1h candle close\n`);
  } else if (statsIntrabar.pnl < stats1h.pnl * 0.8) {
    console.log(`❌ KEEP 1H CANDLE CLOSE`);
    console.log(`   Intrabar loses too much profitability (${pnl_diff_pct}% lower)`);
    console.log(`   The 1h candle close confirmation is worth the wait\n`);
  } else {
    console.log(`⚖️  TRADE-OFF DECISION`);
    console.log(`   Intrabar gives ${statsIntrabar.avgDetectionMinutes.toFixed(0)}min head start but ${pnl_diff_pct}% less profit`);
    console.log(`   Your choice:`);
    console.log(`   • Want SPEED? → Use Intrabar (${statsIntrabar.avgDetectionMinutes.toFixed(0)}min earlier entry)`);
    console.log(`   • Want MAX PROFIT? → Keep 1h Close\n`);
  }

  console.log('='.repeat(140) + '\n');

  process.exit(0);
})().catch(e => {
  console.error('\n❌ Error:', e.message);
  process.exit(1);
});
