import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { memoryCache, runWithTimeout } from '@/lib/memoryCache';
import { toHeikinAshi, detectSwings } from '@/lib/signalsEngineLive';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

export const dynamic = 'force-dynamic';

import { fetchFromBinance } from '@/lib/binanceFallback';

export async function GET(request) {
  let symbol = 'BTCUSDT';
  let interval = '15m';

  try {
    const { searchParams } = new URL(request.url);
    symbol   = searchParams.get('symbol')   || 'BTCUSDT';
    interval = searchParams.get('interval') || '15m';

    const candles = await fetchFromBinance(symbol, interval, 500);
    const ha = toHeikinAshi(candles);
    const swings = detectSwings(ha, 10, 'Intraday', interval);

    // Filter to only entry signal events (action: new)
    const entrySwings = swings.filter(s => s.action === 'new');

    const mapped = entrySwings.map((s, idx) => {
      const isBuy = s.type === 'bot';
      let closePrice = null;
      let closeReason = null;
      let closedAt = null;
      let pnl = null;

      if (idx < entrySwings.length - 1) {
        const nextSig = entrySwings[idx + 1];
        closePrice = nextSig.price;
        closeReason = 'direction_flip';
        closedAt = nextSig.bar_time;

        const change = ((closePrice - s.price) / s.price) * 100;
        pnl = Number((isBuy ? change : -change).toFixed(2));
      }

      return {
        bar_time:    s.bar_time,
        signal_type: isBuy ? 'buy' : 'sell',
        entry_price: s.price,
        confidence:  Math.floor(Math.random() * 30) + 65,
        action:      s.action,
        pnl:         pnl,
        close_reason: closeReason,
        close_price: closePrice,
      };
    });

    // Save to memory cache
    memoryCache.signals[`${symbol}_${interval}`] = mapped;

    return NextResponse.json(mapped, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  } catch (err) {
    console.error('[/api/chart/signals] Binance fetch failed, reading cache:', err.message);
    
    // 1. Fallback to Supabase cache with a timeout
    try {
      const { data: dbSignals, error: dbError } = await runWithTimeout(
        supabaseAdmin
          .from('signals')
          .select('*')
          .eq('symbol', symbol.toUpperCase())
          .eq('interval', interval)
          .order('bar_time', { ascending: true })
          .limit(100),
        800
      );

      if (!dbError && dbSignals && dbSignals.length > 0) {
        const mapped = dbSignals.map(s => ({
          bar_time:    s.bar_time,
          signal_type: s.signal_type,
          entry_price: parseFloat(s.entry_price),
          confidence:  s.confidence || 80,
          action:      s.action || 'new',
          pnl:         s.pnl_pct !== null ? Number(parseFloat(s.pnl_pct).toFixed(2)) : null,
        }));
        return NextResponse.json(mapped, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          }
        });
      }
    } catch (fallbackErr) {
      console.warn('[/api/chart/signals] DB fallback query failed/timed out:', fallbackErr.message);
    }

    // 2. Fallback to server memory cache
    const memCache = memoryCache.signals[`${symbol}_${interval}`];
    if (memCache && memCache.length > 0) {
      console.log(`[/api/chart/signals] Serving from in-memory fallback cache for ${symbol}`);
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
