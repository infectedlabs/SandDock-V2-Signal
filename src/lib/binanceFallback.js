export async function fetchFromBinance(symbol, interval, limit = 300) {
  const binanceInterval = interval.toLowerCase();
  const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${binanceInterval}&limit=${limit}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, { 
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Binance error status: ${res.status}`);
    }

    const rows = await res.json();
    return rows.map(r => ({
      open_time: new Date(r[0]).toISOString(),
      open:      parseFloat(r[1]),
      high:      parseFloat(r[2]),
      low:       parseFloat(r[3]),
      close:     parseFloat(r[4]),
      volume:    parseFloat(r[5]),
    }));
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`[Binance Fetch] Failed for ${symbol} due to error:`, error.message);
    throw error;
  }
}
