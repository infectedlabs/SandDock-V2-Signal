const axios = require('axios');

const API = 'https://api.binance.com/api/v3';
const SYMBOL = 'BTCUSDT';
const LOOKBACK = 5;

async function fetchCandles(symbol, tf) {
  let all = [], endTime = Date.now();
  console.log(`    Fetching ${symbol} ${tf} (1 year of data)...`);

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
      console.error(`Error fetching: ${e.message}`);
      break;
    }
  }
  console.log(` ✓ ${all.length} candles loaded\n`);
  return all.sort((a, b) => a.time - b.time);
}

// BOTH SIDES: Checks lookback bars before AND after (current implementation)
function analyzeSwings_BothSides(candles, lookback = 5) {
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

  // Start from lookback (need past data) and end before lookback (need future data)
  for (let i = lookback; i < candles.length - lookback; i++) {
    const c = candles[i];

    // Check if highest/lowest of bars BEFORE AND AFTER
    let isTop = true, isBot = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
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

// BACKSIDE ONLY: Checks lookback bars BEFORE only (looks backward, fires immediately)
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

  // Start from lookback (need past data), go to end (no future bars needed!)
  for (let i = lookback; i < candles.length; i++) {
    const c = candles[i];

    // Check if highest/lowest of bars BEFORE ONLY (not future)
    let isTop = true, isBot = true;
    for (let j = i - lookback; j <= i; j++) {  // Only look BACKWARD, include current bar
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

(async () => {
  console.log('\n' + '='.repeat(120));
  console.log('🎯 BTC 1-YEAR BACKTEST - LOOKBACK COMPARISON (30m Timeframe)');
  console.log('='.repeat(120) + '\n');

  const candles = await fetchCandles(SYMBOL, '30m');

  if (candles.length < 50) {
    console.log(`❌ Insufficient data\n`);
    process.exit(1);
  }

  console.log('📊 Analyzing both lookback strategies...\n');

  // Test both approaches
  const statsBothSides = analyzeSwings_BothSides(candles, LOOKBACK);
  const statsBacksideOnly = analyzeSwings_BacksideOnly(candles, LOOKBACK);

  // Calculate metrics for both sides
  const wr_both = (statsBothSides.wins / statsBothSides.trades * 100);
  const avg_both = (statsBothSides.pnl / statsBothSides.trades);
  const pf_both = statsBothSides.winSum !== 0 && statsBothSides.lossSum !== 0
    ? (statsBothSides.winSum / Math.abs(statsBothSides.lossSum)).toFixed(2)
    : (statsBothSides.winSum !== 0 ? 'Inf' : 'N/A');

  // Calculate metrics for backside only
  const wr_backside = (statsBacksideOnly.wins / statsBacksideOnly.trades * 100);
  const avg_backside = (statsBacksideOnly.pnl / statsBacksideOnly.trades);
  const pf_backside = statsBacksideOnly.winSum !== 0 && statsBacksideOnly.lossSum !== 0
    ? (statsBacksideOnly.winSum / Math.abs(statsBacksideOnly.lossSum)).toFixed(2)
    : (statsBacksideOnly.winSum !== 0 ? 'Inf' : 'N/A');

  const timeSpanMs = candles[candles.length - 1].time - candles[0].time;
  const daysOfData = timeSpanMs / (1000 * 60 * 60 * 24);

  // Print results for BOTH SIDES
  console.log('📍 CURRENT IMPLEMENTATION: BOTH SIDES LOOKBACK');
  console.log('   (Checks 5 bars BEFORE + 5 bars AFTER = waits for future confirmation)\n');
  console.log(`  📈 Data Period: ${daysOfData.toFixed(1)} days (${candles.length} candles)`);
  console.log(`  ✅ Total Trades: ${statsBothSides.trades}`);
  console.log(`     • Wins: ${statsBothSides.wins} | Losses: ${statsBothSides.losses}`);
  console.log(`     • Win Rate: ${wr_both.toFixed(2)}%`);
  console.log(`     • Trades/Day: ${(statsBothSides.trades / daysOfData).toFixed(2)}`);
  console.log(`  📊 P&L Metrics:`);
  console.log(`     • Total PnL: +${statsBothSides.pnl.toFixed(2)}%`);
  console.log(`     • Avg/Trade: +${avg_both.toFixed(4)}%`);
  console.log(`     • Best Trade: +${statsBothSides.bestTrade.toFixed(3)}%`);
  console.log(`     • Worst Trade: ${statsBothSides.worstTrade.toFixed(3)}%`);
  console.log(`     • Profit Factor: ${pf_both}`);
  console.log(`     • Monthly Avg: ${(statsBothSides.pnl / 12).toFixed(2)}%\n`);

  // Print results for BACKSIDE ONLY
  console.log('📍 NEW IMPLEMENTATION: BACKSIDE-ONLY LOOKBACK');
  console.log('   (Checks 5 bars BEFORE only = fires signal IMMEDIATELY, no future wait!)\n');
  console.log(`  📈 Data Period: ${daysOfData.toFixed(1)} days (${candles.length} candles)`);
  console.log(`  ✅ Total Trades: ${statsBacksideOnly.trades}`);
  console.log(`     • Wins: ${statsBacksideOnly.wins} | Losses: ${statsBacksideOnly.losses}`);
  console.log(`     • Win Rate: ${wr_backside.toFixed(2)}%`);
  console.log(`     • Trades/Day: ${(statsBacksideOnly.trades / daysOfData).toFixed(2)}`);
  console.log(`  📊 P&L Metrics:`);
  console.log(`     • Total PnL: +${statsBacksideOnly.pnl.toFixed(2)}%`);
  console.log(`     • Avg/Trade: +${avg_backside.toFixed(4)}%`);
  console.log(`     • Best Trade: +${statsBacksideOnly.bestTrade.toFixed(3)}%`);
  console.log(`     • Worst Trade: ${statsBacksideOnly.worstTrade.toFixed(3)}%`);
  console.log(`     • Profit Factor: ${pf_backside}`);
  console.log(`     • Monthly Avg: ${(statsBacksideOnly.pnl / 12).toFixed(2)}%\n`);

  // Comparison
  console.log('='.repeat(120));
  console.log('\n📊 HEAD-TO-HEAD COMPARISON:\n');

  const trades_diff = statsBacksideOnly.trades - statsBothSides.trades;
  const trades_diff_pct = ((statsBacksideOnly.trades / statsBothSides.trades) * 100 - 100).toFixed(1);
  const wr_diff = wr_backside - wr_both;
  const pnl_diff = statsBacksideOnly.pnl - statsBothSides.pnl;
  const pnl_diff_pct = ((statsBacksideOnly.pnl / statsBothSides.pnl) * 100 - 100).toFixed(1);
  const avg_diff = avg_backside - avg_both;
  const avg_diff_pct = ((avg_backside / avg_both) * 100 - 100).toFixed(1);

  console.log(`Metric                  | Both Sides      | Backside-Only   | Difference`);
  console.log(`${'─'.repeat(120)}`);
  console.log(`Total Trades            | ${statsBothSides.trades.toString().padEnd(14)} | ${statsBacksideOnly.trades.toString().padEnd(14)} | ${trades_diff > 0 ? '+' : ''}${trades_diff} trades (${trades_diff_pct}%)`);
  console.log(`Win Rate                | ${wr_both.toFixed(2).padEnd(14)}% | ${wr_backside.toFixed(2).padEnd(14)}% | ${wr_diff > 0 ? '+' : ''}${wr_diff.toFixed(2)}%`);
  console.log(`Total PnL               | ${statsBothSides.pnl.toFixed(2).padEnd(14)}% | ${statsBacksideOnly.pnl.toFixed(2).padEnd(14)}% | ${pnl_diff > 0 ? '+' : ''}${pnl_diff.toFixed(2)}% (${pnl_diff_pct}%)`);
  console.log(`Avg per Trade           | ${avg_both.toFixed(4).padEnd(14)}% | ${avg_backside.toFixed(4).padEnd(14)}% | ${avg_diff > 0 ? '+' : ''}${avg_diff.toFixed(4)}% (${avg_diff_pct}%)`);
  console.log(`Best Trade              | ${statsBothSides.bestTrade.toFixed(3).padEnd(14)}% | ${statsBacksideOnly.bestTrade.toFixed(3).padEnd(14)}% | ${(statsBacksideOnly.bestTrade - statsBothSides.bestTrade).toFixed(3)}%`);
  console.log(`Worst Trade             | ${statsBothSides.worstTrade.toFixed(3).padEnd(14)}% | ${statsBacksideOnly.worstTrade.toFixed(3).padEnd(14)}% | ${(statsBacksideOnly.worstTrade - statsBothSides.worstTrade).toFixed(3)}%`);
  console.log(`Profit Factor           | ${pf_both.toString().padEnd(14)} | ${pf_backside.toString().padEnd(14)} |`);
  console.log();

  console.log('='.repeat(120));
  console.log('\n🚀 KEY INSIGHTS:\n');

  // Analysis
  if (statsBacksideOnly.trades > statsBothSides.trades) {
    console.log(`✅ MORE SIGNALS: Backside-only generates ${trades_diff} MORE trades (${trades_diff_pct}% increase)`);
    console.log(`   → This means signals fire MUCH earlier (no 2.5-hour wait!)\n`);
  }

  if (wr_backside < wr_both) {
    const wr_loss = Math.abs(wr_diff);
    console.log(`⚠️  ACCURACY TRADE-OFF: Win rate drops by ${wr_loss.toFixed(2)}% (from ${wr_both.toFixed(2)}% to ${wr_backside.toFixed(2)}%)`);
    console.log(`   → This is because we're not waiting for future confirmation\n`);
  }

  if (statsBacksideOnly.pnl < statsBothSides.pnl) {
    const pnl_loss = Math.abs(pnl_diff_pct);
    console.log(`❌ LOWER PROFITS: Total PnL drops by ${pnl_loss}% (${pnl_diff.toFixed(2)}% less)`);
    console.log(`   → Lower accuracy + more false signals = worse overall P&L\n`);
  } else if (statsBacksideOnly.pnl > statsBothSides.pnl) {
    console.log(`✅ HIGHER PROFITS: Total PnL INCREASES by ${pnl_diff_pct}% (+${pnl_diff.toFixed(2)}%)`);
    console.log(`   → More trades + acceptable accuracy = better overall P&L\n`);
  }

  console.log('='.repeat(120));
  console.log('\n💡 RECOMMENDATION:\n');

  if (statsBacksideOnly.pnl > statsBothSides.pnl && wr_backside >= 95) {
    console.log(`🎯 SWITCH TO BACKSIDE-ONLY!`);
    console.log(`   ✅ Significantly more signals (${trades_diff_pct}% more)`);
    console.log(`   ✅ Better profits (+${pnl_diff_pct}%)`);
    console.log(`   ✅ Still strong win rate (${wr_backside.toFixed(2)}%)`);
    console.log(`   ✅ Eliminates 2.5-hour delay → LIVE SIGNALS!\n`);
  } else if (statsBacksideOnly.pnl < statsBothSides.pnl * 0.8) {
    console.log(`❌ KEEP BOTH SIDES LOOKBACK`);
    console.log(`   Backside-only loses too much profitability (${pnl_diff_pct}% lower P&L)`);
    console.log(`   The future confirmation is worth the 2.5-hour wait\n`);
    console.log(`   Instead: Use intrabar alerts or request.security() for lower-timeframe scanning\n`);
  } else {
    console.log(`⚖️  TRADE-OFF DECISION`);
    console.log(`   Backside-only gives ${trades_diff_pct}% more signals but ${Math.abs(pnl_diff_pct)}% less profit`);
    console.log(`   Your choice depends on preference:`);
    console.log(`   • Want LIVE signals? → Use Backside-Only (sacrifice ${Math.abs(pnl_diff_pct)}% profit for instant signals)`);
    console.log(`   • Want MAX profit? → Keep Both-Sides (accept 2.5-hour delay)\n`);
  }

  console.log('='.repeat(120) + '\n');

  process.exit(0);
})().catch(e => {
  console.error('\n❌ Error:', e.message);
  console.error(e.stack);
  process.exit(1);
});
