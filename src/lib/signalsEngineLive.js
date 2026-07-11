// Heikin Ashi + Quality Filter Signal Engine (V2 - Optimized)
// Target: 2-4 signals/day per coin, +3% daily PnL, +15% weekly, >70% win rate

const QUALITY_CONFIG = {
  BB_DEVIATION: 1.65,          // Quality-first: 70%+ win rate
  BB_LOOKBACK: 20,             // 20-period SMA
  SL_PCT: 1.0,                 // Stop loss (1%)
  TP_PCT: 2.0,                 // Take profit (2%)
  MIN_VOLUME_PCT: 1.1,         // Volume confirmation (110%)
  MIN_RSI_DIVERGENCE: 5,       // Momentum filter (±5%)
  MAX_SIGNALS_PER_DAY: 4,      // Max 4 signals per day per coin
  MIN_BARS_BETWEEN_SIGNALS: 2, // Minimum 2 bars between signals
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

// Calculate momentum (RSI-like)
function calculateMomentum(ha, period = 14) {
  const momentum = new Array(ha.length).fill(0);
  for (let i = period; i < ha.length; i++) {
    const change = ((ha[i].close - ha[i - period].close) / ha[i - period].close) * 100;
    momentum[i] = change;
  }
  return momentum;
}

// Calculate average volume
function calculateAvgVolume(ha, period = 20) {
  const avgVol = new Array(ha.length).fill(0);
  for (let i = period - 1; i < ha.length; i++) {
    const slice = ha.slice(i - period + 1, i + 1);
    avgVol[i] = slice.reduce((sum, c) => sum + c.volume, 0) / period;
  }
  return avgVol;
}

export function detectSwings(ha, lookback, style = 'Intraday', interval = '15m') {
  if (!ha || ha.length < 50) return [];
  const events = [];

  const n = ha.length;
  const cfg = QUALITY_CONFIG;
  const upper = new Array(n).fill(null);
  const lower = new Array(n).fill(null);
  const momentum = calculateMomentum(ha, 14);
  const avgVolume = calculateAvgVolume(ha, 20);

  // Calculate stricter Bollinger Bands
  for (let i = cfg.BB_LOOKBACK - 1; i < n; i++) {
    const slice = ha.slice(i - cfg.BB_LOOKBACK + 1, i + 1);
    const closes = slice.map(c => c.close);
    const sma = closes.reduce((acc, c) => acc + c, 0) / cfg.BB_LOOKBACK;
    const variance = closes.reduce((acc, c) => acc + Math.pow(c - sma, 2), 0) / cfg.BB_LOOKBACK;
    const std = Math.sqrt(variance);
    upper[i] = sma + std * cfg.BB_DEVIATION;
    lower[i] = sma - std * cfg.BB_DEVIATION;
  }

  let lastSignalIdx = -100;
  const signalsByDay = {};

  for (let i = cfg.BB_LOOKBACK; i < n; i++) {
    const close = ha[i].close;
    const up = upper[i];
    const lo = lower[i];
    const vol = ha[i].volume || 0;
    const avgVol = avgVolume[i] || 1;
    const mom = momentum[i];

    if (up === null || lo === null) continue;
    if (i - lastSignalIdx < cfg.MIN_BARS_BETWEEN_SIGNALS) continue;

    // Track signals per day
    const dayKey = new Date(ha[i].open_time).toISOString().split('T')[0];
    if (!signalsByDay[dayKey]) signalsByDay[dayKey] = 0;
    if (signalsByDay[dayKey] >= cfg.MAX_SIGNALS_PER_DAY) continue;

    // Buy: Lower BB + volume + bearish momentum
    if (close <= lo && vol >= avgVol * cfg.MIN_VOLUME_PCT && mom < -cfg.MIN_RSI_DIVERGENCE) {
      events.push({
        bar_time:  ha[i].open_time,
        type:      'bot',
        price:     close,
        action:    'new',
        sl_price:  Number((close * (1 - cfg.SL_PCT / 100)).toFixed(8)),
        tp1_price: Number((close * (1 + cfg.TP_PCT / 100)).toFixed(8)),
        tp2_price: Number((close * (1 + cfg.TP_PCT / 100)).toFixed(8)),
      });
      signalsByDay[dayKey]++;
      lastSignalIdx = i;
    }
    // Sell: Upper BB + volume + bullish momentum
    else if (close >= up && vol >= avgVol * cfg.MIN_VOLUME_PCT && mom > cfg.MIN_RSI_DIVERGENCE) {
      events.push({
        bar_time:  ha[i].open_time,
        type:      'top',
        price:     close,
        action:    'new',
        sl_price:  Number((close * (1 + cfg.SL_PCT / 100)).toFixed(8)),
        tp1_price: Number((close * (1 - cfg.TP_PCT / 100)).toFixed(8)),
        tp2_price: Number((close * (1 - cfg.TP_PCT / 100)).toFixed(8)),
      });
      signalsByDay[dayKey]++;
      lastSignalIdx = i;
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
