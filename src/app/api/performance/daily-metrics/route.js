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
    const days = parseInt(searchParams.get('days') || '7'); // Last N days

    // Fetch signals from last N days
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data: signals, error } = await supabaseAdmin
      .from('signals')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .eq('interval', interval)
      .gte('bar_time', startDate)
      .order('bar_time', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!signals || signals.length === 0) {
      return NextResponse.json({
        symbol: symbol.toUpperCase(),
        interval,
        period_days: days,
        daily_metrics: [],
        weekly_summary: {
          total_trades: 0,
          wins: 0,
          losses: 0,
          win_rate: '0%',
          total_pnl: '0.00%',
          avg_daily_pnl: '0.00%',
        },
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        }
      });
    }

    // Group signals by day
    const byDay = {};
    signals.forEach(sig => {
      const day = new Date(sig.bar_time).toISOString().split('T')[0];
      if (!byDay[day]) {
        byDay[day] = [];
      }
      byDay[day].push(sig);
    });

    // Calculate daily metrics
    const dailyMetrics = Object.entries(byDay).map(([day, daySigs]) => {
      const completed = daySigs.filter(s => s.pnl_pct !== null && s.pnl_pct !== undefined);
      const wins = completed.filter(s => s.is_win === true).length;
      const losses = completed.filter(s => s.is_win === false).length;
      const dailyPnl = completed.reduce((sum, s) => sum + parseFloat(s.pnl_pct), 0);
      const winRate = completed.length > 0 ? (wins / completed.length * 100).toFixed(1) : '0';

      return {
        date: day,
        trades: completed.length,
        wins,
        losses,
        win_rate: `${winRate}%`,
        pnl: `${dailyPnl.toFixed(2)}%`,
        pnl_numeric: dailyPnl,
        signal_count: daySigs.length,
      };
    });

    // Calculate weekly summary
    const allCompleted = signals.filter(s => s.pnl_pct !== null && s.pnl_pct !== undefined);
    const totalWins = allCompleted.filter(s => s.is_win === true).length;
    const totalLosses = allCompleted.filter(s => s.is_win === false).length;
    const totalPnl = allCompleted.reduce((sum, s) => sum + parseFloat(s.pnl_pct), 0);
    const weeklyWinRate = allCompleted.length > 0 ? (totalWins / allCompleted.length * 100).toFixed(1) : '0';
    const avgDailyPnl = dailyMetrics.length > 0 ? (dailyMetrics.reduce((sum, d) => sum + d.pnl_numeric, 0) / dailyMetrics.length).toFixed(2) : '0.00';

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      interval,
      period_days: days,
      daily_metrics: dailyMetrics,
      weekly_summary: {
        total_trades: allCompleted.length,
        wins: totalWins,
        losses: totalLosses,
        win_rate: `${weeklyWinRate}%`,
        total_pnl: `${totalPnl.toFixed(2)}%`,
        avg_daily_pnl: `${avgDailyPnl}%`,
        target_daily_pnl: '+3.00%',
        target_weekly_pnl: '+15.00%',
        target_win_rate: '>70%',
        meets_targets: totalPnl >= 15 && weeklyWinRate >= 70 ? '✓ YES' : '✗ NO',
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  } catch (err) {
    console.error('[/api/performance/daily-metrics] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
