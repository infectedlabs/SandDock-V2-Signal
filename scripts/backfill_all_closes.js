#!/usr/bin/env node
/**
 * Complete backfill for ALL signals (no 1000 limit)
 * Processes signals in batches to handle full 61k dataset
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
const BATCH_SIZE = 100;

async function fetchAllCandles(symbol, tf) {
  let all = [], endTime = Date.now();
  console.log(`  Fetching ${symbol} ${tf}...`);

  for (let i = 0; i < 200; i++) {
    try {
      const r = await axios.get(`${BINANCE_API}/klines`, {
        params: { symbol, interval: tf, endTime, limit: 1000 }
      });
      if (!r.data?.length) break;
      all.unshift(...r.data.map(k => ({
        open_time: new Date(+k[0]).toISOString(),
        open: +k[1], high: +k[2], low: +k[3], close: +k[4]
      })));
      endTime = +r.data[0][0] - 1;
      if (r.data.length < 1000) break;
      process.stdout.write('.');
    } catch (e) { break; }
  }

  console.log(` ${all.length} candles`);
  return all.sort((a, b) => new Date(a.open_time) - new Date(b.open_time));
}

async function getAllSignals(symbol) {
  let allSignals = [];
  let page = 0;
  const pageSize = 500; // Fetch 500 at a time

  console.log(`  Fetching all signals for ${symbol}...`);

  while (true) {
    const { data: signals, error } = await supabase
      .from('signals')
      .select('*')
      .eq('symbol', symbol)
      .eq('interval', TIMEFRAME)
      .order('bar_time', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error || !signals) {
      console.log(`  Error fetching page ${page}: ${error?.message || 'no data'}`);
      break;
    }

    if (signals.length === 0) break;

    allSignals.push(...signals);
    page++;
    process.stdout.write('.');
  }

  console.log(` ${allSignals.length} total`);
  return allSignals;
}

async function closeSignals(symbol, allSignals, candles) {
  console.log(`  Processing ${allSignals.length} signals...`);

  const updates = [];

  for (let i = 0; i < allSignals.length; i++) {
    const sig = allSignals[i];
    const isBuy = sig.signal_type === 'buy';
    const entryPrice = parseFloat(sig.entry_price);
    const slPrice = parseFloat(sig.sl_price);
    const tpPrice = parseFloat(sig.tp_price);
    const barTime = new Date(sig.bar_time).getTime();

    // Find candle
    const sigCandleIdx = candles.findIndex(c => new Date(c.open_time).getTime() === barTime);
    if (sigCandleIdx === -1) continue;

    // Search end
    let searchEndIdx = candles.length - 1;
    if (i < allSignals.length - 1) {
      const nextTime = new Date(allSignals[i + 1].bar_time).getTime();
      const nextIdx = candles.findIndex(c => new Date(c.open_time).getTime() === nextTime);
      if (nextIdx !== -1) searchEndIdx = nextIdx;
    }

    let closePrice = null;
    let closeReason = null;
    let closedAt = null;
    let pnlPct = null;
    let isWin = null;

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

  // Batch updates
  console.log(`  Updating ${updates.length} signals...`);
  let updated = 0;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);

    for (const update of batch) {
      try {
        const { error } = await supabase
          .from('signals')
          .update(update)
          .eq('id', update.id);

        if (!error) updated++;
      } catch (e) {}
    }
    process.stdout.write('.');
  }

  console.log(`\n  Updated: ${updated}/${updates.length}`);
  return updated;
}

async function main() {
  console.log('🎯 COMPLETE BACKFILL - ALL 61K SIGNALS\n');
  console.log('='.repeat(70));

  let totalUpdated = 0;

  for (const symbol of SYMBOLS) {
    console.log(`\n📈 ${symbol}`);
    const candles = await fetchAllCandles(symbol, TIMEFRAME);
    const signals = await getAllSignals(symbol);
    const updated = await closeSignals(symbol, signals, candles);
    totalUpdated += updated;
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n✅ COMPLETE: ${totalUpdated} signals closed with P&L\n`);

  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
