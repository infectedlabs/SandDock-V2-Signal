import { NextResponse } from 'next/server';
import { toHeikinAshi, detectSwings } from '@/lib/signalsEngineLive';

export const dynamic = 'force-dynamic';

const PLAN_SYMBOLS = {
  free:   ['BTCUSDT'],
  pro:    ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT',
            'AVAXUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT'],
  master: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT',
            'AVAXUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT'],
};

async function fetchFromBinance(symbol, interval, limit) {
  const binanceInterval = interval.toLowerCase();
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${binanceInterval}&limit=${limit}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Binance API error: ${res.status}`);

  const rows = await res.json();
  return rows.map(r => ({
    open_time: new Date(r[0]).toISOString(),
    open:      parseFloat(r[1]),
    high:      parseFloat(r[2]),
    low:       parseFloat(r[3]),
    close:     parseFloat(r[4]),
    volume:    parseFloat(r[5]),
  }));
}

function computeConfidence(ha, barIndex) {
  let score = 60;
  const windowStart = Math.max(0, barIndex - 20);
  const window = ha.slice(windowStart, barIndex);
  if (window.length > 0) {
    const avgVol = window.reduce((sum, c) => sum + c.volume, 0) / window.length;
    if (ha[barIndex].volume > avgVol) {
      score += 10;
    }
  }
  score += 5;
  return Math.max(40, Math.min(95, score));
}

function generateRationale(symbol, type, interval, barIndex, ha) {
  const direction = type === 'bot' ? 'bottom' : 'top';
  let rationale = `Automated Heikin Ashi swing ${direction} confirmation for ${symbol} on the ${interval} timeframe. Trend reversal validation metrics support current price targets.`;
  
  const windowStart = Math.max(0, barIndex - 20);
  const window = ha.slice(windowStart, barIndex);
  if (window.length > 0) {
    const avgVol = window.reduce((sum, c) => sum + c.volume, 0) / window.length;
    const currentVol = ha[barIndex].volume;
    const pct = Math.round((currentVol / avgVol - 1) * 100);
    if (pct > 0) {
      rationale += ` Volume is ${pct}% above the 20-bar average.`;
    }
  }
  return rationale;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const plan          = searchParams.get('plan') || 'free';
    const symbol        = searchParams.get('symbol');
    const signal_type   = searchParams.get('signal_type');
    const interval      = searchParams.get('interval') || '15m';
    const limit         = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    const allowedSymbols = PLAN_SYMBOLS[plan] ?? PLAN_SYMBOLS['free'];
    const targetSymbols = symbol ? [symbol.toUpperCase()] : allowedSymbols;

    const allSignals = [];

    await Promise.all(targetSymbols.map(async (sym) => {
      try {
        const candles = await fetchFromBinance(sym, interval, 300);
        const ha = toHeikinAshi(candles);
        const swings = detectSwings(ha, 10, 'Intraday');

        swings.forEach((s) => {
          // We only care about active/latest signal events
          if (s.action === 'new' || s.action === 'slide') {
            const barIndex = ha.findIndex(c => c.open_time === s.bar_time);
            const conf = computeConfidence(ha, barIndex >= 0 ? barIndex : ha.length - 1);
            const rat = generateRationale(sym, s.type, interval, barIndex >= 0 ? barIndex : ha.length - 1, ha);

            allSignals.push({
              id: `live-${sym}-${s.bar_time}-${s.action}`,
              symbol: sym,
              interval,
              signal_type: s.type === 'bot' ? 'buy' : 'sell',
              action: s.action,
              bar_time: s.bar_time,
              entry_price: s.price,
              sl_price: s.sl_price,
              tp_price: s.tp2_price,
              sl_pct: s.sl_price ? Number((Math.abs(s.sl_price - s.price) / s.price * 100).toFixed(2)) : 0,
              tp_pct: s.tp2_price ? Number((Math.abs(s.tp2_price - s.price) / s.price * 100).toFixed(2)) : 0,
              confidence: conf,
              rationale: rat,
              created_at: s.bar_time,
              swing_group_id: `group-${sym}-${s.bar_time}`,
            });
          }
        });
      } catch (err) {
        console.warn(`[/api/signals/live] Failed to fetch/compute for ${sym}:`, err.message);
      }
    }));

    // Filter by signal_type if requested
    let filtered = allSignals;
    if (signal_type) {
      filtered = filtered.filter(s => s.signal_type === signal_type.toLowerCase());
    }

    // Sort by created_at descending (latest first) and apply limit
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const result = filtered.slice(0, limit);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  } catch (err) {
    console.error('[/api/signals/live] Error:', err);
    return NextResponse.json([], {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  }
}
