import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { memoryCache, runWithTimeout } from '@/lib/memoryCache';
import { toHeikinAshi, detectSwings } from '@/lib/signalsEngineLive';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

export const dynamic = 'force-dynamic';

const PLAN_SYMBOLS = {
  free:   ['BTCUSDT'],
  pro:    ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
  master: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
};

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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const plan          = searchParams.get('plan') || 'free';
    const symbol        = searchParams.get('symbol');
    const signal_type   = searchParams.get('signal_type');
    const interval      = searchParams.get('interval') || '15m';
    const limit         = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const allowedSymbols = PLAN_SYMBOLS[plan] ?? PLAN_SYMBOLS['free'];
    const targetSymbols = symbol ? [symbol.toUpperCase()] : allowedSymbols;

    const oneDayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const allSignals = [];

    const timeframes = ['15m', '30m', '1h', '4h'];

    await Promise.all(targetSymbols.flatMap((sym) =>
      timeframes.map(async (tf) => {
        const cacheKey = `${sym}_${tf}`;
        try {
          // 1. Try to fetch active signals from database first
          const { data: dbSignals, error: dbError } = await runWithTimeout(
            supabaseAdmin
              .from('signals')
              .select('*')
              .eq('symbol', sym.toUpperCase())
              .eq('interval', tf)
              .or(`close_reason.is.null,created_at.gte.${oneDayAgoIso}`)
              .order('bar_time', { ascending: false })
              .limit(15),
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
            memoryCache.live[cacheKey] = formatted;
            
            formatted.forEach(sigObj => {
              if (tf === interval) {
                allSignals.push(sigObj);
              }
            });
            return;
          }

          // 2. Fallback to calculation
          const candles = await fetchFromBinance(sym, tf, 500);
          const ha = toHeikinAshi(candles);
          const swings = detectSwings(ha, 10, 'Intraday', tf);

          const symSignals = [];
          swings.forEach((s) => {
            // We only care about active/latest signal events
            if (s.action === 'new' || s.action === 'slide') {
              const barIndex = ha.findIndex(c => c.open_time === s.bar_time);
              


              const conf = computeConfidence(ha, barIndex >= 0 ? barIndex : ha.length - 1);
              const rat = generateRationale(sym, s.type, tf, barIndex >= 0 ? barIndex : ha.length - 1, ha);

              const sigObj = {
                id: generateDeterministicUUID(sym, tf, s.bar_time),
                symbol: sym,
                interval: tf,
                signal_type: s.type === 'bot' ? 'buy' : 'sell',
                action: s.action,
                bar_time: s.bar_time,
                entry_price: s.price,
                sl_price: s.sl_price,
                tp_price: s.tp2_price,
                sl_pct: s.sl_price ? Number((Math.abs(s.sl_price - s.price) / s.price * 100).toFixed(2)) : 0,
                tp_pct: s.tp2_price ? Number((Math.abs(s.tp2_price - s.price) / s.price * 100).toFixed(2)) : 0,
                confidence: conf,
                rationale: rat,
                created_at: s.bar_time,
                swing_group_id: crypto.randomUUID(),
              };
              symSignals.push(sigObj);
              if (tf === interval) {
                allSignals.push(sigObj);
              }
            }
          });

          // Save to server-side in-memory cache
          memoryCache.live[cacheKey] = symSignals;
        } catch (err) {
          console.warn(`[/api/signals/live] Binance fetch failed for ${sym} ${tf}, reading cache:`, err.message);
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
                .limit(5),
              800
            );

            if (!dbError && cachedSignals && cachedSignals.length > 0) {
              loadedFromDb = true;
              cachedSignals.forEach(sig => {
                const sigObj = {
                  id: sig.id || generateDeterministicUUID(sig.symbol, sig.interval, sig.bar_time),
                  symbol: sig.symbol,
                  interval: sig.interval,
                  signal_type: sig.signal_type,
                  action: sig.action || 'new',
                  bar_time: sig.bar_time,
                  entry_price: parseFloat(sig.entry_price),
                  sl_price: sig.sl_price ? parseFloat(sig.sl_price) : null,
                  tp_price: sig.tp_price ? parseFloat(sig.tp_price) : null,
                  sl_pct: sig.sl_pct ? parseFloat(sig.sl_pct) : 0,
                  tp_pct: sig.tp_pct ? parseFloat(sig.tp_pct) : 0,
                  confidence: sig.confidence || 80,
                  rationale: sig.rationale,
                  created_at: sig.bar_time,
                  swing_group_id: sig.swing_group_id || crypto.randomUUID(),
                };
                if (tf === interval) {
                  allSignals.push(sigObj);
                }
              });
            }
          } catch (dbErr) {
            console.warn(`[/api/signals/live] DB query fallback failed/timed out for ${sym} ${tf}:`, dbErr.message);
          }

          // 2. Fallback to server memory cache
          if (!loadedFromDb) {
            const memCache = memoryCache.live[cacheKey];
            if (memCache && memCache.length > 0) {
              console.log(`[/api/signals/live] Serving from in-memory fallback cache for ${sym} ${tf}`);
              if (tf === interval) {
                allSignals.push(...memCache);
              }
            }
          }
        }
      })
    ));

    // Filter by signal_type if requested
    let filtered = allSignals;
    if (signal_type) {
      filtered = filtered.filter(s => s.signal_type === signal_type.toLowerCase());
    }

    // Sort by created_at descending (latest first) and apply limit
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const result = filtered.slice(0, limit);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  } catch (err) {
    console.error('[/api/signals/live] Error:', err);
    return NextResponse.json([], {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  }
}
