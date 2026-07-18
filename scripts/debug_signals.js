/**
 * Debug script to check if signals are in the database
 */

require('dotenv').config({ path: './telegram-signal-worker/.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function debug() {
  try {
    console.log('🔍 Checking database...\n');

    // Check total signal count
    const { data: allSignals, error: countError } = await supabase
      .from('signals')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting signals:', countError.message);
      process.exit(1);
    }

    console.log('📊 Total signals in database:', allSignals?.length || 'Unknown');

    // Check signals by symbol
    for (const symbol of ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']) {
      const { data, error } = await supabase
        .from('signals')
        .select('id, symbol, interval, bar_time, signal_type')
        .eq('symbol', symbol)
        .eq('interval', '30m')
        .order('bar_time', { ascending: false })
        .limit(5);

      if (error) {
        console.error(`❌ Error fetching ${symbol}:`, error.message);
        continue;
      }

      console.log(`\n📍 ${symbol} (30m) - Found: ${data?.length || 0}`);
      if (data && data.length > 0) {
        console.log('  Recent signals:');
        data.forEach(s => {
          console.log(`    - ${s.signal_type.toUpperCase()} at ${s.bar_time}`);
        });
      }
    }

    // Check candles
    const { data: candles, error: candleError } = await supabase
      .from('ohlcv_cache')
      .select('id', { count: 'exact', head: true });

    if (!candleError) {
      console.log(`\n📊 Total candles in database: ${candles?.length || 'Unknown'}`);
    }

    console.log('\n✅ Debug complete');
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

debug();
