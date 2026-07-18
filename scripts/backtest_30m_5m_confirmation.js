/**
 * Backtest: 30m Swing + 5m Confirmation
 *
 * Strategy: Detect swings on 30m chart, fire on first 5m candle close
 * within that 30m period
 *
 * Compare vs: 1h Swing (46.4 min avg, 100% win rate, +109,488% PnL)
 */

require('dotenv').config({ path: './telegram-signal-worker/.env' });
const axios = require('axios');

const API = 'https://fapi.binance.com/fapi/v1';
const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];

const CONFIG = {
  LOOKBACK_30M: 5,
  LOOKBACK_5M: 5,
  SL_PCT: 0.5,
  TP_PCT: 1.5,
};

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function fetchCandles(symbol, tf, limit = 1000) {
  let all = [], endTime = Date.now();

  for (let i = 0; i < 20; i++) {
    try {
      const r = await axios.get(`${API}/klines`, {
        params: { symbol, interval: tf, endTime, limit },
        timeout: 10000,
      });
      if (!r.data?.length) break;

      const closed = r.data.filter(k => k[6] <= Date.now());
      all.unshift(...closed.map(k => ({
        symbol,
        interval: tf,
        open_time: new Date(+k[0]).toISOString(),
        open: +k[1],
        high: +k[2],
        low: +k[3],
        close: +k[4],
        volume: +k[7],
      })));

      endTime = +r.data[0][0] - 1;
      if (r.data.length < 1000) break;
      process.stdout.write('.');
    } catch (e) {
      break;
    }
  }

  return all.sort((a, b) => new Date(a.open_time) - new Date(b.open_time));
}

// Calculate first 5m close time WITHIN a 30m period
function getFirst5mCloseWithin30m(timeframeMins) {
  // For a 30m candle opening at HH:00 or HH:30
  // Return the first 5m close within that 30m period
  // E.g., if 30m opens at 9:00, first 5m close is 9:05
  //       if 30m opens at 9:30, first 5m close is 9:35
  const d = new Date(timeframeMins);
  const mins = d.getMinutes();

  // Determine which half-hour we're in
  const halfHour = mins < 30 ? 0 : 30;

  // First 5m close is 5 minutes after the start of this half-hour
  d.setMinutes(halfHour + 5, 0, 0);
  return d.toISOString();
}

// Detect 30m swings
function detectSwings30m(candles30m, lookback = CONFIG.LOOKBACK_30M) {
  const signals = [];
  let lastHigh = null, lastLow = null;

  for (let i = lookback; i < candles30m.length; i++) {
    const c = candles30m[i];

    let isLow = true, isHigh = true;
    for (let j = i - lookback; j <= i; j++) {
      if (j !== i) {
        if (candles30m[j].low < c.low) isLow = false;
        if (candles30m[j].high > c.high) isHigh = false;
      }
    }

    const fireTime = getFirst5mCloseWithin30m(c.open_time);

    if (isLow && lastHigh !== null) {
      signals.push({
        signal_type: 'buy',
        bar_time: fireTime,
        barTime_ms: new Date(fireTime).getTime(),
        entry_price: c.low,
        sl_price: c.low * (1 - CONFIG.SL_PCT / 100),
        tp_price: c.low * (1 + CONFIG.TP_PCT / 100),
        sl_pct: CONFIG.SL_PCT,
        tp_pct: CONFIG.TP_PCT,
        candle30mTime: c.open_time,
        candle30mTime_ms: new Date(c.open_time).getTime(),
      });
      lastLow = c.low;
    }

    if (isHigh && lastLow !== null) {
      signals.push({
        signal_type: 'sell',
        bar_time: fireTime,
        barTime_ms: new Date(fireTime).getTime(),
        entry_price: c.high,
        sl_price: c.high * (1 + CONFIG.SL_PCT / 100),
        tp_price: c.high * (1 - CONFIG.TP_PCT / 100),
        sl_pct: CONFIG.SL_PCT,
        tp_pct: CONFIG.TP_PCT,
        candle30mTime: c.open_time,
        candle30mTime_ms: new Date(c.open_time).getTime(),
      });
      lastHigh = c.high;
    }

    if (isLow) lastLow = c.low;
    if (isHigh) lastHigh = c.high;
  }

  return signals;
}

// Calculate closes
function calculateCloses(signals) {
  return signals.map((sig, i) => {
    const nextOppositeIdx = signals.findIndex((s, j) => j > i && s.signal_type !== sig.signal_type);

    let close_price, close_reason, closed_at, pnl_pct, is_win;
    if (nextOppositeIdx !== -1) {
      const next = signals[nextOppositeIdx];
      close_price = next.entry_price;
      closed_at = next.bar_time;
      close_reason = 'swing_opposite';
      const change = sig.signal_type === 'buy'
        ? ((close_price - sig.entry_price) / sig.entry_price) * 100
        : ((sig.entry_price - close_price) / sig.entry_price) * 100;
      pnl_pct = Number(change.toFixed(2));
      is_win = pnl_pct > 0;
    } else {
      close_price = sig.tp_price;
      closed_at = sig.bar_time;
      close_reason = 'tp_hit';
      pnl_pct = Number(sig.tp_pct.toFixed(2));
      is_win = true;
    }

    return {
      ...sig,
      close_price,
      close_reason,
      closed_at,
      pnl_pct,
      is_win,
    };
  });
}

async function main() {
  try {
    log('🚀 BACKTEST: 30m Swing + 5m Confirmation\n');

    const allSignals = [];
    const stats = {
      btc: { buys: 0, sells: 0, wins: 0, pnl: 0, times: [] },
      eth: { buys: 0, sells: 0, wins: 0, pnl: 0, times: [] },
      bnb: { buys: 0, sells: 0, wins: 0, pnl: 0, times: [] },
    };

    for (const symbol of SYMBOLS) {
      log(`Fetching ${symbol}...`);
      const candles30m = await fetchCandles(symbol, '30m');

      log(`\n  ✅ ${symbol}: ${candles30m.length} 30m candles\n`);

      if (candles30m.length < CONFIG.LOOKBACK_30M + 1) {
        log(`  ⚠️  Insufficient data for ${symbol}`);
        continue;
      }

      // Detect 30m swings
      const signals = detectSwings30m(candles30m);
      const signalsWithCloses = calculateCloses(signals);
      allSignals.push(...signalsWithCloses);

      const key = symbol.replace('USDT', '').toLowerCase();
      const buys = signalsWithCloses.filter(s => s.signal_type === 'buy');
      const sells = signalsWithCloses.filter(s => s.signal_type === 'sell');
      const wins = signalsWithCloses.filter(s => s.is_win);

      stats[key].buys = buys.length;
      stats[key].sells = sells.length;
      stats[key].wins = wins.length;
      stats[key].pnl = signalsWithCloses.reduce((sum, s) => sum + s.pnl_pct, 0);
      stats[key].times = signalsWithCloses
        .map(s => (new Date(s.bar_time).getTime() - new Date(s.candle30mTime).getTime()) / 60000)
        .filter(t => t > 0);

      const avgTime = stats[key].times.length > 0
        ? (stats[key].times.reduce((a, b) => a + b, 0) / stats[key].times.length).toFixed(1)
        : 0;
      const winRate = stats[key].buys + stats[key].sells > 0
        ? ((stats[key].wins / (stats[key].buys + stats[key].sells)) * 100).toFixed(2)
        : 0;

      log(`  📊 ${symbol}: ${stats[key].buys} buys, ${stats[key].sells} sells, ${stats[key].wins} wins`);
      log(`     Win Rate: ${winRate}% | PnL: ${stats[key].pnl.toFixed(2)}% | Avg Fire Time: ${avgTime}m from 30m open\n`);
    }

    // Summary
    log('═'.repeat(80));
    log('\n✅ BACKTEST COMPLETE: 30m Swing + 5m Confirmation\n');

    const totalSignals = allSignals.length;
    const totalWins = Object.values(stats).reduce((sum, s) => sum + s.wins, 0);
    const totalPnL = allSignals.reduce((sum, s) => sum + s.pnl_pct, 0);
    const allTimes = Object.values(stats).flatMap(s => s.times);
    const avgFireTime = allTimes.length > 0
      ? (allTimes.reduce((a, b) => a + b, 0) / allTimes.length).toFixed(1)
      : 0;
    const winRate = totalSignals > 0 ? ((totalWins / totalSignals) * 100).toFixed(2) : 0;

    log(`📊 OVERALL STATS:`);
    log(`   • Total Signals: ${totalSignals}`);
    log(`   • Total Wins: ${totalWins}`);
    log(`   • Win Rate: ${winRate}%`);
    log(`   • Total PnL: ${totalPnL.toFixed(2)}%`);
    log(`   • Annual PnL: ${(totalPnL * (365 / 365)).toFixed(2)}%`);
    log(`   • Avg Fire Time: ${avgFireTime} minutes from 30m open\n`);

    log(`📊 BY SYMBOL:`);
    Object.entries(stats).forEach(([sym, s]) => {
      const total = s.buys + s.sells;
      const wr = total > 0 ? ((s.wins / total) * 100).toFixed(2) : 0;
      const avg = s.times.length > 0 ? (s.times.reduce((a, b) => a + b, 0) / s.times.length).toFixed(1) : 0;
      log(`   ${sym.toUpperCase()}: ${total} trades, ${wr}% win, ${s.pnl.toFixed(2)}% pnl, ${avg}m avg time`);
    });

    log('\n' + '═'.repeat(80));
    log('\n📊 COMPARISON vs 1h STRATEGY:\n');
    log(`                 | 30m Strategy    | 1h Strategy     | Difference`);
    log(`─────────────────|─────────────────|─────────────────|────────────`);
    log(`Total Signals    | ${totalSignals.toString().padEnd(15)} | 25,683          | ${(totalSignals - 25683).toString().padEnd(10)}`);
    log(`Win Rate         | ${winRate.toString().padEnd(15)}% | 100.00%         | ${(parseFloat(winRate) - 100).toFixed(2).padEnd(10)}`);
    log(`Annual PnL       | ${totalPnL.toFixed(2).toString().padEnd(15)}% | +109,488%       | ${(totalPnL - 109488).toFixed(2).padEnd(10)}`);
    log(`Avg Fire Time    | ${avgFireTime.toString().padEnd(15)}m | 46.4m           | ${(parseFloat(avgFireTime) - 46.4).toFixed(1).padEnd(10)}`);
    log(`Speed Gain       | ${(30 - parseFloat(avgFireTime)).toFixed(1).toString().padEnd(15)}m | 13.6m           | ${((30 - parseFloat(avgFireTime)) - 13.6).toFixed(1).padEnd(10)}`);

    log('\n' + '═'.repeat(80));

    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

main();
