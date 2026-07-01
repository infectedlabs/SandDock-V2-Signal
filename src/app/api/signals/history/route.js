import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { memoryCache, runWithTimeout } from '@/lib/memoryCache';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

export const dynamic = 'force-dynamic';

export async function GET(request) {
  let symbol = 'BTCUSDT';
  let interval = '15m';
  let filter = '30d';

  try {
    const { searchParams } = new URL(request.url);
    symbol   = (searchParams.get('symbol')   || 'BTCUSDT').toUpperCase();
    interval = searchParams.get('interval')  || '15m';
    filter   = searchParams.get('filter') || '30d'; // '1y' | '6m' | '30d' | '1w' | 'today'

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

    const { data, error } = await runWithTimeout(query, 1500);
    if (error) throw error;

    let resultData = data || [];

    // Secondary fallback: if DB returned nothing, reconstruct from memoryCache.log
    if (resultData.length === 0) {
      const logCache = memoryCache.log[`${symbol}_${interval}`];
      if (logCache && logCache.length > 0) {
        console.log(`[/api/signals/history] DB returned empty array, reconstructing from memoryCache.log for ${symbol} ${interval}`);
        
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
          filterDate.setDate(now.getDate() - 30);
        }

        resultData = logCache.filter(sig => {
          const hasPnl = sig.pnl_pct !== null && sig.pnl_pct !== undefined;
          const sigTime = new Date(sig.bar_time || sig.created_at);
          return hasPnl && sigTime >= filterDate;
        });

        // Sort ascending by time for correct timeline plotting
        resultData.sort((a, b) => new Date(a.bar_time || a.created_at).getTime() - new Date(b.bar_time || b.created_at).getTime());
      }
    }

    // Save to memory cache
    memoryCache.history[`${symbol}_${interval}_${filter}`] = resultData;

    return NextResponse.json(resultData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  } catch (err) {
    console.error('[/api/signals/history] Fetch failed, reading cache:', err.message);

    const memCache = memoryCache.history[`${symbol}_${interval}_${filter}`];
    if (memCache && memCache.length > 0) {
      console.log(`[/api/signals/history] Serving from in-memory fallback cache for ${symbol}`);
      return NextResponse.json(memCache, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        }
      });
    }

    // Secondary fallback: Reconstruct history from memoryCache.log (calculated logs)
    const logCache = memoryCache.log[`${symbol}_${interval}`];
    if (logCache && logCache.length > 0) {
      console.log(`[/api/signals/history] Reconstructing history from memoryCache.log for ${symbol} ${interval}`);
      
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
        filterDate.setDate(now.getDate() - 30);
      }

      const reconstructed = logCache.filter(sig => {
        const hasPnl = sig.pnl_pct !== null && sig.pnl_pct !== undefined;
        const sigTime = new Date(sig.bar_time || sig.created_at);
        return hasPnl && sigTime >= filterDate;
      });

      // Sort ascending by time for correct timeline plotting
      reconstructed.sort((a, b) => new Date(a.bar_time || a.created_at).getTime() - new Date(b.bar_time || b.created_at).getTime());

      // Save to memory cache
      memoryCache.history[`${symbol}_${interval}_${filter}`] = reconstructed;

      return NextResponse.json(reconstructed, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        }
      });
    }

    return NextResponse.json([], {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  }
}
