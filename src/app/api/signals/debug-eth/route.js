import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

export async function GET(request) {
  const results = {};
  for (const symbol of ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']) {
    const { data: latest } = await supabaseAdmin
      .from('ohlcv_cache')
      .select('open_time')
      .eq('symbol', symbol)
      .eq('interval', '30m')
      .order('open_time', { ascending: false })
      .limit(1);
    results[symbol] = latest?.[0]?.open_time || 'NONE';
  }
  return NextResponse.json({ latestCandlePerSymbol: results, now: new Date().toISOString() });
}
