import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const interval = searchParams.get('interval') || '15m';

    // Get signal count by interval
    const { data: signals, error: sigErr } = await supabaseAdmin
      .from('signals')
      .select('id, bar_time, pnl_pct, is_win, interval, symbol', { count: 'exact' })
      .eq('symbol', symbol.toUpperCase())
      .eq('interval', interval)
      .order('bar_time', { ascending: false })
      .limit(100);

    if (sigErr) {
      return NextResponse.json({ error: sigErr.message }, { status: 500 });
    }

    // Get 1 week data
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: weekSignals } = await supabaseAdmin
      .from('signals')
      .select('id, pnl_pct, is_win, bar_time')
      .eq('symbol', symbol.toUpperCase())
      .eq('interval', interval)
      .gte('bar_time', oneWeekAgo);

    // Calculate 1-week metrics
    let weekPnl = 0;
    let weekWins = 0;
    let weekLosses = 0;
    if (weekSignals && weekSignals.length > 0) {
      const completed = weekSignals.filter(s => s.pnl_pct !== null && s.pnl_pct !== undefined);
      weekPnl = completed.reduce((sum, s) => sum + parseFloat(s.pnl_pct), 0);
      weekWins = completed.filter(s => s.is_win === true).length;
      weekLosses = completed.filter(s => s.is_win === false).length;
    }

    const data = {
      symbol: symbol.toUpperCase(),
      interval,
      status: signals && signals.length > 0 ? '✓ Data present' : '⚠️ No data',
      total_signals: signals ? signals.length : 0,
      latest_signal: signals && signals.length > 0 ? signals[0].bar_time : null,
      earliest_signal: signals && signals.length > 0 ? signals[signals.length - 1].bar_time : null,
      week_metrics: {
        total_trades: weekSignals ? weekSignals.length : 0,
        wins: weekWins,
        losses: weekLosses,
        win_rate: weekSignals && weekSignals.length > 0 ? `${(weekWins / weekSignals.length * 100).toFixed(1)}%` : '0%',
        pnl: `${weekPnl.toFixed(2)}%`,
      },
      sample_signals: signals ? signals.slice(0, 5).map(s => ({
        bar_time: s.bar_time,
        pnl: s.pnl_pct,
        is_win: s.is_win,
      })) : [],
    };

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  } catch (err) {
    console.error('[/api/debug/data-sync] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
