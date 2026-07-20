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
    const limit = parseInt(searchParams.get('limit') || '5');

    // First, try to fetch closed signals from today only
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStart = today.toISOString();

    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const todayEnd = tomorrow.toISOString();

    const { data: todaySignals, error: todayError } = await supabaseAdmin
      .from('signals')
      .select('bar_time, symbol, signal_type, entry_price, pnl_pct, is_win')
      .not('pnl_pct', 'is', null)
      .gt('pnl_pct', 0)  // Only positive PnL
      .gte('bar_time', todayStart)  // Today only (start)
      .lt('bar_time', todayEnd)  // Today only (end)
      .order('pnl_pct', { ascending: false })  // Highest PnL first
      .limit(limit * 2);

    if (todayError) {
      console.error('Error fetching today signals:', todayError);
      return NextResponse.json(
        { error: todayError.message },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    let signals = todaySignals;

    // If no signals from today, fetch the last 5 signals from any day
    if (!signals || signals.length === 0) {
      const { data: allTimeSignals, error: allTimeError } = await supabaseAdmin
        .from('signals')
        .select('bar_time, symbol, signal_type, entry_price, pnl_pct, is_win')
        .not('pnl_pct', 'is', null)
        .gt('pnl_pct', 0)  // Only positive PnL
        .order('bar_time', { ascending: false })  // Most recent first
        .limit(limit * 2);

      if (allTimeError) {
        console.error('Error fetching all-time signals:', allTimeError);
        return NextResponse.json(
          { error: allTimeError.message },
          { status: 500, headers: { 'Cache-Control': 'no-store' } }
        );
      }

      signals = allTimeSignals;
    }

    if (!signals || signals.length === 0) {
      // Return empty signals array if still no data
      return NextResponse.json(
        { signals: [] },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
      );
    }

    // Filter out test/fake records and format the data for display
    const realSignals = signals.filter(sig => !sig.symbol.toUpperCase().includes('TEST'));

    const formattedSignals = realSignals.map(sig => {
      const pnlValue = sig.pnl_pct ? parseFloat(sig.pnl_pct) : 0;
      const isWin = sig.is_win === true || (sig.pnl_pct && parseFloat(sig.pnl_pct) > 0);

      // Calculate exit price from entry price and pnl percentage
      const entryPrice = parseFloat(sig.entry_price);
      const exitPrice = sig.signal_type?.toUpperCase() === 'BUY'
        ? entryPrice * (1 + pnlValue / 100)
        : entryPrice * (1 - pnlValue / 100);

      return {
        date: new Date(sig.bar_time).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        pair: sig.symbol,
        type: sig.signal_type?.toUpperCase() === 'BUY' ? 'BUY' : 'SELL',
        entry: `$${entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        exit: `$${exitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        result: `${pnlValue >= 0 ? '+' : ''}${pnlValue.toFixed(2)}%`,
        win: isWin
      };
    });

    return NextResponse.json(
      { signals: formattedSignals },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (err) {
    console.error('Error in closed-signals:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
