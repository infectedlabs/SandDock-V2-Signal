import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { memoryCache, runWithTimeout } from '@/lib/memoryCache';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

export const dynamic = 'force-dynamic';

// ── Heikin Ashi computation ────────────────────────────────────────────────────
function computeHA(candles) {
  const ha = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen  = i === 0
      ? (c.open + c.close) / 2
      : (ha[i - 1].ha_open + ha[i - 1].ha_close) / 2;
    const haHigh  = Math.max(c.high, haOpen, haClose);
    const haLow   = Math.min(c.low,  haOpen, haClose);
    ha.push({ ...c, ha_open: haOpen, ha_high: haHigh, ha_low: haLow, ha_close: haClose });
  }
  return ha;
}

import { fetchFromBinance } from '@/lib/binanceFallback';

// ── Fetch candles wrapper for local HA ────────────────────────────────────────
async function getHACandles(symbol, interval, limit) {
  const candles = await fetchFromBinance(symbol, interval, limit);
  return computeHA(candles);
}

// ── GET /api/chart/candles ─────────────────────────────────────────────────────
export async function GET(request) {
  let symbol = 'BTCUSDT';
  let interval = '30m';
  let limit = 500;

  try {
    const { searchParams } = new URL(request.url);
    symbol   = (searchParams.get('symbol')   || 'BTCUSDT').toUpperCase();
    interval = searchParams.get('interval')  || '30m';
    limit    = Math.min(parseInt(searchParams.get('limit') || '500'), 1000);

    const candles = await getHACandles(symbol, interval, limit);

    // Save to server-side in-memory cache
    memoryCache.candles[`${symbol}_${interval}`] = candles;

    // Asynchronously upsert to database cache (no await to prevent blocking API response)
    try {
      const dbPayload = candles.map(c => ({
        symbol,
        interval,
        open_time: c.open_time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        ha_open: c.ha_open,
        ha_high: c.ha_high,
        ha_low: c.ha_low,
        ha_close: c.ha_close
      }));
      runWithTimeout(
        supabaseAdmin.from('ohlcv_cache').upsert(dbPayload, { onConflict: 'symbol,interval,open_time' }),
        800
      ).catch((e) => console.warn('[/api/chart/candles] DB cache write timed out/failed:', e.message));
    } catch (dbErr) {
      console.error('[/api/chart/candles] DB cache payload mapping error:', dbErr);
    }

    return NextResponse.json(candles, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  } catch (err) {
    console.error('[/api/chart/candles] Binance fetch failed, reading cache:', err.message);
    
    // 1. Try to fallback to Supabase cache with a timeout
    try {
      const { data: cachedCandles, error: dbError } = await runWithTimeout(
        supabaseAdmin
          .from('ohlcv_cache')
          .select('*')
          .eq('symbol', symbol)
          .eq('interval', interval)
          .order('open_time', { ascending: false })
          .limit(limit),
        800
      );

      if (!dbError && cachedCandles && cachedCandles.length > 0) {
        const sorted = cachedCandles.map(c => ({
          open_time: c.open_time,
          open: parseFloat(c.open),
          high: parseFloat(c.high),
          low: parseFloat(c.low),
          close: parseFloat(c.close),
          volume: parseFloat(c.volume),
          ha_open: parseFloat(c.ha_open),
          ha_high: parseFloat(c.ha_high),
          ha_low: parseFloat(c.ha_low),
          ha_close: parseFloat(c.ha_close)
        })).reverse();
        return NextResponse.json(sorted, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          }
        });
      }
    } catch (fallbackErr) {
      console.warn('[/api/chart/candles] DB fallback query failed/timed out:', fallbackErr.message);
    }

    // 2. Try to fallback to memory cache
    const memoryKey = `${symbol}_${interval}`;
    const memCache = memoryCache.candles[memoryKey];
    if (memCache && memCache.length > 0) {
      console.log(`[/api/chart/candles] Serving from in-memory fallback cache for ${symbol}`);
      return NextResponse.json(memCache, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        }
      });
    }

    return NextResponse.json([], {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  }
}
