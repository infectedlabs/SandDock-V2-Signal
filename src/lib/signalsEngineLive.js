// Heikin Ashi + Swing Detection JS Translation matching python signal_engine.py

const STYLE_CONFIG = {
  Scalp:    { atr_mult: 1.0, tp1_mult: 0.5, tp2_mult: 1.0 },
  Intraday: { atr_mult: 1.5, tp1_mult: 2.0, tp2_mult: 4.0 },
  Swing:    { atr_mult: 2.0, tp1_mult: 2.5, tp2_mult: 5.0 },
};

export function toHeikinAshi(candles) {
  if (!candles || candles.length === 0) return [];
  const ha = [];
  let prevOpen = (candles[0].open + candles[0].close) / 2;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen  = i === 0 ? prevOpen : (prevOpen + ha[i - 1].ha_close) / 2;
    const haHigh  = Math.max(c.high, haOpen, haClose);
    const haLow   = Math.min(c.low,  haOpen, haClose);

    ha.push({
      open_time: c.open_time,
      open:      c.open,
      high:      c.high,
      low:       c.low,
      close:     c.close,
      volume:    c.volume,
      ha_open:   haOpen,
      ha_high:   haHigh,
      ha_low:    haLow,
      ha_close:  haClose,
    });
    prevOpen = haOpen;
  }
  return ha;
}

export function detectSwings(ha, lookback, style = 'Intraday', interval = '15m') {
  if (!ha || ha.length < 20) return [];
  const events = [];
  
  const n = ha.length;
  const upper = new Array(n).fill(null);
  const lower = new Array(n).fill(null);
  
  for (let i = 19; i < n; i++) {
    const slice = ha.slice(i - 19, i + 1);
    const closes = slice.map(c => c.close);
    const sum = closes.reduce((acc, c) => acc + c, 0);
    const sma = sum / 20;
    const variance = closes.reduce((acc, c) => acc + Math.pow(c - sma, 2), 0) / 20;
    const std = Math.sqrt(variance);
    upper[i] = sma + std * 1.6;
    lower[i] = sma - std * 1.6;
  }
  
  let position = null;
  
  for (let i = 19; i < n; i++) {
    const close = ha[i].close;
    const up = upper[i];
    const lo = lower[i];
    if (up === null || lo === null) continue;
    
    if (close <= lo && position !== 'LONG') {
      events.push({
        bar_time:  ha[i].open_time,
        type:      'bot',
        price:     close,
        action:    'new',
        sl_price:  Number((close * (1 - 1.5 / 100)).toFixed(8)),
        tp1_price: Number((close * (1 + 0.75 / 100)).toFixed(8)),
        tp2_price: Number((close * (1 + 1.5 / 100)).toFixed(8)),
      });
      position = 'LONG';
    } else if (close >= up && position !== 'SHORT') {
      events.push({
        bar_time:  ha[i].open_time,
        type:      'top',
        price:     close,
        action:    'new',
        sl_price:  Number((close * (1 + 1.5 / 100)).toFixed(8)),
        tp1_price: Number((close * (1 - 0.75 / 100)).toFixed(8)),
        tp2_price: Number((close * (1 - 1.5 / 100)).toFixed(8)),
      });
      position = 'SHORT';
    }
  }
  
  return events;
}

export function calculateConfidence(signalType, volume, avgVolume) {
  let score = 60;
  if (volume > 0 && avgVolume > 0 && volume > avgVolume) {
    score += 10;
  }
  score += 5;
  return score;
}
