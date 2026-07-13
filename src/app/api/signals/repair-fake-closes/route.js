import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

// One-time repair for the fabricated-close bug (see commit "Fix root cause of
// inflated performance numbers"). For each symbol's latest-bar_time signal,
// if it was falsely closed by the old buggy catchUpSignals() — signature:
// close_reason !== 'swing_opposite' AND closed_at === bar_time (the
// placeholder calculateCloses() produces for a still-open trailing signal) —
// revert it back to live (closed_at/pnl_pct/is_win = null).
export async function GET(request) {
  const results = {};
  for (const symbol of ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']) {
    const { data: latest } = await supabaseAdmin
      .from('signals')
      .select('*')
      .eq('symbol', symbol)
      .eq('interval', '30m')
      .order('bar_time', { ascending: false })
      .limit(1);

    const sig = latest?.[0];
    if (!sig) {
      results[symbol] = { status: 'no_signal' };
      continue;
    }

    const isFakeClose =
      sig.closed_at !== null &&
      sig.close_reason !== 'swing_opposite' &&
      new Date(sig.closed_at).getTime() === new Date(sig.bar_time).getTime();

    if (!isFakeClose) {
      results[symbol] = { status: 'not_fake', bar_time: sig.bar_time, closed_at: sig.closed_at, close_reason: sig.close_reason };
      continue;
    }

    const { error } = await supabaseAdmin
      .from('signals')
      .update({ closed_at: null, pnl_pct: null, is_win: null })
      .eq('id', sig.id);

    results[symbol] = {
      status: error ? 'error' : 'reverted',
      error: error?.message,
      bar_time: sig.bar_time,
      was_pnl: sig.pnl_pct
    };
  }
  return NextResponse.json(results);
}
