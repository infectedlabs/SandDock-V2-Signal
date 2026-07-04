import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { toHeikinAshi, detectSwings } from '@/lib/signalsEngineLive';
import { memoryCache, runWithTimeout } from '@/lib/memoryCache';

export const dynamic = 'force-dynamic';

const PLAN_SYMBOLS = {
  free:   ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT', 'TRXUSDT', 'DOGEUSDT', 'HBARUSDT', 'UNIUSDT', 'SUIUSDT', 'AVAXUSDT', 'AAVEUSDT', 'JUPUSDT', 'PUMPUSDT', 'ARBUSDT'],
  pro:    ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT', 'TRXUSDT', 'DOGEUSDT', 'HBARUSDT', 'UNIUSDT', 'SUIUSDT', 'AVAXUSDT', 'AAVEUSDT', 'JUPUSDT', 'PUMPUSDT', 'ARBUSDT'],
  master: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT', 'TRXUSDT', 'DOGEUSDT', 'HBARUSDT', 'UNIUSDT', 'SUIUSDT', 'AVAXUSDT', 'AAVEUSDT', 'JUPUSDT', 'PUMPUSDT', 'ARBUSDT'],
};

import { createClient } from '@supabase/supabase-js';
import { fetchFromBinance } from '@/lib/binanceFallback';

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

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const plan      = searchParams.get('plan') || 'free';
    const symbol    = searchParams.get('symbol');
    const interval  = searchParams.get('interval') || '15m';
    const page      = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize  = Math.min(parseInt(searchParams.get('page_size') || '50'), 100);
    const offset    = (page - 1) * pageSize;

    const allowedSymbols = PLAN_SYMBOLS[plan] ?? PLAN_SYMBOLS['free'];
    const targetSymbols = symbol ? [symbol.toUpperCase()] : allowedSymbols;

    const allLogs = [];

    const timeframes = ['15m', '1h', '4h'];

    await Promise.all(targetSymbols.flatMap((sym) =>
      timeframes.map(async (tf) => {
        const cacheKey = `${sym}_${tf}`;
        try {
          // 1. Try to fetch from database first
          const { data: dbSignals, error: dbError } = await runWithTimeout(
            supabaseAdmin
              .from('signals')
              .select('*')
              .eq('symbol', sym.toUpperCase())
              .eq('interval', tf)
              .order('bar_time', { ascending: false })
              .limit(100),
            1200
          );

          if (!dbError && dbSignals && dbSignals.length > 0) {
            const formatted = dbSignals.map(sig => ({
              id: sig.id || generateDeterministicUUID(sig.symbol, sig.interval, sig.bar_time),
              ...sig,
              entry_price: parseFloat(sig.entry_price),
              close_price: sig.close_price ? parseFloat(sig.close_price) : null,
              sl_price: sig.sl_price ? parseFloat(sig.sl_price) : null,
              tp_price: sig.tp_price ? parseFloat(sig.tp_price) : null,
              pnl_pct: sig.pnl_pct ? parseFloat(sig.pnl_pct) : null,
              sl_pct: sig.sl_pct ? parseFloat(sig.sl_pct) : 0,
              tp_pct: sig.tp_pct ? parseFloat(sig.tp_pct) : 0,
            }));
            
            // Save to memory cache
            memoryCache.log[cacheKey] = formatted;
            
            formatted.forEach(logObj => {
              if (tf === interval) {
                allLogs.push(logObj);
              }
            });
            return;
          }

          // 2. Fallback to calculation
          const candles = await fetchFromBinance(sym, tf, 500);
          const ha = toHeikinAshi(candles);
          const swings = detectSwings(ha, 10, 'Intraday');

          const entrySwings = swings.filter(s => s.action === 'new');

          const dbPayload = [];
          const symLogs = [];

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

            const signalObj = {
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
            };

            dbPayload.push(signalObj);

            const logObj = {
              id: sigId,
              ...signalObj
            };
            symLogs.push(logObj);
            if (tf === interval) {
              allLogs.push(logObj);
            }
          });

          // Save to in-memory cache
          memoryCache.log[cacheKey] = symLogs;

          if (dbPayload.length > 0) {
            runWithTimeout(
              upsertSignalsSafe(supabaseAdmin, dbPayload),
              2000
            ).catch((e) => console.warn(`[/api/signals/log] safe upsert failed/timed out for ${sym} ${tf}:`, e.message));
          }
        } catch (err) {
          console.warn(`[/api/signals/log] Binance fetch failed for ${sym} ${tf}, reading cache:`, err.message);
          let loadedFromDb = false;

          // 1. Fallback to Supabase cache with a timeout
          try {
            const { data: cachedSignals, error: dbError } = await runWithTimeout(
              supabaseAdmin
                .from('signals')
                .select('*')
                .eq('symbol', sym)
                .eq('interval', tf)
                .order('bar_time', { ascending: false })
                .limit(50),
              800
            );

            if (!dbError && cachedSignals && cachedSignals.length > 0) {
              loadedFromDb = true;
              cachedSignals.forEach(sig => {
                const logObj = {
                  id: sig.id || generateDeterministicUUID(sig.symbol, sig.interval, sig.bar_time),
                  ...sig,
                  entry_price: parseFloat(sig.entry_price),
                  close_price: sig.close_price ? parseFloat(sig.close_price) : null,
                  sl_price: sig.sl_price ? parseFloat(sig.sl_price) : null,
                  tp_price: sig.tp_price ? parseFloat(sig.tp_price) : null,
                  pnl_pct: sig.pnl_pct ? parseFloat(sig.pnl_pct) : null,
                };
                if (tf === interval) {
                  allLogs.push(logObj);
                }
              });
            }
          } catch (dbErr) {
            console.warn(`[/api/signals/log] DB query fallback failed/timed out for ${sym} ${tf}:`, dbErr.message);
          }

          // 2. Fallback to server memory cache
          if (!loadedFromDb) {
            const memCache = memoryCache.log[cacheKey];
            if (memCache && memCache.length > 0) {
              console.log(`[/api/signals/log] Serving from in-memory fallback cache for ${sym} ${tf}`);
              if (tf === interval) {
                allLogs.push(...memCache);
              }
            }
          }
        }
      })
    ));

    // Sort by created_at descending
    allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Paginate
    const paginated = allLogs.slice(offset, offset + pageSize);

    return NextResponse.json(paginated, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  } catch (err) {
    console.error('[/api/signals/log] Error:', err);
    return NextResponse.json([], {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  }
}

async function upsertSignalsSafe(supabaseAdmin, dbPayload) {
  if (!dbPayload || dbPayload.length === 0) return;
  const sym = dbPayload[0].symbol;
  const tf = dbPayload[0].interval;

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
    const { error: insErr } = await supabaseAdmin.from('signals').insert(toInsert);
    if (insErr) console.warn('[upsertSignalsSafe] Insert error:', insErr.message);
  }

  if (toUpdate.length > 0) {
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
      if (updErr) console.warn('[upsertSignalsSafe] Update error:', updErr.message);
    }
  }
}
