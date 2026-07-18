require('dotenv').config({ path: './telegram-signal-worker/.env' });
const axios = require('axios');

async function fetchCandles(symbol) {
  const all = [];
  let endTime = null;
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
  return all;
}

function detectSwings(candles) {
  const signals = [];
  const L = 5;
  
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
      signals.push({ close_time: c.close_time, signal_type: 'buy' });
    }
    
    if (isHigh) {
      const offset = isLow ? new Date(c.close_time).getTime() + 1000 : c.close_time;
      signals.push({ close_time: new Date(offset).toISOString(), signal_type: 'sell' });
    }
  }
  
  return signals;
}

(async () => {
  const candles = await fetchCandles('BTCUSDT');
  console.log(`Fetched ${candles.length} candles`);
  
  // Check for duplicate candles
  const closeTimes = new Set();
  let candleDups = 0;
  candles.forEach(c => {
    if (closeTimes.has(c.close_time)) candleDups++;
    closeTimes.add(c.close_time);
  });
  console.log(`Unique candle close_times: ${closeTimes.size}, Duplicate candles: ${candleDups}\n`);
  
  const signals = detectSwings(candles);
  console.log(`Detected ${signals.length} signals`);
  
  const times = {};
  signals.forEach(s => {
    if (!times[s.close_time]) times[s.close_time] = 0;
    times[s.close_time]++;
  });
  
  const dups = Object.entries(times).filter(([_, count]) => count > 1);
  console.log(`Signal bar_time duplicates: ${dups.length}`);
  
  if (dups.length > 0) {
    console.log(`\nFirst 5 duplicate bar_times:`);
    dups.slice(0, 5).forEach(([time, count]) => {
      console.log(`  ${time}: ${count} signals`);
    });
  }
})();
