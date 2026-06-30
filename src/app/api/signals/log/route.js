import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { toHeikinAshi, detectSwings } from '@/lib/signalsEngineLive';

export const dynamic = 'force-dynamic';

const PLAN_SYMBOLS = {
  free:   ['BTCUSDT'],
  pro:    ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT',
            'AVAXUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT'],
  master: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT',
            'AVAXUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT'],
};

import { createClient } from '@supabase/supabase-js';
import { fetchFromBinance } from '@/lib/binanceFallback';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const plan      = searchParams.get('plan') || 'free';
    const symbol    = searchParams.get('symbol');
    const interval  = searchParams.get('interval') || '15m';
    const page      = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize  = Math.min(parseInt(searchParams.get('page_size') || '50'), 100);
    const offset    = (page - 1) * pageSize;

    const allowedSymbols = PLAN_SYMBOLS[plan] ?? PLAN_SYMBOLS['free'];
    const targetSymbols = symbol ? [symbol.toUpperCase()] : allowedSymbols;

    const allLogs = [];

    await Promise.all(targetSymbols.map(async (sym) => {
      try {
        const candles = await fetchFromBinance(sym, interval, 400);
        const ha = toHeikinAshi(candles);
        const swings = detectSwings(ha, 10, 'Intraday');

        const entrySwings = swings.filter(s => s.action === 'new');

        const dbPayload = [];

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
            
            let change = ((nextSig.price - s.price) / s.price) * 100;
            pnlPct = Number((isBuy ? change : -change).toFixed(4));
            isWin = pnlPct >= 0;
          }

          const signalObj = {
            symbol: sym,
            interval: interval,
            signal_type: isBuy ? 'buy' : 'sell',
            action: 'new',
            entry_price: s.price,
            bar_time: s.bar_time,
            confidence: Math.floor(Math.random() * 20) + 70,
            rationale: `Automated Heikin Ashi swing ${isBuy ? 'bottom' : 'top'} confirmation for ${sym} on the ${interval} timeframe.`,
            sl_price: s.sl_price,
            tp_price: s.tp2_price,
            sl_pct: s.sl_price ? Number((Math.abs(s.sl_price - s.price) / s.price * 100).toFixed(2)) : 0,
            tp_pct: s.tp2_price ? Number((Math.abs(s.tp2_price - s.price) / s.price * 100).toFixed(2)) : 0,
            closed_at: closedAt,
            close_price: closePrice,
            pnl_pct: pnlPct,
            is_win: isWin,
            swing_group_id: crypto.randomUUID(),
            close_reason: closeReason,
            created_at: s.bar_time,
          };

          dbPayload.push(signalObj);

          allLogs.push({
            id: `log-${sym}-${s.bar_time}`,
            ...signalObj
          });
        });

        if (dbPayload.length > 0) {
          const { error: upsertErr } = await supabaseAdmin
            .from('signals')
            .upsert(dbPayload, { onConflict: 'symbol,interval,bar_time' });
          if (upsertErr) {
            console.error(`[/api/signals/log] Database upsert error for ${sym}:`, upsertErr);
          }
        }
      } catch (err) {
        console.warn(`[/api/signals/log] Failed for ${sym}:`, err.message);
      }
    }));

    // Sort by created_at descending
    allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Paginate
    const paginated = allLogs.slice(offset, offset + pageSize);

    return NextResponse.json(paginated, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  } catch (err) {
    console.error('[/api/signals/log] Error:', err);
    return NextResponse.json([], {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  }
}
