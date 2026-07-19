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
    // Fetch ALL signals with pnl data using pagination
    let allSignals = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: signals, error } = await supabaseAdmin
        .from('signals')
        .select('pnl_pct, is_win, bar_time', { count: 'exact' })
        .not('pnl_pct', 'is', null)
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('bar_time', { ascending: false });

      if (error) {
        console.error('Error fetching signals page:', page, error);
        return NextResponse.json(
          { error: error.message },
          { status: 500, headers: { 'Cache-Control': 'no-store' } }
        );
      }

      if (!signals || signals.length === 0) {
        hasMore = false;
      } else {
        allSignals = allSignals.concat(signals);
        if (signals.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    if (allSignals.length === 0) {
      return NextResponse.json(
        {
          total_pnl: 0,
          win_rate: 0,
          total_signals: 0,
          last_updated: new Date().toISOString(),
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Calculate total PnL (sum of all signal returns)
    const totalPnL = allSignals.reduce((sum, s) => sum + parseFloat(s.pnl_pct || 0), 0);

    // Calculate win rate (percentage of winning signals)
    const wins = allSignals.filter(s => s.is_win === true).length;
    const winRate = ((wins / allSignals.length) * 100).toFixed(1);

    // Get the most recent signal timestamp
    const lastUpdated = allSignals.length > 0 ? allSignals[0].bar_time : new Date().toISOString();

    console.log(`Hero stats: ${allSignals.length} signals, ${totalPnL.toFixed(2)}% PnL, ${winRate}% win rate`);

    return NextResponse.json(
      {
        total_pnl: parseFloat(totalPnL.toFixed(2)),
        win_rate: parseFloat(winRate),
        total_signals: allSignals.length,
        last_updated: lastUpdated,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (err) {
    console.error('Error in hero-stats:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
