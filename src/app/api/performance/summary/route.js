import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { memoryCache, runWithTimeout } from '@/lib/memoryCache';
import { toHeikinAshi, detectSwings } from '@/lib/signalsEngineLive';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

export const dynamic = 'force-dynamic';

import { fetchFromBinance } from '@/lib/binanceFallback';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol   = searchParams.get('symbol')   || 'BTCUSDT';
    const interval = searchParams.get('interval') || '15m';

    const { data: dbSignals, error: dbError } = await supabaseAdmin
      .from('signals')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .eq('interval', interval)
      .order('bar_time', { ascending: true });

    if (dbError) {
      throw new Error(dbError.message);
    }

    if (!dbSignals || dbSignals.length === 0) {
      const emptyPayload = {
        total_signals: 0,
        completed_trades: 0,
        wins: 0,
        losses: 0,
        open_signals: 0,
        win_rate_pct: '0.0',
        avg_pnl: '0.00',
        best_trade: '0.00',
        worst_trade: '0.00',
        profit_factor: '-'
      };
      return NextResponse.json(emptyPayload, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        }
      });
    }

    const completed = dbSignals.filter(s => s.pnl_pct !== null && s.pnl_pct !== undefined);
    const openCount = dbSignals.length - completed.length;

    const wins = completed.filter(s => s.is_win === true);
    const losses = completed.filter(s => s.is_win === false);
    const pnlValues = completed.map(s => parseFloat(s.pnl_pct));

    const avgPnl = pnlValues.length > 0
      ? (pnlValues.reduce((a, b) => a + b, 0) / pnlValues.length).toFixed(2)
      : '0.00';
    const bestTrade = pnlValues.length > 0 ? Math.max(...pnlValues).toFixed(2) : '0.00';
    const worstTrade = pnlValues.length > 0 ? Math.min(...pnlValues).toFixed(2) : '0.00';
    const winRate = completed.length > 0
      ? ((wins.length / completed.length) * 100).toFixed(1)
      : '0.0';

    const positiveSum = pnlValues.filter(p => p > 0).reduce((sum, p) => sum + p, 0);
    const negativeSum = Math.abs(pnlValues.filter(p => p < 0).reduce((sum, p) => sum + p, 0));
    const profitFactor = negativeSum > 0 ? (positiveSum / negativeSum).toFixed(2) : positiveSum > 0 ? 'Infinite' : '-';

    const payload = {
      total_signals: dbSignals.length,
      completed_trades: completed.length,
      wins: wins.length,
      losses: losses.length,
      open_signals: openCount,
      win_rate_pct: winRate,
      avg_pnl: avgPnl,
      best_trade: bestTrade,
      worst_trade: worstTrade,
      profit_factor: profitFactor,
    };

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  } catch (err) {
    console.error('[/api/performance/summary] GET handler error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
