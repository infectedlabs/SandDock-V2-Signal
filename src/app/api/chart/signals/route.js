import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { memoryCache, runWithTimeout } from '@/lib/memoryCache';

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
    const plan = searchParams.get('plan') || 'free';
    const tf = '30m'; // PRODUCTION: 30m only

    // Plan-based gating: time delay only (no confidence limit)
    const delayMinutes = plan === 'free' ? 5 : 0;
    const fiveMinutesAgo = new Date(Date.now() - delayMinutes * 60 * 1000);

    const { data: recentDesc, error: dbError } = await runWithTimeout(
      supabaseAdmin
        .from('signals')
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .eq('interval', tf)
        .order('bar_time', { ascending: false })
        .limit(500),
      1200
    );

    if (dbError) {
      throw new Error(dbError.message);
    }

    // The chart renders a recent time window, so we need the most recent
    // signals (not the oldest 500 of a year's worth) — re-sort ascending
    // after taking the newest slice.
    const dbSignals = (recentDesc || []).slice().sort((a, b) => new Date(a.bar_time) - new Date(b.bar_time));

    if (!dbSignals || dbSignals.length === 0) {
      return NextResponse.json([], {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        }
      });
    }

    // Apply plan-based gating before mapping (time delay only)
    const filtered = dbSignals.filter(s => {
      const sigBarTime = new Date(s.bar_time);
      // Filter by time delay for free plan
      if (plan === 'free' && sigBarTime > fiveMinutesAgo) return false;
      return true;
    });

    const mapped = filtered.map(s => ({
      id: s.id,
      bar_time: s.bar_time,
      signal_type: s.signal_type,
      entry_price: parseFloat(s.entry_price),
      confidence: s.confidence || 95,
      action: s.action || 'new',
      pnl: s.pnl_pct !== null ? Number(parseFloat(s.pnl_pct).toFixed(2)) : null,
      pnl_pct: s.pnl_pct !== null ? Number(parseFloat(s.pnl_pct).toFixed(2)) : null,
      close_reason: s.close_reason,
      close_price: s.close_price ? parseFloat(s.close_price) : null,
      closed_at: s.closed_at,
      is_win: s.is_win,
    }));

    // Save to memory cache
    memoryCache.signals[`${symbol}_${tf}`] = mapped;

    return NextResponse.json(mapped, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  } catch (err) {
    console.error('[/api/chart/signals] Error:', err.message);

    return NextResponse.json([], {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  }
}
