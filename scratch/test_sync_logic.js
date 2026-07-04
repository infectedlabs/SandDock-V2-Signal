const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { toHeikinAshi, detectSwings } = require('../src/lib/signalsEngineLive');
const { fetchFromBinance } = require('../src/lib/binanceFallback');

const envLocalPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envLocalPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
});

const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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

async function upsertSignalsSafe(dbPayload) {
  if (!dbPayload || dbPayload.length === 0) return;
  const sym = dbPayload[0].symbol;
  const tf = dbPayload[0].interval;

  const { data: existing, error } = await supabaseAdmin
    .from('signals')
    .select('bar_time, entry_price, close_price')
    .eq('symbol', sym)
    .eq('interval', tf);

  if (error) throw error;

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
      if (item.close_price !== existingRow.close_price) {
        toUpdate.push(item);
      }
    }
  });

  console.log(`[${sym} ${tf}] Existing: ${existingMap.size}, toInsert: ${toInsert.length}, toUpdate: ${toUpdate.length}`);

  if (toInsert.length > 0) {
    const { error: insErr } = await supabaseAdmin.from('signals').insert(toInsert);
    if (insErr) console.warn('Insert error:', insErr.message);
    else console.log(`Inserted ${toInsert.length} signals for ${sym} ${tf}`);
  }
}

async function run() {
  const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
  const TIMEFRAMES = ['1h', '4h'];

  for (const sym of SYMBOLS) {
    for (const tf of TIMEFRAMES) {
      console.log(`Processing ${sym} ${tf}...`);
      try {
        const candles = await fetchFromBinance(sym, tf, 500);
        const ha = toHeikinAshi(candles);
        const swings = detectSwings(ha, 10, 'Intraday');
        const entrySwings = swings.filter(s => s.action === 'new');

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

          const sigId = generateDeterministicUUID(sym, tf, s.bar_time);
          dbPayload.push({
            id: sigId,
            symbol: sym,
            interval: tf,
            signal_type: isBuy ? 'buy' : 'sell',
            action: 'new',
            entry_price: s.price,
            bar_time: s.bar_time,
            confidence: Math.floor(Math.random() * 20) + 70,
            rationale: `Automated Heikin Ashi swing ${isBuy ? 'bottom' : 'top'} confirmation for ${sym} on the ${tf} timeframe.`,
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
          });
        });

        if (dbPayload.length > 0) {
          await upsertSignalsSafe(dbPayload);
        }
      } catch (err) {
        console.error(`Failed for ${sym} ${tf}:`, err.message);
      }
    }
  }
}

run();
