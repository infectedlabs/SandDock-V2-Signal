#!/usr/bin/env node
/**
 * FAST parallel backfill for ALL 61,675 signals
 * Uses bulk operations and parallel processing
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
const BATCH_SIZE = 500; // Larger batches for faster updates

async function fetchAllCandles(symbol, tf) {
  let all = [], endTime = Date.now();

  for (let i = 0; i < 200; i++) {
    try {
      const r = await axios.get(`${BINANCE_API}/klines`, {
        params: { symbol, interval: tf, endTime, limit: 1000 }
      });
      if (!r.data?.length) break;
      all.unshift(...r.data.map(k => ({
        time: +k[0],
        open_time: new Date(+k[0]).toISOString(),
        open: +k[1], high: +k[2], low: +k[3], close: +k[4]
      })));
      endTime = +r.data[0][0] - 1;
      if (r.data.length < 1000) break;
      process.stdout.write('.');
    } catch (e) { break; }
  }

  return all.sort((a, b) => a.time - b.time);
}

async function getAllSignals(symbol) {
  let allSignals = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data: signals, error } = await supabase
      .from('signals')
      .select('*')
      .eq('symbol', symbol)
      .eq('interval', TIMEFRAME)
      .order('bar_time', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error || !signals) break;
    if (signals.length === 0) break;

    allSignals.push(...signals);
    page++;
    process.stdout.write('.');
  }

  return allSignals;
}

function processAllCloses(allSignals, candles) {
  const updates = [];

  for (let i = 0; i < allSignals.length; i++) {
    const sig = allSignals[i];
    const isBuy = sig.signal_type === 'buy';
    const entryPrice = parseFloat(sig.entry_price);
    const slPrice = parseFloat(sig.sl_price);
    const tpPrice = parseFloat(sig.tp_price);
    const barTime = new Date(sig.bar_time).getTime();

    // Find candle
    const sigCandleIdx = candles.findIndex(c => c.time === barTime);
    if (sigCandleIdx === -1) continue;

    // Search end
    let searchEndIdx = candles.length - 1;
    if (i < allSignals.length - 1) {
      const nextTime = new Date(allSignals[i + 1].bar_time).getTime();
      const nextIdx = candles.findIndex(c => c.time === nextTime);
      if (nextIdx !== -1) searchEndIdx = nextIdx;
    }

    let closePrice = null, closeReason = null, closedAt = null, pnlPct = null, isWin = null;

    // Search for SL/TP
    for (let j = sigCandleIdx + 1; j <= searchEndIdx && j < candles.length; j++) {
      const c = candles[j];

      if (isBuy) {
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

    // Flip or end
    if (!closePrice && i < allSignals.length - 1) {
      const nextSig = allSignals[i + 1];
      closePrice = parseFloat(nextSig.entry_price);
      closeReason = 'direction_flip';
      closedAt = nextSig.bar_time;
      const change = ((closePrice - entryPrice) / entryPrice) * 100;
      pnlPct = Number((isBuy ? change : -change).toFixed(2));
      isWin = pnlPct >= 0;
    } else if (!closePrice && candles.length > 0) {
      const lastC = candles[candles.length - 1];
      closePrice = lastC.close;
      closeReason = 'session_end';
      closedAt = lastC.open_time;
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

  return updates;
}

async function batchUpdateSignals(updates) {
  console.log(`  Updating ${updates.length} signals in parallel...`);
  let updated = 0;
  let failed = 0;

  // Process in parallel batches
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);

    // Run updates in parallel
    const promises = batch.map(update =>
      supabase
        .from('signals')
        .update({
          close_price: update.close_price,
          close_reason: update.close_reason,
          closed_at: update.closed_at,
          pnl_pct: update.pnl_pct,
          is_win: update.is_win
        })
        .eq('id', update.id)
        .then(() => { updated++; })
        .catch(() => { failed++; })
    );

    await Promise.all(promises);
    process.stdout.write('.');
  }

  console.log(`\n  Updated: ${updated}, Failed: ${failed}`);
  return updated;
}

async function main() {
  console.log('⚡ FAST PARALLEL BACKFILL - ALL 61K SIGNALS\n');
  console.log('='.repeat(70));

  let totalUpdated = 0;

  for (const symbol of SYMBOLS) {
    console.log(`\n📈 ${symbol}`);
    console.log('  Fetching candles...');
    const candles = await fetchAllCandles(symbol, TIMEFRAME);

    console.log(`\n  Fetching signals...`);
    const signals = await getAllSignals(symbol);

    console.log(`\n  Processing ${signals.length} closes...`);
    const updates = processAllCloses(signals, candles);

    const updated = await batchUpdateSignals(updates);
    totalUpdated += updated;
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n✅ COMPLETE: ${totalUpdated} signals updated with P&L\n`);

  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
