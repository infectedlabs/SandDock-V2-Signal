import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

export async function GET(request) {
  try {
    const targetTime = '2026-07-12T08:00:00';
    const lookbackMinutes = 150; // 5 * 30m
    const lookbackStart = new Date(new Date(targetTime).getTime() - lookbackMinutes * 60 * 1000);

    const results = {};

    for (const symbol of ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']) {
      // Test 1: Count total candles
      const { data: allCandles, error: allError } = await supabaseAdmin
        .from('ohlcv_cache')
        .select('count', { count: 'exact', head: true })
        .eq('symbol', symbol)
        .eq('interval', '30m');

      // Test 2: Get candles from lookbackStart onwards
      const { data: candlesFromLookback, error: lookbackError } = await supabaseAdmin
        .from('ohlcv_cache')
        .select('open_time')
        .eq('symbol', symbol)
        .eq('interval', '30m')
        .gte('open_time', lookbackStart.toISOString())
        .order('open_time', { ascending: true })
        .limit(20);

      // Test 3: Get the oldest candle for this symbol
      const { data: oldestCandle, error: oldestError } = await supabaseAdmin
        .from('ohlcv_cache')
        .select('open_time')
        .eq('symbol', symbol)
        .eq('interval', '30m')
        .order('open_time', { ascending: true })
        .limit(1);

      results[symbol] = {
        totalCount: allCandles?.[0]?.count || 0,
        candlesFromLookback: candlesFromLookback?.length || 0,
        lookbackStart: lookbackStart.toISOString(),
        targetTime,
        oldestCandle: oldestCandle?.[0]?.open_time || null,
        errors: {
          all: allError?.message,
          lookback: lookbackError?.message,
          oldest: oldestError?.message
        }
      };
    }

    return NextResponse.json({
      results,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
