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
    // Get open signals
    const { data: openSignals } = await supabaseAdmin
      .from('signals')
      .select('id, symbol, interval, bar_time, action, close_reason, closed_at, pnl_pct')
      .is('closed_at', null)
      .order('bar_time', { ascending: false })
      .limit(10);

    // Get latest signals per coin
    const { data: latestSignals } = await supabaseAdmin
      .from('signals')
      .select('symbol, interval, bar_time, action, closed_at, pnl_pct')
      .eq('interval', '1h')
      .order('bar_time', { ascending: false })
      .limit(10);

    // Get candle count
    const { data: cangleCounts } = await supabaseAdmin
      .from('ohlcv_cache')
      .select('symbol')
      .in('symbol', ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'])
      .eq('interval', '1h');

    return NextResponse.json({
      openSignals,
      latestSignals,
      candleCount: cangleCounts?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
