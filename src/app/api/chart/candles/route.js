import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ── Heikin Ashi computation ────────────────────────────────────────────────────
function computeHA(candles) {
  const ha = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen  = i === 0
      ? (c.open + c.close) / 2
      : (ha[i - 1].ha_open + ha[i - 1].ha_close) / 2;
    const haHigh  = Math.max(c.high, haOpen, haClose);
    const haLow   = Math.min(c.low,  haOpen, haClose);
    ha.push({ ...c, ha_open: haOpen, ha_high: haHigh, ha_low: haLow, ha_close: haClose });
  }
  return ha;
}

import { fetchFromBinance } from '@/lib/binanceFallback';

// ── Fetch candles wrapper for local HA ────────────────────────────────────────
async function getHACandles(symbol, interval, limit) {
  const candles = await fetchFromBinance(symbol, interval, limit);
  return computeHA(candles);
}

// ── GET /api/chart/candles ─────────────────────────────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol   = (searchParams.get('symbol')   || 'BTCUSDT').toUpperCase();
    const interval = searchParams.get('interval')  || '15m';
    const limit    = Math.min(parseInt(searchParams.get('limit') || '200'), 1000);

    const candles = await getHACandles(symbol, interval, limit);

    return NextResponse.json(candles, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  } catch (err) {
    console.error('[/api/chart/candles] Error:', err);
    return NextResponse.json([], {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  }
}
