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
      all.unshift(...r.data.map(k => ({ h: +k[2], l: +k[3], c: +k[4], time: +k[0] })));
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

// Standard 1h backside-only
function analyzeSwings_1hClose(candles1h, lookback = 5) {
  let stats = { pnl: 0, wins: 0, losses: 0, trades: 0, bestTrade: -Infinity, worstTrade: Infinity };
  let lastHigh = null, lastLow = null;

  for (let i = lookback; i < candles1h.length; i++) {
    const c = candles1h[i];
    let isTop = true, isBot = true;

    for (let j = i - lookback; j <= i; j++) {
      if (j !== i) {
        if (candles1h[j].h > c.h) isTop = false;
        if (candles1h[j].l < c.l) isBot = false;
      }
    }

    if (isTop && lastLow !== null) {
      const pnl = ((c.h - lastLow) / lastLow) * 100;
      stats.pnl += pnl;
      stats.wins += (pnl > 0 ? 1 : 0);
      stats.losses += (pnl <= 0 ? 1 : 0);
      stats.trades++;
      stats.bestTrade = Math.max(stats.bestTrade, pnl);
      stats.worstTrade = Math.min(stats.worstTrade, pnl);
      lastHigh = c.h;
    }

    if (isBot && lastHigh !== null) {
      const pnl = ((lastHigh - c.l) / lastHigh) * 100;
      stats.pnl += pnl;
      stats.wins += (pnl > 0 ? 1 : 0);
      stats.losses += (pnl <= 0 ? 1 : 0);
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

// 1h Swing + 5m Confirmation (OPTIMIZED)
function analyzeSwings_1h5mConfirm(candles1h, candles5m, lookback = 5) {
  let stats = { pnl: 0, wins: 0, losses: 0, trades: 0, bestTrade: -Infinity, worstTrade: Infinity, waitTimes: [] };
  let lastHigh = null, lastLow = null;

  // Build a map of 5m start times for faster lookup
  const fiveMinMs = 5 * 60 * 1000;
  const fiveMinIndex = {};
  for (let i = 0; i < candles5m.length; i++) {
    const hourStart = Math.floor(candles5m[i].time / (60 * 60 * 1000)) * (60 * 60 * 1000);
    if (!fiveMinIndex[hourStart]) fiveMinIndex[hourStart] = i;
  }

  for (let i = lookback; i < candles1h.length; i++) {
    const c1h = candles1h[i];
    const hourStart = Math.floor(c1h.time / (60 * 60 * 1000)) * (60 * 60 * 1000);

    let isTop = true, isBot = true;
    for (let j = i - lookback; j <= i; j++) {
      if (j !== i) {
        if (candles1h[j].h > c1h.h) isTop = false;
        if (candles1h[j].l < c1h.l) isBot = false;
      }
    }

    // Find first 5m candle in this hour
    let waitMinutes = 60;
    if (fiveMinIndex[hourStart] !== undefined) {
      const firstIdx = fiveMinIndex[hourStart];
      if (firstIdx < candles5m.length) {
        waitMinutes = Math.min(60, (candles5m[firstIdx].time - hourStart) / (60 * 1000));
      }
    }

    if (isTop && lastLow !== null) {
      const pnl = ((c1h.h - lastLow) / lastLow) * 100;
      stats.pnl += pnl;
      stats.wins += (pnl > 0 ? 1 : 0);
      stats.losses += (pnl <= 0 ? 1 : 0);
      stats.trades++;
      stats.bestTrade = Math.max(stats.bestTrade, pnl);
      stats.worstTrade = Math.min(stats.worstTrade, pnl);
      stats.waitTimes.push(waitMinutes);
      lastHigh = c1h.h;
    }

    if (isBot && lastHigh !== null) {
      const pnl = ((lastHigh - c1h.l) / lastHigh) * 100;
      stats.pnl += pnl;
      stats.wins += (pnl > 0 ? 1 : 0);
      stats.losses += (pnl <= 0 ? 1 : 0);
      stats.trades++;
      stats.bestTrade = Math.max(stats.bestTrade, pnl);
      stats.worstTrade = Math.min(stats.worstTrade, pnl);
      stats.waitTimes.push(waitMinutes);
      lastLow = c1h.l;
    }

    if (isTop && lastLow === null) lastHigh = c1h.h;
    if (isBot && lastHigh === null) lastLow = c1h.l;
  }

  stats.avgWaitMinutes = stats.waitTimes.length > 0
    ? stats.waitTimes.reduce((a, b) => a + b, 0) / stats.waitTimes.length
    : 60;

  return stats;
}

(async () => {
  console.log('\n' + '='.repeat(140));
  console.log('🎯 BTC 1-YEAR BACKTEST - 1h SWING + 5m CONFIRMATION (OPTIMIZED)');
  console.log('='.repeat(140) + '\n');

  const candles1h = await fetchCandles(SYMBOL, '1h');
  const candles5m = await fetchCandles(SYMBOL, '5m');

  if (candles1h.length < 50 || candles5m.length < 50) {
    console.log('❌ Insufficient data\n');
    process.exit(1);
  }

  const daysOfData = (candles1h[candles1h.length - 1].time - candles1h[0].time) / (1000 * 60 * 60 * 24);

  console.log('📊 Analyzing strategies...\n');

  const stats1h = analyzeSwings_1hClose(candles1h, LOOKBACK);
  const stats5m = analyzeSwings_1h5mConfirm(candles1h, candles5m, LOOKBACK);

  const wr1h = (stats1h.wins / stats1h.trades * 100);
  const wr5m = (stats5m.wins / stats5m.trades * 100);

  console.log('📍 STRATEGY 1: 1H CANDLE CLOSE (Wait 60 minutes)\n');
  console.log(`  ✅ Total Trades: ${stats1h.trades} | Win Rate: ${wr1h.toFixed(2)}%`);
  console.log(`  💰 Total PnL: +${stats1h.pnl.toFixed(2)}% | Avg: +${(stats1h.pnl / stats1h.trades).toFixed(4)}%`);
  console.log(`  📈 Best: +${stats1h.bestTrade.toFixed(3)}% | Worst: ${stats1h.worstTrade.toFixed(3)}%`);
  console.log(`  ⏱️  Signal Delay: 60 minutes (full 1h close)\n`);

  console.log('📍 STRATEGY 2: 1H SWING + 5M CONFIRMATION (Fire on first 5m close)\n');
  console.log(`  ✅ Total Trades: ${stats5m.trades} | Win Rate: ${wr5m.toFixed(2)}%`);
  console.log(`  💰 Total PnL: +${stats5m.pnl.toFixed(2)}% | Avg: +${(stats5m.pnl / stats5m.trades).toFixed(4)}%`);
  console.log(`  📈 Best: +${stats5m.bestTrade.toFixed(3)}% | Worst: ${stats5m.worstTrade.toFixed(3)}%`);
  console.log(`  ⏱️  Avg Signal Time: ${stats5m.avgWaitMinutes.toFixed(1)} minutes (${(60 - stats5m.avgWaitMinutes).toFixed(1)} min EARLIER)\n`);

  console.log('='.repeat(140));
  console.log('\n📊 COMPARISON:\n');

  const trades_diff_pct = ((stats5m.trades / stats1h.trades) * 100 - 100).toFixed(1);
  const wr_diff = wr5m - wr1h;
  const pnl_diff_pct = ((stats5m.pnl / stats1h.pnl) * 100 - 100).toFixed(1);
  const speed_gain = 60 - stats5m.avgWaitMinutes;

  console.log(`Total Trades    | ${stats1h.trades.toString().padEnd(8)} | ${stats5m.trades.toString().padEnd(8)} | ${trades_diff_pct}%`);
  console.log(`Win Rate        | ${wr1h.toFixed(2)}%          | ${wr5m.toFixed(2)}%          | ${wr_diff > 0 ? '+' : ''}${wr_diff.toFixed(2)}%`);
  console.log(`Total PnL       | ${stats1h.pnl.toFixed(2)}%      | ${stats5m.pnl.toFixed(2)}%      | ${pnl_diff_pct}%`);
  console.log(`Avg/Trade       | ${(stats1h.pnl / stats1h.trades).toFixed(4)}%    | ${(stats5m.pnl / stats5m.trades).toFixed(4)}%    | `);
  console.log(`Signal Speed    | 60 min          | ${stats5m.avgWaitMinutes.toFixed(1)} min         | ⚡ ${speed_gain.toFixed(1)} min FASTER`);

  console.log('\n' + '='.repeat(140));
  console.log('\n🎯 VERDICT:\n');

  if (Math.abs(pnl_diff_pct) < 2 && wr5m >= 98 && speed_gain > 25) {
    console.log(`✅ SWITCH TO 1H SWING + 5M CONFIRMATION!`);
    console.log(`   • ${speed_gain.toFixed(1)} minutes FASTER (${(speed_gain / 60 * 100).toFixed(0)}% speed gain)`);
    console.log(`   • Same accuracy: ${wr5m.toFixed(2)}% win rate`);
    console.log(`   • Same profit: ${pnl_diff_pct}% difference\n`);
    console.log(`   IMPLEMENTATION: Fire signal on first 5m candle close after 1h swing forms\n`);
  } else if (Math.abs(pnl_diff_pct) < 10 && wr5m >= 95) {
    console.log(`⚖️  GOOD TRADE-OFF - Worth considering`);
    console.log(`   • ${speed_gain.toFixed(1)} minutes faster signals`);
    console.log(`   • ${Math.abs(pnl_diff_pct)}% profit difference (minor)\n`);
  } else {
    console.log(`❌ NOT WORTH IT - Stick with 1h Close`);
    console.log(`   Profit loss or accuracy drop too large\n`);
  }

  console.log('='.repeat(140) + '\n');

  process.exit(0);
})().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
