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
      .order('bar_time', { ascending: true }); // ascending order for chart plotting

    if (symbol && symbol !== 'ALL') {
      query = query.eq('symbol', symbol.toUpperCase());
    }
    if (interval) {
      query = query.eq('interval', interval);
    }

    // Apply date filter (using rolling millisecond windows for 100% timezone-independent queries)
    let filterMs = 30 * 24 * 60 * 60 * 1000; // default 30d
    if (filter === '1y') {
      filterMs = 365 * 24 * 60 * 60 * 1000;
    } else if (filter === '6m') {
      filterMs = 180 * 24 * 60 * 60 * 1000;
    } else if (filter === '1w') {
      filterMs = 7 * 24 * 60 * 60 * 1000;
    } else if (filter === 'today') {
      filterMs = 24 * 60 * 60 * 1000;
    }

    const filterDate = new Date(Date.now() - filterMs);
    query = query.gte('bar_time', filterDate.toISOString());

    const { data, error } = await runWithTimeout(query, 1500);
    if (error) throw error;

    let resultData = data || [];

    // Secondary fallback: if DB returned nothing, reconstruct from memoryCache.log
    if (resultData.length === 0) {
      const logCache = symbol === 'ALL'
        ? Object.keys(memoryCache.log)
            .filter(key => key.endsWith(`_${interval}`))
            .reduce((acc, key) => acc.concat(memoryCache.log[key] || []), [])
        : memoryCache.log[`${symbol}_${interval}`];
      if (logCache && logCache.length > 0) {
        console.log(`[/api/signals/history] DB returned empty array, reconstructing from memoryCache.log for ${symbol} ${interval}`);
        
        let filterMs = 30 * 24 * 60 * 60 * 1000; // default 30d
        if (filter === '1y') {
          filterMs = 365 * 24 * 60 * 60 * 1000;
        } else if (filter === '6m') {
          filterMs = 180 * 24 * 60 * 60 * 1000;
        } else if (filter === '1w') {
          filterMs = 7 * 24 * 60 * 60 * 1000;
        } else if (filter === 'today') {
          filterMs = 24 * 60 * 60 * 1000;
        }
        const filterDate = new Date(Date.now() - filterMs);

        resultData = logCache.filter(sig => {
          const sigTime = new Date(sig.bar_time || sig.created_at);
          return sigTime >= filterDate;
        });

        // Sort ascending by time for correct timeline plotting
        resultData.sort((a, b) => new Date(a.bar_time || a.created_at).getTime() - new Date(b.bar_time || b.created_at).getTime());
      }
    }

    // Calculate live performance for open signals
    const uniqueSymbols = [...new Set(resultData.map(s => s.symbol))];
    const priceMap = {};
    for (const sym of uniqueSymbols) {
      try {
        const c = await fetchFromBinance(sym, interval, 1);
        if (c && c.length > 0) {
          priceMap[sym] = c[c.length - 1].close;
        }
      } catch (e) {
        console.warn(`Failed to fetch current price for ${sym}:`, e.message);
        try {
          const { data: latestCandles } = await runWithTimeout(
            supabaseAdmin
              .from('ohlcv_cache')
              .select('close')
              .eq('symbol', sym.toUpperCase())
              .eq('interval', interval)
              .order('open_time', { ascending: false })
              .limit(1),
            800
          );
          if (latestCandles && latestCandles.length > 0) {
            priceMap[sym] = parseFloat(latestCandles[0].close);
          }
        } catch (dbErr) {
          console.warn(`Failed to fetch fallback price from ohlcv_cache for ${sym}:`, dbErr.message);
        }
      }
    }

    resultData = resultData.map(s => {
      const entry = parseFloat(s.entry_price);
      if (s.pnl_pct !== null && s.pnl_pct !== undefined) {
        return {
          ...s,
          entry_price: entry,
          pnl_pct: parseFloat(s.pnl_pct),
          is_win: s.is_win,
        };
      }
      
      const livePrice = priceMap[s.symbol];
      if (livePrice !== undefined && livePrice !== null) {
        const isBuy = s.signal_type === 'buy';
        const change = ((livePrice - entry) / entry) * 100;
        const livePnl = Number((isBuy ? change : -change).toFixed(4));
        return {
          ...s,
          entry_price: entry,
          pnl_pct: livePnl,
          is_win: livePnl >= 0,
        };
      }
      
      return {
        ...s,
        entry_price: entry,
        pnl_pct: 0,
        is_win: true,
      };
    });

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
    const logCache = symbol === 'ALL'
        ? Object.keys(memoryCache.log)
            .filter(key => key.endsWith(`_${interval}`))
            .reduce((acc, key) => acc.concat(memoryCache.log[key] || []), [])
        : memoryCache.log[`${symbol}_${interval}`];
    if (logCache && logCache.length > 0) {
      console.log(`[/api/signals/history] Reconstructing history from memoryCache.log for ${symbol} ${interval}`);
      
      let filterMs = 30 * 24 * 60 * 60 * 1000; // default 30d
      if (filter === '1y') {
        filterMs = 365 * 24 * 60 * 60 * 1000;
      } else if (filter === '6m') {
        filterMs = 180 * 24 * 60 * 60 * 1000;
      } else if (filter === '1w') {
        filterMs = 7 * 24 * 60 * 60 * 1000;
      } else if (filter === 'today') {
        filterMs = 24 * 60 * 60 * 1000;
      }
      const filterDate = new Date(Date.now() - filterMs);

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
