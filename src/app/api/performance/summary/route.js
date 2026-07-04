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

    const candles = await fetchFromBinance(symbol, interval, 500);
    const ha = toHeikinAshi(candles);
    const swings = detectSwings(ha, 10, 'Intraday');

    const entrySwings = swings.filter(s => s.action === 'new');

    const completed = [];
    const openSignals = [];

    entrySwings.forEach((s, idx) => {
      const isBuy = s.type === 'bot';
      let closePrice = null;
      let closeReason = null;
      let pnlPct = null;
      let isWin = null;
      let closedAt = null;

      if (idx < entrySwings.length - 1) {
        const nextSig = entrySwings[idx + 1];
        closePrice = nextSig.price;
        closeReason = 'direction_flip';
        closedAt = nextSig.bar_time;
        const change = ((nextSig.price - s.price) / s.price) * 100;
        pnlPct = Number((isBuy ? change : -change).toFixed(4));
        isWin = pnlPct >= 0;

        completed.push({
          is_win: isWin,
          pnl_pct: pnlPct,
          close_reason: closeReason,
        });
      } else {
        openSignals.push({
          is_win: null,
          pnl_pct: null,
          close_reason: null,
        });
      }
    });

    const wins = completed.filter(s => s.is_win === true);
    const losses = completed.filter(s => s.is_win === false);
    const pnlValues = completed.filter(s => s.pnl_pct !== null).map(s => parseFloat(s.pnl_pct));

    const avgPnl = pnlValues.length > 0
      ? (pnlValues.reduce((a, b) => a + b, 0) / pnlValues.length).toFixed(2)
      : null;
    const bestTrade = pnlValues.length > 0 ? Math.max(...pnlValues).toFixed(2) : null;
    const worstTrade = pnlValues.length > 0 ? Math.min(...pnlValues).toFixed(2) : null;
    const winRate = completed.length > 0
      ? ((wins.length / completed.length) * 100).toFixed(1)
      : null;

    const positiveSum = pnlValues.filter(p => p > 0).reduce((sum, p) => sum + p, 0);
    const negativeSum = Math.abs(pnlValues.filter(p => p < 0).reduce((sum, p) => sum + p, 0));
    const profitFactor = negativeSum > 0 ? (positiveSum / negativeSum).toFixed(2) : positiveSum > 0 ? 'Infinite' : '-';

    const payload = {
      total_signals: entrySwings.length,
      completed_trades: completed.length,
      wins: wins.length,
      losses: losses.length,
      open_signals: openSignals.length,
      win_rate_pct: winRate,
      avg_pnl: avgPnl,
      best_trade: bestTrade,
      worst_trade: worstTrade,
      profit_factor: profitFactor,
    };

    // Save to memory cache
    memoryCache.stats[`${symbol}_${interval}`] = payload;

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  } catch (err) {
    console.error('[/api/performance/summary] Binance fetch failed, reading cache:', err.message);
    
    // 1. Fallback to Supabase cache with a timeout
    try {
      const { data: dbSignals } = await runWithTimeout(
        supabaseAdmin
          .from('signals')
          .select('*')
          .eq('symbol', symbol.toUpperCase())
          .eq('interval', interval),
        1500
      );

      if (dbSignals && dbSignals.length > 0) {
        const completed = dbSignals.filter(s => s.pnl_pct !== null);
        const wins = completed.filter(s => s.is_win === true);
        const losses = completed.filter(s => s.is_win === false);
        const pnlValues = completed.map(s => parseFloat(s.pnl_pct));

        const avgPnl = pnlValues.length > 0
          ? (pnlValues.reduce((a, b) => a + b, 0) / pnlValues.length).toFixed(2)
          : null;
        const bestTrade = pnlValues.length > 0 ? Math.max(...pnlValues).toFixed(2) : null;
        const worstTrade = pnlValues.length > 0 ? Math.min(...pnlValues).toFixed(2) : null;
        const winRate = completed.length > 0
          ? ((wins.length / completed.length) * 100).toFixed(1)
          : null;

        const positiveSum = pnlValues.filter(p => p > 0).reduce((sum, p) => sum + p, 0);
        const negativeSum = Math.abs(pnlValues.filter(p => p < 0).reduce((sum, p) => sum + p, 0));
        const profitFactor = negativeSum > 0 ? (positiveSum / negativeSum).toFixed(2) : positiveSum > 0 ? 'Infinite' : '-';

        const dbPayload = {
          total_signals: dbSignals.length,
          completed_trades: completed.length,
          wins: wins.length,
          losses: losses.length,
          open_signals: dbSignals.length - completed.length,
          win_rate_pct: winRate,
          avg_pnl: avgPnl,
          best_trade: bestTrade,
          worst_trade: worstTrade,
          profit_factor: profitFactor,
        };

        // Cache the DB calculated stats in memory cache
        memoryCache.stats[`${symbol}_${interval}`] = dbPayload;

        return NextResponse.json(dbPayload, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          }
        });
      }
    } catch (fallbackErr) {
      console.warn('[/api/performance/summary] DB fallback calculation failed/timed out:', fallbackErr.message);
    }

    // 2. Fallback to memory cache
    const memCache = memoryCache.stats[`${symbol}_${interval}`];
    if (memCache) {
      console.log(`[/api/performance/summary] Serving from in-memory fallback cache for ${symbol}`);
      return NextResponse.json(memCache, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        }
      });
    }

    return NextResponse.json({
      total_signals: 0, completed_trades: 0, wins: 0, losses: 0,
      open_signals: 0, win_rate_pct: null, avg_pnl: null,
      best_trade: null, worst_trade: null, profit_factor: '-'
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  }
}
