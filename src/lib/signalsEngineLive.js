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

export function detectSwings(ha, lookback, style = 'Intraday') {
  const cfg = STYLE_CONFIG[style] || STYLE_CONFIG.Intraday;
  const atr_mult = cfg.atr_mult;
  const tp1_mult = cfg.tp1_mult;
  const tp2_mult = cfg.tp2_mult;

  const n = ha.length;
  const win = lookback + 1;

  // ATR(14) calculation
  const tr_arr = new Array(n).fill(0);
  for (let k = 1; k < n; k++) {
    tr_arr[k] = Math.max(
      ha[k].ha_high - ha[k].ha_low,
      Math.abs(ha[k].ha_high - ha[k - 1].ha_close),
      Math.abs(ha[k].ha_low - ha[k - 1].ha_close)
    );
  }

  const atr_arr = new Array(n).fill(0);
  const period = 14;
  if (n >= period) {
    let sum = 0;
    for (let k = 0; k < period; k++) sum += tr_arr[k];
    atr_arr[period - 1] = sum / period;
    for (let k = period; k < n; k++) {
      atr_arr[k] = (atr_arr[k - 1] * (period - 1) + tr_arr[k]) / period;
    }
  }

  let last_confirmed_high = null;
  let last_confirmed_low = null;

  const events = [];

  let active_state = 0;
  let active_price = null;
  let active_bar = null;
  let has_commit = false;
  let commit_price = null;

  let pending_type = null;
  let pending_price = null;

  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - lookback);
    const slice = ha.slice(lo, i + 1);
    const window_high = Math.max(...slice.map(c => c.ha_high));
    const window_low  = Math.min(...slice.map(c => c.ha_low));
    const window_size = i - lo + 1;

    const raw_top = ha[i].ha_high === window_high && window_size === win;
    const raw_bot = ha[i].ha_low  === window_low  && window_size === win;

    let is_top = raw_top && !(raw_top && raw_bot && active_state === 1);
    let is_bot = raw_bot && !(raw_top && raw_bot && active_state === 2);
    if (raw_top && raw_bot && active_state === 0) {
      is_bot = false;
    }

    if (is_top) {
      if (active_state === 2) {
        if (has_commit) {
          events.push({
            bar_time:    ha[active_bar].open_time,
            type:        'bot',
            price:       active_price,
            action:      'commit',
            sl_price:    null,
            tp1_price:   null,
            tp2_price:   null,
          });
        }
        has_commit = true;
        commit_price = active_price;
        active_price = null;
        active_bar = null;
        active_state = 1;
        pending_type = null;
        pending_price = null;

        last_confirmed_low = commit_price;
      } else if (active_state === 0) {
        active_state = 1;
      }

      if (active_state === 1) {
        const cur_atr = atr_arr[i];
        const sl = cur_atr > 0 ? Number((ha[i].ha_high + cur_atr * atr_mult).toFixed(2)) : Number(ha[i].ha_high.toFixed(2));

        const entry = ha[i].ha_close;
        const risk = Math.abs(entry - sl);
        const tp1 = Number((entry - risk * tp1_mult).toFixed(2));
        const tp2 = Number((entry - risk * tp2_mult).toFixed(2));

        last_confirmed_high = ha[i].ha_high;

        const action = (pending_type === 'top' && pending_price !== null) ? 'slide' : 'new';
        events.push({
          bar_time:    ha[i].open_time,
          type:        'top',
          price:       ha[i].ha_high,
          action:      action,
          sl_price:    sl,
          tp1_price:   tp1,
          tp2_price:   tp2,
        });

        pending_type = 'top';
        pending_price = ha[i].ha_high;
        active_price = ha[i].ha_high;
        active_bar = i;

        if (!has_commit) {
          has_commit = true;
          commit_price = ha[i].ha_high;
        }
      }
    }

    if (is_bot) {
      if (active_state === 1) {
        if (has_commit) {
          events.push({
            bar_time:    ha[active_bar].open_time,
            type:        'top',
            price:       active_price,
            action:      'commit',
            sl_price:    null,
            tp1_price:   null,
            tp2_price:   null,
          });
        }
        has_commit = true;
        commit_price = active_price;
        active_price = null;
        active_bar = null;
        active_state = 2;
        pending_type = null;
        pending_price = null;

        last_confirmed_high = commit_price;
      } else if (active_state === 0) {
        active_state = 2;
      }

      if (active_state === 2) {
        const cur_atr = atr_arr[i];
        const sl = cur_atr > 0 ? Number((ha[i].ha_low - cur_atr * atr_mult).toFixed(2)) : Number(ha[i].ha_low.toFixed(2));

        const entry = ha[i].ha_close;
        const risk = Math.abs(entry - sl);
        const tp1 = Number((entry + risk * tp1_mult).toFixed(2));
        const tp2 = Number((entry + risk * tp2_mult).toFixed(2));

        last_confirmed_low = ha[i].ha_low;

        const action = (pending_type === 'bot' && pending_price !== null) ? 'slide' : 'new';
        events.push({
          bar_time:    ha[i].open_time,
          type:        'bot',
          price:       ha[i].ha_low,
          action:      action,
          sl_price:    sl,
          tp1_price:   tp1,
          tp2_price:   tp2,
        });

        pending_type = 'bot';
        pending_price = ha[i].ha_low;
        active_price = ha[i].ha_low;
        active_bar = i;

        if (!has_commit) {
          has_commit = true;
          commit_price = ha[i].ha_low;
        }
      }
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
