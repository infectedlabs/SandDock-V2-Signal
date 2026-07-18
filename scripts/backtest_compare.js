require('dotenv').config({ path: './telegram-signal-worker/.env' });
const axios = require('axios');

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

async function fetchCandles(symbol) {
  const all = [];
  let endTime = null;
  try {
    for (let i = 0; i < 18; i++) {
      const params = { symbol, interval: '30m', limit: 1000 };
      if (endTime) params.endTime = endTime;
      const { data } = await axios.get('https://fapi.binance.com/fapi/v1/klines', {
        params,
        timeout: 10000,
      });
      if (!data.length) break;
      all.unshift(...data.map(k => ({
        open_time: new Date(k[0]).toISOString(),
        close_time: new Date(k[6]).toISOString(),
        high: +k[2],
        low: +k[3],
        symbol,
      })));
      endTime = data[0][0];
      if (data.length < 1000) break;
      await new Promise(r => setTimeout(r, 100));
    }
  } catch (e) {
    log(`Fetch error: ${e.message}`);
    return [];
  }
  return all;
}

function detectSwings(candles, lookback) {
  const L = lookback;
  const allSwings = [];
  
  for (let i = L; i < candles.length; i++) {
    const c = candles[i];
    
    let isLow = true, isHigh = true;
    for (let j = i - L; j <= i; j++) {
      if (j !== i) {
        if (candles[j].low < c.low) isLow = false;
        if (candles[j].high > c.high) isHigh = false;
      }
    }
    
    if (isLow) {
      allSwings.push({
        idx: i,
        time: c.close_time,
        type: 'buy',
        price: c.low,
      });
    }
    
    if (isHigh) {
      allSwings.push({
        idx: i,
        time: c.close_time,
        type: 'sell',
        price: c.high,
      });
    }
  }
  
  // Enforce alternation
  const signals = [];
  let lastType = null;
  
  for (const swing of allSwings) {
    if (swing.type !== lastType) {
      signals.push(swing);
      lastType = swing.type;
    }
  }
  
  return signals;
}

function calculateBacktestMetrics(signals) {
  let wins = 0;
  let losses = 0;
  let totalPnL = 0;
  
  for (let i = 0; i < signals.length - 1; i++) {
    const current = signals[i];
    const next = signals[i + 1];
    
    const isBuy = current.type === 'buy';
    const pnl = isBuy 
      ? (next.price - current.price) / current.price * 100
      : (current.price - next.price) / current.price * 100;
    
    if (pnl > 0) {
      wins++;
    } else {
      losses++;
    }
    
    totalPnL += pnl;
  }
  
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total * 100).toFixed(1) : 0;
  const annualReturn = totalPnL.toFixed(2);
  
  return { wins, losses, winRate, totalPnL: annualReturn, total };
}

(async () => {
  log('Fetching BTC data...');
  const candles = await fetchCandles('BTCUSDT');
  log(`Got ${candles.length} candles`);
  
  if (candles.length < 500) {
    log('Not enough data');
    process.exit(1);
  }
  
  // Test lookback 5
  log('\n=== Testing LOOKBACK=5 ===');
  const signals5 = detectSwings(candles, 5);
  const metrics5 = calculateBacktestMetrics(signals5);
  log(`Total signals: ${signals5.length}`);
  log(`Wins: ${metrics5.wins}`);
  log(`Losses: ${metrics5.losses}`);
  log(`Win Rate: ${metrics5.winRate}%`);
  log(`Annual Return: ${metrics5.totalPnL}%`);
  
  // Test lookback 10
  log('\n=== Testing LOOKBACK=10 ===');
  const signals10 = detectSwings(candles, 10);
  const metrics10 = calculateBacktestMetrics(signals10);
  log(`Total signals: ${signals10.length}`);
  log(`Wins: ${metrics10.wins}`);
  log(`Losses: ${metrics10.losses}`);
  log(`Win Rate: ${metrics10.winRate}%`);
  log(`Annual Return: ${metrics10.totalPnL}%`);
  
  // Comparison
  log('\n=== COMPARISON ===');
  const signalDiff = ((signals10.length - signals5.length) / signals5.length * 100).toFixed(1);
  const winRateDiff = (metrics10.winRate - metrics5.winRate).toFixed(1);
  const returnDiff = (metrics10.totalPnL - metrics5.totalPnL).toFixed(2);
  
  log(`Signal Count: ${signals5.length} → ${signals10.length} (${signalDiff > 0 ? '+' : ''}${signalDiff}%)`);
  log(`Win Rate: ${metrics5.winRate}% → ${metrics10.winRate}% (${winRateDiff > 0 ? '+' : ''}${winRateDiff}%)`);
  log(`Annual Return: ${metrics5.totalPnL}% → ${metrics10.totalPnL}% (${returnDiff > 0 ? '+' : ''}${returnDiff}%)`);
  
  // Recommendation
  log('\n=== RECOMMENDATION ===');
  if (metrics10.winRate > metrics5.winRate) {
    log(`✅ LOOKBACK=10 is better (${winRateDiff > 0 ? '+' : ''}${winRateDiff}% higher win rate)`);
  } else if (metrics10.winRate < metrics5.winRate) {
    log(`✅ LOOKBACK=5 is better (${Math.abs(winRateDiff)}% higher win rate)`);
  } else {
    log(`➖ Both have similar win rates, compare by frequency vs return trade-off`);
  }
  
  process.exit(0);
})();
