#!/usr/bin/env node
/**
 * Diagnose: Are the signals from 30m or 15m candles?
 * Compare signal entry prices with actual Binance 30m vs 15m candles
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const BINANCE_API = 'https://api.binance.com/api/v3';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchBinanceCandles(symbol, interval, limit = 100) {
  try {
    const { data } = await axios.get(`${BINANCE_API}/klines`, {
      params: { symbol, interval, limit }
    });
    return data.map(k => ({
      time: +k[0],
      open: +k[1],
      high: +k[2],
      low: +k[3],
      close: +k[4]
    })).sort((a, b) => a.time - b.time);
  } catch (e) {
    console.error(`Fetch error for ${interval}:`, e.message);
    return [];
  }
}

async function main() {
  console.log('🔍 DIAGNOSING 30m vs 15m MISMATCH\n' + '='.repeat(80) + '\n');

  // Fetch candles
  console.log('⚡ Fetching latest candles from Binance...\n');

  const candles30m = await fetchBinanceCandles('BTCUSDT', '30m', 100);
  const candles15m = await fetchBinanceCandles('BTCUSDT', '15m', 200);

  console.log(`✓ Fetched ${candles30m.length} x 30m candles`);
  console.log(`✓ Fetched ${candles15m.length} x 15m candles\n`);

  // Get signals from database
  const { data: dbSignals } = await supabase
    .from('signals')
    .select('bar_time, signal_type, entry_price, interval')
    .eq('symbol', 'BTCUSDT')
    .order('bar_time', { ascending: false })
    .limit(30);

  console.log(`✓ Fetched ${dbSignals.length} recent signals from database\n`);

  // Check each signal
  console.log('TESTING SIGNALS:\n');

  let match30mCount = 0;
  let match15mCount = 0;
  let match30mOnly = 0;
  let match15mOnly = 0;

  for (const sig of dbSignals.slice(0, 10)) {
    const sigTime = new Date(sig.bar_time).getTime();
    const isSwingHigh = sig.signal_type === 'sell'; // SELL signals are at swing highs
    const isSwingLow = sig.signal_type === 'buy';   // BUY signals are at swing lows

    // Find candles with exact time match
    const match30m = candles30m.find(c => c.time === sigTime);
    const match15m = candles15m.find(c => c.time === sigTime);

    if (match30m) {
      const priceField = isSwingHigh ? 'high' : 'low';
      const matches = Math.abs(sig.entry_price - match30m[priceField]) < 1;
      if (matches) match30mCount++;
    }

    if (match15m) {
      const priceField = isSwingHigh ? 'high' : 'low';
      const matches = Math.abs(sig.entry_price - match15m[priceField]) < 1;
      if (matches) match15mCount++;
    }

    // Show details for first 3
    if (dbSignals.indexOf(sig) < 3) {
      console.log(`Signal: ${sig.bar_time} (${sig.signal_type})`);
      console.log(`  Entry: $${sig.entry_price.toFixed(2)}`);

      if (match30m) {
        const priceField = isSwingHigh ? 'high' : 'low';
        const matchesPrice = Math.abs(sig.entry_price - match30m[priceField]) < 1;
        console.log(`  30m ${priceField}: $${match30m[priceField]} → ${matchesPrice ? '✓ MATCH' : '✗ no match'}`);
      } else {
        console.log(`  30m: NO CANDLE at this time`);
      }

      if (match15m) {
        const priceField = isSwingHigh ? 'high' : 'low';
        const matchesPrice = Math.abs(sig.entry_price - match15m[priceField]) < 1;
        console.log(`  15m ${priceField}: $${match15m[priceField]} → ${matchesPrice ? '✓ MATCH' : '✗ no match'}`);
      } else {
        console.log(`  15m: NO CANDLE at this time`);
      }
      console.log();
    }
  }

  console.log('='.repeat(80));
  console.log('\n📊 RESULTS FROM 10 SIGNALS:');
  console.log(`   Signals matching 30m candle: ${match30mCount}/10`);
  console.log(`   Signals matching 15m candle: ${match15mCount}/10`);
  console.log('\n💡 CONCLUSION:');
  if (match30mCount > match15mCount) {
    console.log('   ✅ Signals are from 30m candles (correct)');
  } else if (match15mCount > match30mCount) {
    console.log('   ❌ Signals are from 15m candles (PROBLEM!)');
  } else {
    console.log('   ⚠️  Cannot determine - both match equally');
  }
  console.log('\n');
}

main().then(() => process.exit(0)).catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
