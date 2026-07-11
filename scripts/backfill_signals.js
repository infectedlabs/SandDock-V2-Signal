#!/usr/bin/env node
/**
 * Sanddock Signal Backfiller
 * Downloads historical OHLCV data from Binance and generates calibrated signals
 * using Heikin Ashi + Bollinger Bands methodology
 *
 * Usage:
 *   node scripts/backfill_signals.js [--symbol BTCUSDT] [--days 365] [--intervals 15m,1h,4h,30m]
 */

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';

const BINANCE_API = 'https://api.binance.com/api/v3';
const INTERVALS = ['15m', '30m', '1h', '4h'];
const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
const LOOKBACK_DAYS = 365;

// Signal generation parameters
const BB_DEVIATION = 1.6;
const SL_PCT = 1.5;
const TP_PCT = 1.5;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function intervalsToMs(interval) {
  const matches = interval.match(/^(\d+)([mh])$/);
  if (!matches) throw new Error(`Invalid interval: ${interval}`);
  const [, num, unit] = matches;
  const minutes = unit === 'm' ? parseInt(num) : parseInt(num) * 60;
  return minutes * 60 * 1000;
}

async function fetchBinanceCandles(symbol, interval, daysBack = 365) {
  const limit = 1000;
  const intervalMs = intervalsToMs(interval);
  const candles = [];

  let endTime = Date.now();
  const startTime = endTime - daysBack * 24 * 60 * 60 * 1000;

  console.log(`Fetching ${symbol} ${interval} candles (${daysBack} days)...`);

  while (endTime > startTime) {
    try {
      const response = await axios.get(`${BINANCE_API}/klines`, {
        params: {
          symbol,
          interval,
          endTime,
          limit,
        },
        timeout: 5000,
      });

      const batch = response.data.map(k => ({
        open_time: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[7]),
      }));

      if (batch.length === 0) break;
      candles.unshift(...batch);

      endTime = batch[0].open_time - intervalMs;
      console.log(`  Fetched ${batch.length} candles, oldest: ${new Date(batch[0].open_time).toISOString()}`);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (err) {
      console.error(`Binance API error: ${err.message}`);
      break;
    }
  }

  console.log(`✓ Fetched ${candles.length} total candles for ${symbol} ${interval}`);
  return candles;
}

function toHeikinAshi(candles) {
  if (!candles || candles.length === 0) return [];
  const ha = [];
  let prevOpen = (candles[0].open + candles[0].close) / 2;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = i === 0 ? prevOpen : (prevOpen + ha[i - 1].ha_close) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);

    ha.push({
      ...c,
      ha_open: haOpen,
      ha_close: haClose,
      ha_high: haHigh,
      ha_low: haLow,
    });
    prevOpen = haOpen;
  }
  return ha;
}

function detectSignals(ha) {
  if (!ha || ha.length < 20) return [];
  const signals = [];
  const n = ha.length;
  const upper = new Array(n).fill(null);
  const lower = new Array(n).fill(null);

  // Calculate Bollinger Bands
  for (let i = 19; i < n; i++) {
    const slice = ha.slice(i - 19, i + 1);
    const closes = slice.map(c => c.close);
    const sma = closes.reduce((a, b) => a + b, 0) / 20;
    const variance = closes.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / 20;
    const std = Math.sqrt(variance);
    upper[i] = sma + std * BB_DEVIATION;
    lower[i] = sma - std * BB_DEVIATION;
  }

  let lastSignalTime = null;

  for (let i = 20; i < n; i++) {
    const close = ha[i].close;
    const up = upper[i];
    const lo = lower[i];
    if (up === null || lo === null) continue;

    // Generate buy signal if price touches lower band
    if (close <= lo && (!lastSignalTime || ha[i].open_time - lastSignalTime > 60000)) {
      signals.push({
        bar_time: new Date(ha[i].open_time).toISOString(),
        signal_type: 'buy',
        entry_price: close,
        sl_price: Number((close * (1 - SL_PCT / 100)).toFixed(8)),
        tp_price: Number((close * (1 + TP_PCT / 100)).toFixed(8)),
        sl_pct: SL_PCT,
        tp_pct: TP_PCT,
        confidence: 75,
      });
      lastSignalTime = ha[i].open_time;
    }
    // Generate sell signal if price touches upper band
    else if (close >= up && (!lastSignalTime || ha[i].open_time - lastSignalTime > 60000)) {
      signals.push({
        bar_time: new Date(ha[i].open_time).toISOString(),
        signal_type: 'sell',
        entry_price: close,
        sl_price: Number((close * (1 + SL_PCT / 100)).toFixed(8)),
        tp_price: Number((close * (1 - TP_PCT / 100)).toFixed(8)),
        sl_pct: SL_PCT,
        tp_pct: TP_PCT,
        confidence: 75,
      });
      lastSignalTime = ha[i].open_time;
    }
  }

  return signals;
}

function calculatePnL(signal, nextCandle) {
  if (!signal || !nextCandle) return null;

  const entry = signal.entry_price;
  const nextClose = nextCandle.close;
  const isBuy = signal.signal_type === 'buy';

  // Check if TP or SL is hit
  const tpPrice = signal.tp_price;
  const slPrice = signal.sl_price;

  let hitTp = false;
  let hitSl = false;

  if (isBuy) {
    hitTp = nextCandle.high >= tpPrice;
    hitSl = nextCandle.low <= slPrice;
  } else {
    hitTp = nextCandle.low <= tpPrice;
    hitSl = nextCandle.high >= slPrice;
  }

  let pnl;
  if (hitTp) {
    pnl = signal.tp_pct;
  } else if (hitSl) {
    pnl = -signal.sl_pct;
  } else {
    pnl = ((nextClose - entry) / entry) * 100;
    if (!isBuy) pnl = -pnl;
  }

  return {
    pnl_pct: Number(pnl.toFixed(4)),
    is_win: pnl >= 0,
    close_price: hitTp || hitSl ? (isBuy ? tpPrice : slPrice) : nextClose,
    close_reason: hitTp ? 'tp' : hitSl ? 'sl' : 'next_candle',
  };
}

async function backfillSignals(symbol, interval) {
  console.log(`\n📊 Backfilling ${symbol} ${interval}...`);

  // Fetch candles
  const candles = await fetchBinanceCandles(symbol, interval, LOOKBACK_DAYS);
  if (candles.length === 0) {
    console.warn(`No candles fetched for ${symbol} ${interval}`);
    return 0;
  }

  // Convert to Heikin Ashi
  const ha = toHeikinAshi(candles);

  // Detect signals
  const baseSignals = detectSignals(ha);
  console.log(`✓ Detected ${baseSignals.length} base signals`);

  // Calculate PnL for each signal
  const finalSignals = [];
  for (let i = 0; i < baseSignals.length; i++) {
    const sig = baseSignals[i];
    const sigTime = new Date(sig.bar_time).getTime();

    // Find next candle after this signal
    const nextCandleIdx = ha.findIndex(c => c.open_time > sigTime);
    if (nextCandleIdx >= 0 && nextCandleIdx < ha.length) {
      const nextCandle = ha[nextCandleIdx];
      const pnlData = calculatePnL(sig, nextCandle);

      if (pnlData) {
        finalSignals.push({
          ...sig,
          ...pnlData,
          symbol: symbol.toUpperCase(),
          interval,
          action: 'new',
          swing_group_id: `${symbol}-${interval}-${i}`,
          created_at: sig.bar_time,
        });
      }
    }
  }

  console.log(`✓ Calculated PnL for ${finalSignals.length} signals`);

  // Upsert into database
  if (finalSignals.length > 0) {
    const { error } = await supabaseAdmin
      .from('signals')
      .upsert(finalSignals, { onConflict: 'symbol,interval,bar_time' });

    if (error) {
      console.error(`DB error: ${error.message}`);
      return 0;
    }
    console.log(`✓ Inserted ${finalSignals.length} signals into DB`);
  }

  // Also save OHLCV cache for charting
  const ohlcvRecords = ha.map(c => ({
    symbol: symbol.toUpperCase(),
    interval,
    open_time: new Date(c.open_time).toISOString(),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
    ha_open: c.ha_open,
    ha_high: c.ha_high,
    ha_low: c.ha_low,
    ha_close: c.ha_close,
  }));

  const { error: ohlcvError } = await supabaseAdmin
    .from('ohlcv_cache')
    .upsert(ohlcvRecords, { onConflict: 'symbol,interval,open_time' });

  if (ohlcvError) {
    console.error(`OHLCV DB error: ${ohlcvError.message}`);
  } else {
    console.log(`✓ Cached ${ohlcvRecords.length} OHLCV records`);
  }

  return finalSignals.length;
}

async function main() {
  console.log('🚀 Sanddock Signal Backfiller v1.0');
  console.log('====================================\n');

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }

  let totalSignals = 0;

  for (const symbol of SYMBOLS) {
    for (const interval of INTERVALS) {
      try {
        const count = await backfillSignals(symbol, interval);
        totalSignals += count;
      } catch (err) {
        console.error(`Error backfilling ${symbol} ${interval}: ${err.message}`);
      }
    }
  }

  console.log(`\n✅ Backfill complete! Total signals: ${totalSignals}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
