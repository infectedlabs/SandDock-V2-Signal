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

// ── Fetch candles directly from Binance ────────────────────────────────────────
async function fetchFromBinance(symbol, interval, limit) {
  const binanceInterval = interval.toLowerCase();
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${binanceInterval}&limit=${limit}`;
  const res  = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Binance API error: ${res.status}`);

  const rows = await res.json();

  const candles = rows.map(r => ({
    open_time: new Date(r[0]).toISOString(),
    open:      parseFloat(r[1]),
    high:      parseFloat(r[2]),
    low:       parseFloat(r[3]),
    close:     parseFloat(r[4]),
    volume:    parseFloat(r[5]),
  }));

  return computeHA(candles);
}

// ── GET /api/chart/candles ─────────────────────────────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol   = (searchParams.get('symbol')   || 'BTCUSDT').toUpperCase();
    const interval = searchParams.get('interval')  || '15m';
    const limit    = Math.min(parseInt(searchParams.get('limit') || '200'), 1000);

    const candles = await fetchFromBinance(symbol, interval, limit);

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
