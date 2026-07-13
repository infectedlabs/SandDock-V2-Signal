import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

export async function GET(request) {
  const openBarTime = new Date('2026-07-12T08:00:00Z');
  const lookbackStart = new Date(openBarTime.getTime() - 60 * 30 * 60 * 1000);

  const { data: candles } = await supabaseAdmin
    .from('ohlcv_cache')
    .select('open_time')
    .eq('symbol', 'ETHUSDT')
    .eq('interval', '30m')
    .gte('open_time', lookbackStart.toISOString())
    .order('open_time', { ascending: true })
    .limit(500);

  // Detect gaps (expect 30-minute spacing)
  const gaps = [];
  for (let i = 1; i < (candles?.length || 0); i++) {
    const prev = new Date(candles[i - 1].open_time).getTime();
    const curr = new Date(candles[i].open_time).getTime();
    const diffMin = (curr - prev) / 60000;
    if (diffMin !== 30) {
      gaps.push({ from: candles[i - 1].open_time, to: candles[i].open_time, diffMin });
    }
  }

  return NextResponse.json({
    lookbackStart: lookbackStart.toISOString(),
    openBarTime: openBarTime.toISOString(),
    totalCandles: candles?.length || 0,
    first: candles?.[0]?.open_time,
    last: candles?.[candles.length - 1]?.open_time,
    gaps
  });
}
