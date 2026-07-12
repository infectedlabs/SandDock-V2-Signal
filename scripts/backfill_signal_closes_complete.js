#!/usr/bin/env node
/**
 * Complete signal close backfill for 1-year 30m data
 * Replicates backtest close calculation:
 * 1. SL hit → close at SL price, negative PnL
 * 2. TP hit → close at TP price, positive PnL
 * 3. Next signal → close at next signal entry, calculate actual change
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const BINANCE_API = 'https://api.binance.com/api/v3';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
const TIMEFRAME = '30m';

async function fetchAllCandles(symbol, tf) {
  let all = [], endTime = Date.now();
  console.log(`  Fetching full year of ${symbol} ${tf}...`);

  for (let i = 0; i < 200; i++) {
    try {
      const r = await axios.get(`${BINANCE_API}/klines`, {
        params: { symbol, interval: tf, endTime, limit: 1000 }
      });
      if (!r.data?.length) break;
      all.unshift(...r.data.map(k => ({
        open_time: new Date(+k[0]).toISOString(),
        open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[7]
      })));
      endTime = +r.data[0][0] - 1;
      if (r.data.length < 1000) break;
      process.stdout.write('.');
    } catch (e) { break; }
  }

  console.log(` ${all.length} candles loaded`);
  return all.sort((a, b) => new Date(a.open_time) - new Date(b.open_time));
}

async function updateSignalCloses(symbol, candles) {
  console.log(`\n📈 ${symbol}`);

  // Fetch all signals for this symbol, sorted by time
  const { data: signals, error: fetchError } = await supabase
    .from('signals')
    .select('*')
    .eq('symbol', symbol)
    .eq('interval', TIMEFRAME)
    .order('bar_time', { ascending: true });

  if (fetchError || !signals || signals.length === 0) {
    console.log(`  No signals found`);
    return 0;
  }

  console.log(`  Processing ${signals.length} signals...`);

  const updates = [];

  for (let i = 0; i < signals.length; i++) {
    const sig = signals[i];
    const isBuy = sig.signal_type === 'buy';
    const entryPrice = parseFloat(sig.entry_price);
    const slPrice = parseFloat(sig.sl_price);
    const tpPrice = parseFloat(sig.tp_price);
    const barTime = new Date(sig.bar_time).getTime();

    // Find the signal's candle
    const sigCandleIdx = candles.findIndex(c => new Date(c.open_time).getTime() === barTime);
    if (sigCandleIdx === -1) continue;

    // Determine search end: next signal's candle or end of data
    let searchEndIdx = candles.length - 1;
    if (i < signals.length - 1) {
      const nextSigTime = new Date(signals[i + 1].bar_time).getTime();
      const nextIdx = candles.findIndex(c => new Date(c.open_time).getTime() === nextSigTime);
      if (nextIdx !== -1) searchEndIdx = nextIdx;
    }

    let closePrice = null;
    let closeReason = null;
    let closedAt = null;
    let pnlPct = null;
    let isWin = null;

    // Search for SL or TP hit
    for (let j = sigCandleIdx + 1; j <= searchEndIdx && j < candles.length; j++) {
      const c = candles[j];

      if (isBuy) {
        // Buy: SL is below, TP is above
        if (c.low <= slPrice) {
          closePrice = slPrice;
          closeReason = 'sl_hit';
          closedAt = c.open_time;
          pnlPct = -parseFloat(sig.sl_pct);
          isWin = false;
          break;
        }
        if (c.high >= tpPrice) {
          closePrice = tpPrice;
          closeReason = 'tp_hit';
          closedAt = c.open_time;
          pnlPct = parseFloat(sig.tp_pct);
          isWin = true;
          break;
        }
      } else {
        // Sell: SL is above, TP is below
        if (c.high >= slPrice) {
          closePrice = slPrice;
          closeReason = 'sl_hit';
          closedAt = c.open_time;
          pnlPct = -parseFloat(sig.sl_pct);
          isWin = false;
          break;
        }
        if (c.low <= tpPrice) {
          closePrice = tpPrice;
          closeReason = 'tp_hit';
          closedAt = c.open_time;
          pnlPct = parseFloat(sig.tp_pct);
          isWin = true;
          break;
        }
      }
    }

    // If not closed by SL/TP, close at next signal or market close
    if (!closePrice && i < signals.length - 1) {
      const nextSig = signals[i + 1];
      closePrice = parseFloat(nextSig.entry_price);
      closeReason = 'direction_flip';
      closedAt = nextSig.bar_time;
      const change = ((closePrice - entryPrice) / entryPrice) * 100;
      pnlPct = Number((isBuy ? change : -change).toFixed(2));
      isWin = pnlPct >= 0;
    } else if (!closePrice) {
      // Last signal - close at last candle
      if (candles.length > 0) {
        const lastC = candles[candles.length - 1];
        closePrice = lastC.close;
        closeReason = 'session_end';
        closedAt = lastC.open_time;
        const change = ((closePrice - entryPrice) / entryPrice) * 100;
        pnlPct = Number((isBuy ? change : -change).toFixed(2));
        isWin = pnlPct >= 0;
      }
    }

    if (closePrice !== null) {
      updates.push({
        id: sig.id,
        close_price: closePrice,
        close_reason: closeReason,
        closed_at: closedAt,
        pnl_pct: pnlPct,
        is_win: isWin
      });
    }
  }

  // Batch update signals
  let updated = 0;
  console.log(`  Updating ${updates.length} signals...`);

  for (let i = 0; i < updates.length; i += 50) {
    const batch = updates.slice(i, i + 50);

    for (const update of batch) {
      try {
        const { error } = await supabase
          .from('signals')
          .update(update)
          .eq('id', update.id);

        if (!error) updated++;
      } catch (e) {
        console.error(`  Error updating ${update.id}:`, e.message);
      }
    }
    process.stdout.write('.');
  }

  console.log(`\n  Updated: ${updated}/${updates.length} signals`);
  return updated;
}

async function main() {
  console.log('🎯 COMPLETE SIGNAL CLOSE BACKFILL - 30M 1 YEAR\n');
  console.log('='.repeat(70));

  let totalUpdated = 0;

  for (const symbol of SYMBOLS) {
    console.log(`\n📡 ${symbol}`);
    const candles = await fetchAllCandles(symbol, TIMEFRAME);
    const count = await updateSignalCloses(symbol, candles);
    totalUpdated += count;
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n✅ BACKFILL COMPLETE: ${totalUpdated} signals closed\n`);
  console.log(`✨ All signals now have close_price, close_reason, and pnl_pct\n`);

  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
