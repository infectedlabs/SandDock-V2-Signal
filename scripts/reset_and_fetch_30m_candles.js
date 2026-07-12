#!/usr/bin/env node
/**
 * RESET & FETCH 30M CANDLES - Clear old data and fetch fresh 30m only
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

async function deleteAllCandles() {
  console.log('⚠️  Deleting all candles from database...');
  try {
    const { error } = await supabase
      .from('candles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.warn('Delete warning:', error.message);
    } else {
      console.log('✓ All candles deleted\n');
    }
  } catch (err) {
    console.error('Delete error:', err.message);
  }
}

async function fetchAndStoreLast30Days() {
  console.log('⚡ Fetching last 30 days of 30m candles for all symbols...\n');

  for (const symbol of SYMBOLS) {
    console.log(`📊 ${symbol}`);
    let allCandles = [];
    let endTime = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const startTime = endTime - thirtyDaysMs;

    // Fetch all candles for 30 days
    for (let i = 0; i < 100; i++) {
      try {
        const { data } = await axios.get(`${BINANCE_API}/klines`, {
          params: {
            symbol,
            interval: TIMEFRAME,
            endTime,
            limit: 1000
          }
        });

        if (!data || data.length === 0) break;

        allCandles.unshift(...data.map(k => ({
          time: +k[0],
          open_time: new Date(+k[0]).toISOString(),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[7]),
          symbol,
          interval: TIMEFRAME
        })));

        const firstTime = data[0][0];
        if (firstTime < startTime) {
          allCandles = allCandles.filter(c => c.time >= startTime);
          break;
        }

        endTime = +data[0][0] - 1;
        process.stdout.write('.');
      } catch (e) {
        console.error('\n  Fetch error:', e.message);
        break;
      }
    }

    console.log(`\n  ✓ ${allCandles.length} candles loaded\n  Storing to database...`);

    // Store in batches
    const batchSize = 500;
    let stored = 0;

    for (let i = 0; i < allCandles.length; i += batchSize) {
      const batch = allCandles.slice(i, i + batchSize);
      const { error } = await supabase
        .from('candles')
        .insert(batch);

      if (error) {
        console.error(`  Batch error:`, error.message);
      } else {
        stored += batch.length;
        process.stdout.write('.');
      }
    }

    console.log(`\n  ✓ ${stored}/${allCandles.length} stored\n`);
  }
}

async function main() {
  const start = Date.now();
  console.log('🚀 RESET & FETCH 30M CANDLES\n' + '='.repeat(70) + '\n');

  try {
    await deleteAllCandles();
    await fetchAndStoreLast30Days();

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log('='.repeat(70));
    console.log(`✅ COMPLETE in ${elapsed}s`);
    console.log('✨ Database ready with fresh 30m candles\n');
  } catch (err) {
    console.error('Fatal:', err.message);
  }

  process.exit(0);
}

main();
