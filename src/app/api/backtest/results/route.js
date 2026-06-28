import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

// ── GET /api/backtest/results ───────────────────────────────────────────────────
// Returns pre-computed backtest results (from backtest_worker.py).
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol   = searchParams.get('symbol')    || 'BTCUSDT';
    const interval = searchParams.get('interval')  || '15m';
    const page     = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(parseInt(searchParams.get('page_size') || '50'), 100);
    const offset   = (page - 1) * pageSize;

    const { data, error } = await supabaseAdmin
      .from('backtest_results')
      .select(`
        entry_time, entry_price, exit_time, exit_price,
        sl_price, tp_price, close_reason, pnl_pct, is_win,
        signal_type, duration_bars
      `)
      .eq('symbol', symbol)
      .eq('interval', interval)
      .order('entry_time', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('[/api/backtest/results] Error:', err);
    return NextResponse.json([], { status: 200 });
  }
}
