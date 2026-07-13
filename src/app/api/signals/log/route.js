import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { memoryCache, runWithTimeout } from '@/lib/memoryCache';
import { createClient } from '@supabase/supabase-js';
import { fetchFromBinance } from '@/lib/binanceFallback';

export const dynamic = 'force-dynamic';

const PLAN_SYMBOLS = {
  free:      ['BTCUSDT'],
  pro:       ['BTCUSDT', 'ETHUSDT'],
  master:    ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
  grandmaster: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const plan = searchParams.get('plan') || 'free';
    const userId = searchParams.get('user_id');
    const symbol = searchParams.get('symbol');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(parseInt(searchParams.get('page_size') || '50'), 100);
    const offset = (page - 1) * pageSize;
    const tzOffsetMinutes = parseInt(searchParams.get('tz_offset') || '0');

    let allowedSymbols = PLAN_SYMBOLS[plan] ?? PLAN_SYMBOLS['free'];

    // For MASTER users, add custom coins
    if (['master', 'grandmaster'].includes(plan) && userId) {
      try {
        const { data: customCoins, error: customError } = await runWithTimeout(
          supabaseAdmin
            .from('custom_coins')
            .select('symbol')
            .eq('user_id', userId),
          1000
        );
        if (!customError && customCoins && customCoins.length > 0) {
          const customSymbols = customCoins.map(c => c.symbol);
          allowedSymbols = [...allowedSymbols, ...customSymbols];
        }
      } catch (e) {
        console.warn(`[/api/signals/log] Failed to fetch custom coins for ${userId}:`, e.message);
      }
    }

    const targetSymbols = symbol ? [symbol.toUpperCase()] : allowedSymbols;
    const tf = '30m'; // PRODUCTION: 30m only

    // Plan-based gating: time delay only (no confidence limit)
    // FREE: 5min delay
    // PRO/MASTER: real-time
    const delayMinutes = plan === 'free' ? 5 : 0;
    const fiveMinutesAgo = new Date(Date.now() - delayMinutes * 60 * 1000);

    // Get current prices for live PnL calculation
    const priceCache = {};
    for (const sym of targetSymbols) {
      try {
        const candles = await runWithTimeout(fetchFromBinance(sym, '5m', 1), 3000);
        if (candles && candles.length > 0) {
          priceCache[sym] = candles[candles.length - 1].close;
        }
      } catch (e) {
        console.warn(`[/api/signals/log] Failed to fetch price for ${sym}:`, e.message);
      }
      // Fallback to last cached candle close if Binance timed out/failed — without
      // this, a live signal's pnl_pct silently stays null and renders as a
      // misleading 0% instead of its actual unrealized PnL.
      if (priceCache[sym] === undefined) {
        try {
          const { data: latestCandle } = await runWithTimeout(
            supabaseAdmin
              .from('ohlcv_cache')
              .select('close')
              .eq('symbol', sym.toUpperCase())
              .eq('interval', tf)
              .order('open_time', { ascending: false })
              .limit(1),
            800
          );
          if (latestCandle && latestCandle.length > 0) {
            priceCache[sym] = parseFloat(latestCandle[0].close);
          }
        } catch (fallbackErr) {
          console.warn(`[/api/signals/log] Fallback price fetch failed for ${sym}:`, fallbackErr.message);
        }
      }
    }

    const allLogs = [];

    await Promise.all(targetSymbols.map(async (sym) => {
      try {
        const { data: dbSignals, error: dbError } = await runWithTimeout(
          supabaseAdmin
            .from('signals')
            .select('*')
            .eq('symbol', sym.toUpperCase())
            .eq('interval', tf)
            .order('bar_time', { ascending: false })
            .limit(offset + pageSize),
          1200
        );

        if (!dbError && dbSignals && dbSignals.length > 0) {
          const currentPrice = priceCache[sym];

          dbSignals.forEach(sig => {
            const isLive = sig.closed_at === null;
            const isTrulyClosedswing = sig.close_reason === 'swing_opposite';
            const sigBarTime = new Date(sig.bar_time);

            // Plan-based gating: time delay only
            if (plan === 'free' && sigBarTime > fiveMinutesAgo) return; // FREE plan: 5min delay

            // Calculate live PnL from current price
            let livePnl = null;
            if (isLive && currentPrice) {
              const entryPrice = parseFloat(sig.entry_price);
              if (sig.signal_type === 'buy') {
                livePnl = ((currentPrice - entryPrice) / entryPrice) * 100;
              } else {
                livePnl = ((entryPrice - currentPrice) / entryPrice) * 100;
              }
              livePnl = Number(livePnl.toFixed(2));
            }

            allLogs.push({
              id: sig.id,
              symbol: sig.symbol,
              interval: sig.interval,
              signal_type: sig.signal_type,
              action: sig.action || 'new',
              bar_time: sig.bar_time,
              entry_price: parseFloat(sig.entry_price),
              close_price: sig.close_price ? parseFloat(sig.close_price) : null,
              sl_price: sig.sl_price ? parseFloat(sig.sl_price) : null,
              tp_price: sig.tp_price ? parseFloat(sig.tp_price) : null,
              pnl_pct: isTrulyClosedswing ? parseFloat(sig.pnl_pct) : livePnl,
              current_price: currentPrice || null,
              sl_pct: sig.sl_pct ? parseFloat(sig.sl_pct) : 0,
              tp_pct: sig.tp_pct ? parseFloat(sig.tp_pct) : 0,
              confidence: sig.confidence || 95,
              rationale: sig.rationale,
              created_at: sig.created_at,
              closed_at: isTrulyClosedswing ? sig.closed_at : null,
              swing_group_id: sig.swing_group_id,
              close_reason: sig.close_reason,
              is_win: isTrulyClosedswing ? sig.is_win : null,
              is_closed: isTrulyClosedswing,
              is_live: isLive,
            });
          });
        }
      } catch (err) {
        console.warn(`[/api/signals/log] DB query failed for ${sym} ${tf}:`, err.message);
      }
    }));

    // Apply pagination to results
    const paginatedLogs = allLogs.slice(offset, offset + pageSize);

    return NextResponse.json({
      data: paginatedLogs,
      page,
      page_size: pageSize,
      total_count: allLogs.length,
      total_pages: Math.ceil(allLogs.length / pageSize),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  } catch (err) {
    console.error('[/api/signals/log] Error:', err);
    return NextResponse.json({
      data: [],
      page: 1,
      page_size: 50,
      total_count: 0,
      total_pages: 0,
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  }
}
