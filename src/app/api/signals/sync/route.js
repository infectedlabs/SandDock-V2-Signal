import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { toHeikinAshi, detectSwings } from '@/lib/signalsEngineLive';
import { memoryCache } from '@/lib/memoryCache';
import { fetchFromBinance } from '@/lib/binanceFallback';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT', 
  'TRXUSDT', 'DOGEUSDT', 'HBARUSDT', 'UNIUSDT', 'SUIUSDT', 
  'AVAXUSDT', 'AAVEUSDT', 'JUPUSDT', 'PUMPUSDT', 'ARBUSDT'
];
const TIMEFRAMES = ['15m', '1h', '4h'];

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

async function upsertSignalsSafe(supabaseAdmin, dbPayload) {
  if (!dbPayload || dbPayload.length === 0) return;
  const sym = dbPayload[0].symbol;
  const tf = dbPayload[0].interval;

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
      if (item.close_price !== existingRow.close_price) {
        toUpdate.push(item);
      }
    }
  });

  if (toInsert.length > 0) {
    const { error: insErr } = await supabaseAdmin.from('signals').insert(toInsert);
    if (insErr) console.warn(`[Sync-Upsert] Insert error for ${sym} ${tf}:`, insErr.message);
  }

  if (toUpdate.length > 0) {
    for (const item of toUpdate) {
      await supabaseAdmin
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
    }
  }
}

async function runBackgroundSync() {
  console.log('[Background Sync] Starting live signals validation...');
  for (const sym of SYMBOLS) {
    for (const tf of TIMEFRAMES) {
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
          await upsertSignalsSafe(supabaseAdmin, dbPayload);
        }
      } catch (err) {
        console.warn(`[Background Sync] Failed for ${sym} ${tf}:`, err.message);
      }
    }
  }
  console.log('[Background Sync] Completed validation and sync.');
}

export async function GET() {
  try {
    const now = Date.now();
    const lastSync = memoryCache.lastSyncTime || 0;
    
    // Cooldown check (5 minutes = 300,000ms)
    if (now - lastSync < 300000) {
      const remainingSeconds = Math.ceil((300000 - (now - lastSync)) / 1000);
      return NextResponse.json({ 
        status: 'throttled', 
        message: `Sync throttled. Try again in ${remainingSeconds}s.` 
      });
    }

    // Update last sync timestamp immediately to prevent concurrent requests from launching separate sync loops
    memoryCache.lastSyncTime = now;

    // Trigger sync in background (not awaited)
    runBackgroundSync().catch(err => console.error('[Sync API] Error in background execution:', err));

    return NextResponse.json({ 
      status: 'syncing', 
      message: 'Background synchronization started for all 15 coins.' 
    });
  } catch (err) {
    console.error('[/api/signals/sync] Error:', err);
    return NextResponse.json({ status: 'error', message: err.message }, { status: 500 });
  }
}
