const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error(`.env.local not found at ${envPath}`);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

function generateDeterministicUUID(symbol, interval, barTime) {
  const hash = crypto.createHash('md5').update(`${symbol}-${interval}-${barTime}`).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16),
    'a' + hash.slice(17, 20),
    hash.slice(20, 32)
  ].join('-');
}

function computeConfidence(ha, barIndex) {
  let score = 60;
  const windowStart = Math.max(0, barIndex - 20);
  const window = ha.slice(windowStart, barIndex);
  if (window.length > 0) {
    const avgVol = window.reduce((sum, c) => sum + c.volume, 0) / window.length;
    if (ha[barIndex].volume > avgVol) {
      score += 10;
    }
  }
  score += 5;
  return Math.max(40, Math.min(95, score));
}

function generateRationale(symbol, type, interval, barIndex, ha) {
  const direction = type === 'bot' ? 'bottom' : 'top';
  let rationale = `Automated Heikin Ashi swing ${direction} confirmation for ${symbol} on the ${interval} timeframe. Trend reversal validation metrics support current price targets.`;
  
  const windowStart = Math.max(0, barIndex - 20);
  const window = ha.slice(windowStart, barIndex);
  if (window.length > 0) {
    const avgVol = window.reduce((sum, c) => sum + c.volume, 0) / window.length;
    const currentVol = ha[barIndex].volume;
    const pct = Math.round((currentVol / avgVol - 1) * 100);
    if (pct > 0) {
      rationale += ` Volume is ${pct}% above the 20-bar average.`;
    }
  }
  return rationale;
}

function getIntervalMinutes(interval) {
  const num = parseInt(interval);
  if (interval.endsWith('m')) return num;
  if (interval.endsWith('h')) return num * 60;
  if (interval.endsWith('d')) return num * 24 * 60;
  return 15;
}

// Fetch historical futures klines from Binance Futures API paginated up to `days` history
async function fetchFuturesKlines(symbol, interval, days = 180) {
  const binanceInterval = interval.toLowerCase();
  const limit = 1000;
  const intervalMinutes = getIntervalMinutes(interval);
  const totalBars = Math.floor((days * 24 * 60) / intervalMinutes);
  
  let allBars = [];
  let endTime = null;
  
  console.log(`Fetching ${days} days of futures history for ${symbol} ${interval} (target: ~${totalBars} bars)...`);
  
  while (allBars.length < totalBars) {
    let url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${binanceInterval}&limit=${limit}`;
    if (endTime) {
      url += `&endTime=${endTime}`;
    }
    
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Binance Futures API error status: ${res.status}`);
    }
    
    const rows = await res.json();
    if (!rows || rows.length === 0) {
      break;
    }
    
    allBars = rows.concat(allBars);
    endTime = rows[0][0] - 1; // get older bars before this one
    
    if (rows.length < limit) {
      break;
    }
  }
  
  console.log(`Successfully fetched ${allBars.length} total candles representing history.`);

  return allBars.map(r => ({
    open_time: new Date(r[0]).toISOString(),
    open:      parseFloat(r[1]),
    high:      parseFloat(r[2]),
    low:       parseFloat(r[3]),
    close:     parseFloat(r[4]),
    volume:    parseFloat(r[5]),
  }));
}

async function upsertSignalsSafe(dbPayload) {
  if (!dbPayload || dbPayload.length === 0) return;
  const sym = dbPayload[0].symbol;
  const tf = dbPayload[0].interval;

  console.log(`Checking existing signals for ${sym} ${tf} in database...`);
  // 1. Fetch existing signals for this symbol and interval
  const { data: existing, error } = await supabaseAdmin
    .from('signals')
    .select('bar_time, entry_price, close_price')
    .eq('symbol', sym)
    .eq('interval', tf);

  if (error) {
    throw error;
  }

  const existingMap = new Map();
  if (existing) {
    existing.forEach(row => {
      const key = new Date(row.bar_time).getTime();
      existingMap.set(key, row);
    });
  }

  const toInsert = [];
  const toUpdate = [];

  dbPayload.forEach(item => {
    const itemKey = new Date(item.bar_time).getTime();
    if (!existingMap.has(itemKey)) {
      toInsert.push(item);
    } else {
      const existingRow = existingMap.get(itemKey);
      // Only update if close_price changed
      if (item.close_price !== existingRow.close_price) {
        toUpdate.push(item);
      }
    }
  });

  if (toInsert.length > 0) {
    console.log(`Inserting ${toInsert.length} new signals for ${sym} ${tf}...`);
    const { error: insErr } = await supabaseAdmin.from('signals').insert(toInsert);
    if (insErr) {
      console.error('[upsertSignalsSafe] Insert error:', insErr.message);
    } else {
      console.log(`Successfully inserted ${toInsert.length} signals.`);
    }
  } else {
    console.log(`No new signals to insert for ${sym} ${tf}.`);
  }

  if (toUpdate.length > 0) {
    console.log(`Updating ${toUpdate.length} closed signals for ${sym} ${tf}...`);
    for (const item of toUpdate) {
      const { error: updErr } = await supabaseAdmin
        .from('signals')
        .update({
          close_price: item.close_price,
          close_reason: item.close_reason,
          closed_at: item.closed_at,
          pnl_pct: item.pnl_pct,
          is_win: item.is_win
        })
        .eq('symbol', sym)
        .eq('interval', tf)
        .eq('bar_time', item.bar_time);
      if (updErr) {
        console.error(`[upsertSignalsSafe] Update error for bar_time ${item.bar_time}:`, updErr.message);
      }
    }
    console.log(`Successfully updated ${toUpdate.length} signals.`);
  } else {
    console.log(`No signals to update for ${sym} ${tf}.`);
  }
}

async function main() {
  console.log('--- Sanddock Futures Signals Fetcher Starting ---');
  
  // Use dynamic import for the ES module signal engine
  const signalEnginePath = path.join(__dirname, '..', 'src', 'lib', 'signalsEngineLive.js');
  const signalEngineUrl = `file://${signalEnginePath.replace(/\\/g, '/')}`;
  console.log(`Importing signal engine from: ${signalEngineUrl}`);
  
  const { toHeikinAshi, detectSwings } = await import(signalEngineUrl);
  
  const symbols = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT', 
    'TRXUSDT', 'DOGEUSDT', 'HBARUSDT', 'UNIUSDT', 'SUIUSDT', 
    'AVAXUSDT', 'AAVEUSDT', 'JUPUSDT', 'PUMPUSDT', 'ARBUSDT'
  ];
  const timeframes = ['15m', '1h', '4h'];
  
  for (const symbol of symbols) {
    for (const tf of timeframes) {
      try {
        console.log(`\n==================================================`);
        console.log(`Processing ${symbol} on interval ${tf}...`);
        
        const candles = await fetchFuturesKlines(symbol, tf, 180);
        console.log(`Fetched ${candles.length} candles.`);
        
        const ha = toHeikinAshi(candles);
        const swings = detectSwings(ha, 10, 'Intraday');
        console.log(`Detected ${swings.length} total swing events.`);
        
        const entrySwings = swings.filter(s => s.action === 'new');
        console.log(`Found ${entrySwings.length} new entry swings.`);
        
        const dbPayload = [];
        
        entrySwings.forEach((s, idx) => {
          const isBuy = s.type === 'bot';
          let closePrice = null;
          let closeReason = null;
          let pnlPct = null;
          let isWin = null;
          let closedAt = null;

          if (idx < entrySwings.length - 1) {
            const nextSig = entrySwings[idx + 1];
            closePrice = nextSig.price;
            closeReason = 'direction_flip';
            closedAt = nextSig.bar_time;
            
            let change = ((nextSig.price - s.price) / s.price) * 100;
            pnlPct = Number((isBuy ? change : -change).toFixed(4));
            isWin = pnlPct >= 0;
          }

          const barIndex = ha.findIndex(c => c.open_time === s.bar_time);
          const confidence = computeConfidence(ha, barIndex >= 0 ? barIndex : ha.length - 1);
          const rationale = generateRationale(symbol, s.type, tf, barIndex >= 0 ? barIndex : ha.length - 1, ha);
          
          const sigId = generateDeterministicUUID(symbol, tf, s.bar_time);

          const signalObj = {
            id: sigId,
            symbol: symbol,
            interval: tf,
            signal_type: isBuy ? 'buy' : 'sell',
            action: 'new',
            entry_price: s.price,
            bar_time: s.bar_time,
            confidence: confidence,
            rationale: rationale,
            sl_price: s.sl_price,
            tp_price: s.tp2_price,
            sl_pct: s.sl_price ? Number((Math.abs(s.sl_price - s.price) / s.price * 100).toFixed(2)) : 0,
            tp_pct: s.tp2_price ? Number((Math.abs(s.tp2_price - s.price) / s.price * 100).toFixed(2)) : 0,
            closed_at: closedAt,
            close_price: closePrice,
            pnl_pct: pnlPct,
            is_win: isWin,
            swing_group_id: crypto.randomUUID(),
            close_reason: closeReason,
            created_at: s.bar_time,
          };

          dbPayload.push(signalObj);
        });
        
        if (dbPayload.length > 0) {
          await upsertSignalsSafe(dbPayload);
        } else {
          console.log(`No payload to upsert for ${tf}`);
        }
        
      } catch (err) {
        console.error(`Error processing ${symbol} ${tf}:`, err);
      }
    }
  }
  
  console.log('\n--- Fetcher Run Completed ---');
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
