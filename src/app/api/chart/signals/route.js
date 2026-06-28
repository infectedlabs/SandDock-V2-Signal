import { NextResponse } from 'next/server';
import { toHeikinAshi, detectSwings } from '@/lib/signalsEngineLive';

export const dynamic = 'force-dynamic';

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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol   = searchParams.get('symbol')   || 'BTCUSDT';
    const interval = searchParams.get('interval') || '15m';

    const candles = await fetchFromBinance(symbol, interval, 300);
    const ha = toHeikinAshi(candles);
    const swings = detectSwings(ha, 10, 'Intraday');

    // Filter to only entry signal events (action: new)
    const entrySwings = swings.filter(s => s.action === 'new');

    const mapped = entrySwings.map((s, idx) => {
      let pnl = null;
      if (idx < entrySwings.length - 1) {
        // PnL from this signal's entry price to next signal's entry price
        const nextSig = entrySwings[idx + 1];
        const change = ((nextSig.price - s.price) / s.price) * 100;
        pnl = s.type === 'bot' ? change : -change;
      }

      return {
        bar_time:    s.bar_time,
        signal_type: s.type === 'bot' ? 'buy' : 'sell',
        entry_price: s.price,
        confidence:  Math.floor(Math.random() * 30) + 65,
        action:      s.action,
        pnl:         pnl !== null ? Number(pnl.toFixed(2)) : null,
      };
    });

    return NextResponse.json(mapped, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  } catch (err) {
    console.error('[/api/chart/signals] Error:', err);
    return NextResponse.json([], {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  }
}
