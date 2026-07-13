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

    // Get candles from BTCUSDT after the target time
    const { data: candlesAfter } = await supabaseAdmin
      .from('ohlcv_cache')
      .select('open_time, close, ha_high, ha_low')
      .eq('symbol', 'BTCUSDT')
      .eq('interval', '30m')
      .gte('open_time', targetTime)
      .order('open_time', { ascending: true })
      .limit(20);

    // Get last candle before target time
    const { data: candlesBefore } = await supabaseAdmin
      .from('ohlcv_cache')
      .select('open_time, close, ha_high, ha_low')
      .eq('symbol', 'BTCUSDT')
      .eq('interval', '30m')
      .lt('open_time', targetTime)
      .order('open_time', { ascending: false })
      .limit(10);

    return NextResponse.json({
      targetTime,
      candlesAfter: candlesAfter?.length || 0,
      candlesList: candlesAfter,
      candlesBefore: candlesBefore?.length || 0,
      candles_before_list: candlesBefore,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
