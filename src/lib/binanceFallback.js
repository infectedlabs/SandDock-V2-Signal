// Heikin Ashi computation helper
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

export function generateMockCandles(symbol, interval, limit) {
  const candles = [];
  const now = new Date();
  
  let intervalMs = 15 * 60 * 1000;
  const unit = interval.slice(-1).toLowerCase();
  const num = parseInt(interval);
  if (unit === 'm') intervalMs = num * 60 * 1000;
  else if (unit === 'h') intervalMs = num * 60 * 60 * 1000;
  else if (unit === 'd') intervalMs = num * 24 * 60 * 60 * 1000;

  let basePrice = 67000;
  const symUpper = symbol.toUpperCase();
  if (symUpper.includes('ETH')) basePrice = 3500;
  else if (symUpper.includes('SOL')) basePrice = 145;
  else if (symUpper.includes('BNB')) basePrice = 580;
  else if (symUpper.includes('XRP')) basePrice = 0.55;
  else if (symUpper.includes('ADA')) basePrice = 0.45;
  else if (symUpper.includes('DOGE')) basePrice = 0.12;
  else if (symUpper.includes('AVAX')) basePrice = 28;
  else if (symUpper.includes('DOT')) basePrice = 6;
  else if (symUpper.includes('MATIC')) basePrice = 0.65;
  else if (symUpper.includes('LTC')) basePrice = 80;

  let currentPrice = basePrice;
  for (let i = limit - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * intervalMs);
    const change = (Math.random() - 0.49) * (basePrice * 0.005);
    const open = currentPrice;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * (basePrice * 0.002);
    const low = Math.min(open, close) - Math.random() * (basePrice * 0.002);
    const volume = Math.random() * 100 + 10;
    
    candles.push({
      open_time: time.toISOString(),
      open,
      high,
      low,
      close,
      volume
    });
    
    currentPrice = close;
  }
  return candles;
}

export async function fetchFromBinance(symbol, interval, limit = 300) {
  const binanceInterval = interval.toLowerCase();
  const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${binanceInterval}&limit=${limit}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

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
