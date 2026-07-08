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
    const joinedAtStr = searchParams.get('joined_at');
    const interval = searchParams.get('interval');

    if (!joinedAtStr) {
      return NextResponse.json({ error: 'joined_at is required' }, { status: 400 });
    }

    const allowedSymbols = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT',
      'TRXUSDT', 'DOGEUSDT', 'HBARUSDT', 'UNIUSDT', 'SUIUSDT',
      'AVAXUSDT', 'AAVEUSDT', 'JUPUSDT', 'PUMPUSDT', 'ARBUSDT'
    ];

    let cleanJoinedAt = joinedAtStr;
    const dotIdx = joinedAtStr.indexOf('.');
    if (dotIdx !== -1) {
      const plusIdx = joinedAtStr.indexOf('+', dotIdx);
      // Look for minus only after T (time section) to avoid matching date hyphens
      const tIdx = joinedAtStr.indexOf('T');
      const minusIdx = joinedAtStr.indexOf('-', Math.max(dotIdx, tIdx));
      const zIdx = joinedAtStr.indexOf('Z', dotIdx);
      let endIdx = joinedAtStr.length;
      if (plusIdx !== -1) endIdx = plusIdx;
      else if (minusIdx !== -1) endIdx = minusIdx;
      else if (zIdx !== -1) endIdx = zIdx;
      
      const msPart = joinedAtStr.slice(dotIdx + 1, endIdx);
      if (msPart.length > 3) {
        cleanJoinedAt = joinedAtStr.slice(0, dotIdx + 4) + joinedAtStr.slice(endIdx);
      }
    }

    const joinedAtIso = new Date(cleanJoinedAt).toISOString();

    let signals = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let pageQuery = supabaseAdmin
        .from('signals')
        .select('pnl_pct')
        .in('symbol', allowedSymbols)
        .gte('bar_time', joinedAtIso)
        .not('pnl_pct', 'is', null)
        .order('bar_time', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (interval) {
        pageQuery = pageQuery.eq('interval', interval);
      }

      const { data, error } = await pageQuery;

      if (error) {
        console.error('[alltime-pnl] DB error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        signals = signals.concat(data);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }



    const totalPnl = signals.reduce((sum, s) => sum + parseFloat(s.pnl_pct || 0), 0);

    return NextResponse.json({
      total_pnl_pct: parseFloat(totalPnl.toFixed(2)),
      count: signals.length
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  } catch (err) {
    console.error('[alltime-pnl] Server error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
