#!/usr/bin/env node
/**
 * Calculate and backfill close prices for 1-year 30m signals
 * Detects SL/TP hits and marks closed signals
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

async function fetchCandles(symbol, tf, startTime, endTime) {
  let all = [], end = endTime;
  console.log(`  Fetching ${symbol} ${tf} from ${new Date(startTime).toISOString().split('T')[0]}...`);

  for (let i = 0; i < 200; i++) {
    try {
      const r = await axios.get(`${BINANCE_API}/klines`, {
        params: { symbol, interval: tf, startTime, endTime: end, limit: 1000 }
      });
      if (!r.data?.length) break;
      all.unshift(...r.data.map(k => ({
        open_time: new Date(+k[0]).toISOString(),
        open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[7]
      })));
      end = +r.data[0][0] - 1;
      if (r.data.length < 1000) break;
      process.stdout.write('.');
    } catch (e) { break; }
  }

  console.log(` ${all.length} candles loaded`);
  return all.sort((a, b) => new Date(a.open_time) - new Date(b.open_time));
}

async function updateSignalCloses(symbol) {
  console.log(`\n📈 ${symbol}`);

  // Fetch all signals for this symbol
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

  // Fetch all candles for the period
  const minTime = new Date(signals[0].bar_time).getTime();
  const maxTime = new Date(signals[signals.length - 1].bar_time).getTime() + (30 * 60 * 1000);
  const candles = await fetchCandles(symbol, TIMEFRAME, minTime, maxTime);

  const updates = [];
  for (let i = 0; i < signals.length; i++) {
    const sig = signals[i];
    const isBuy = sig.signal_type === 'buy';
    const entryPrice = parseFloat(sig.entry_price);
    const slPrice = parseFloat(sig.sl_price);
    const tpPrice = parseFloat(sig.tp_price);
    const barTime = new Date(sig.bar_time).getTime();

    // Find candle index for this signal
    const sigCandleIdx = candles.findIndex(c => new Date(c.open_time).getTime() === barTime);
    if (sigCandleIdx === -1) continue;

    // Find next signal's candle index
    const nextSig = i < signals.length - 1 ? signals[i + 1] : null;
    const nextCandleTime = nextSig ? new Date(nextSig.bar_time).getTime() : new Date().getTime();
    const nextCandleIdx = candles.findIndex(c => new Date(c.open_time).getTime() === nextCandleTime);
    const searchEndIdx = nextCandleIdx !== -1 ? nextCandleIdx : candles.length - 1;

    let closed = false;
    let closePrice = null;
    let closeReason = null;
    let closedAt = null;
    let pnlPct = null;
    let isWin = null;

    // Search for SL or TP hit between this signal and next
    for (let j = sigCandleIdx + 1; j <= searchEndIdx; j++) {
      const c = candles[j];

      if (isBuy) {
        if (c.low <= slPrice) {
          closePrice = slPrice;
          closeReason = 'sl_hit';
          closedAt = c.open_time;
          pnlPct = -parseFloat(sig.sl_pct);
          isWin = false;
          closed = true;
          break;
        }
        if (c.high >= tpPrice) {
          closePrice = tpPrice;
          closeReason = 'tp_hit';
          closedAt = c.open_time;
          pnlPct = parseFloat(sig.tp_pct);
          isWin = true;
          closed = true;
          break;
        }
      } else {
        if (c.high >= slPrice) {
          closePrice = slPrice;
          closeReason = 'sl_hit';
          closedAt = c.open_time;
          pnlPct = -parseFloat(sig.sl_pct);
          isWin = false;
          closed = true;
          break;
        }
        if (c.low <= tpPrice) {
          closePrice = tpPrice;
          closeReason = 'tp_hit';
          closedAt = c.open_time;
          pnlPct = parseFloat(sig.tp_pct);
          isWin = true;
          closed = true;
          break;
        }
      }
    }

    // If not closed by SL/TP, mark as closed by next signal
    if (!closed && nextSig) {
      closePrice = parseFloat(nextSig.entry_price);
      closeReason = 'direction_flip';
      closedAt = nextSig.bar_time;
      const change = ((closePrice - entryPrice) / entryPrice) * 100;
      pnlPct = Number((isBuy ? change : -change).toFixed(2));
      isWin = pnlPct >= 0;
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
  for (let i = 0; i < updates.length; i += 100) {
    const batch = updates.slice(i, i + 100);

    for (const update of batch) {
      const { error } = await supabase
        .from('signals')
        .update(update)
        .eq('id', update.id);

      if (!error) updated++;
    }
  }

  console.log(`  Updated: ${updated}/${signals.length} signals`);
  return updated;
}

async function main() {
  console.log('🎯 BACKFILL SIGNAL CLOSES - 30M 1 YEAR\n');
  console.log('='.repeat(70));

  let totalUpdated = 0;
  for (const symbol of SYMBOLS) {
    const count = await updateSignalCloses(symbol);
    totalUpdated += count;
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n✅ BACKFILL COMPLETE: ${totalUpdated} signal closes calculated\n`);

  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
