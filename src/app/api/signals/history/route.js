import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol   = searchParams.get('symbol');
    const interval = searchParams.get('interval');
    const filter   = searchParams.get('filter') || '30d'; // '1y' | '6m' | '30d' | '1w' | 'today'

    let query = supabaseAdmin
      .from('signals')
      .select('*')
      .not('pnl_pct', 'is', null) // only closed signals with PnL
      .order('bar_time', { ascending: true }); // ascending order for chart plotting

    if (symbol) {
      query = query.eq('symbol', symbol.toUpperCase());
    }
    if (interval) {
      query = query.eq('interval', interval);
    }

    // Apply date filter
    const now = new Date();
    let filterDate = new Date();

    if (filter === '1y') {
      filterDate.setFullYear(now.getFullYear() - 1);
    } else if (filter === '6m') {
      filterDate.setMonth(now.getMonth() - 6);
    } else if (filter === '1w') {
      filterDate.setDate(now.getDate() - 7);
    } else if (filter === 'today') {
      filterDate.setHours(0, 0, 0, 0);
    } else {
      // Default '30d'
      filterDate.setDate(now.getDate() - 30);
    }

    query = query.gte('bar_time', filterDate.toISOString());

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  } catch (err) {
    console.error('[/api/signals/history] Error:', err);
    return NextResponse.json([], { status: 200 });
  }
}
