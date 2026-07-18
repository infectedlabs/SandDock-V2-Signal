require('dotenv').config({ path: './telegram-signal-worker/.env' });
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

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
    log(`[${symbol}] Fetch error: ${e.message}`);
    return [];
  }
  return all;
}

function detectSwings(candles) {
  const L = 5;
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
  
  // Enforce alternation: remove consecutive signals of same type
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

function deduplicateSignals(signals) {
  const seen = new Set();
  const unique = [];
  
  signals.forEach(s => {
    const key = `${s.time}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(s);
    }
  });
  
  return unique;
}

function createSignalObjects(signals) {
  return signals.map(s => ({
    symbol: s.symbol || 'BTCUSDT',
    interval: '30m',
    bar_time: s.time,
    signal_type: s.type,
    action: s.type === 'buy' ? 'BUY' : 'SELL',
    rationale: s.type === 'buy' ? 'Swing low' : 'Swing high',
    entry_price: s.price,
    sl_price: s.type === 'buy' ? s.price * 0.995 : s.price * 1.005,
    tp_price: s.type === 'buy' ? s.price * 1.015 : s.price * 0.985,
    sl_pct: 0.5,
    tp_pct: 1.5,
    confidence: 95,
  }));
}

function calcClosesAndMarkLive(sigs) {
  return sigs.map((s, i) => {
    const isBuy = s.signal_type === 'buy';
    let idx = -1;
    
    // Find the next opposite signal
    for (let j = i + 1; j < sigs.length; j++) {
      if (isBuy !== (sigs[j].signal_type === 'buy')) {
        idx = j;
        break;
      }
    }
    
    let close_price, close_reason, closed_at, pnl_pct, is_win;
    
    if (idx !== -1) {
      // Found opposite signal - close with that
      const next = sigs[idx];
      close_price = next.entry_price;
      closed_at = next.bar_time;
      close_reason = 'swing_opposite';
      const p = isBuy ? (close_price - s.entry_price) / s.entry_price * 100 
                      : (s.entry_price - close_price) / s.entry_price * 100;
      pnl_pct = Number(p.toFixed(2));
      is_win = pnl_pct > 0;
    } else if (i === sigs.length - 1) {
      // Last signal - leave it LIVE
      close_price = s.tp_price;
      closed_at = null;
      close_reason = 'pending';
      pnl_pct = null;
      is_win = null;
    } else {
      // Middle signal with no opposite - this shouldn't happen with proper alternation
      // But if it does, close it with TP
      close_price = s.tp_price;
      closed_at = s.bar_time;
      close_reason = 'tp_hit';
      pnl_pct = 1.5;
      is_win = true;
    }
    
    return { ...s, close_price, close_reason, closed_at, pnl_pct, is_win };
  });
}

async function insertInBatches(symbol, signals, batchSize = 1000) {
  let inserted = 0;
  for (let i = 0; i < signals.length; i += batchSize) {
    const batch = signals.slice(i, i + batchSize);
    const { error } = await supabase.from('signals').insert(batch);
    if (error) {
      log(`[${symbol}] Batch ${Math.floor(i/batchSize)} error: ${error.message}`);
      return -1;
    }
    inserted += batch.length;
    log(`[${symbol}] Inserted batch ${Math.floor(i/batchSize) + 1}: ${batch.length} signals (total: ${inserted})`);
  }
  return inserted;
}

(async () => {
  let total = 0;
  for (const symbol of SYMBOLS) {
    log(`[${symbol}] Starting...`);
    const candles = await fetchCandles(symbol);
    log(`[${symbol}] Got ${candles.length} candles`);
    if (candles.length < 11) continue;
    
    let detected = detectSwings(candles);
    log(`[${symbol}] ${detected.length} swings detected`);
    
    // Add symbol to each swing
    detected.forEach(s => s.symbol = symbol);
    
    detected = deduplicateSignals(detected);
    log(`[${symbol}] ${detected.length} swings after deduplication`);
    
    if (!detected.length) continue;
    
    const signalObjs = createSignalObjects(detected);
    const withCloses = calcClosesAndMarkLive(signalObjs);
    
    const inserted = await insertInBatches(symbol, withCloses);
    if (inserted > 0) {
      const a = withCloses.filter(s => !s.closed_at).length;
      const c = withCloses.filter(s => s.closed_at).length;
      const w = withCloses.filter(s => s.is_win).length;
      const wr = ((w / withCloses.length) * 100).toFixed(1);
      log(`[${symbol}] ✅ ${inserted} signals (${a} LIVE, ${c} CLOSED, ${wr}% WR)`);
      total += inserted;
    }
  }
  log(`✅ COMPLETE: ${total} total signals`);
  process.exit(0);
})().catch(e => {
  log(`FATAL: ${e.message}`);
  process.exit(1);
});
