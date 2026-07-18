const { fetchFromBinance } = require('../src/lib/binanceFallback');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const candles = await fetchFromBinance('BTCUSDT', '30m', 500);
  const { data: signals } = await supabase
    .from('signals')
    .select('*')
    .eq('symbol', 'BTCUSDT')
    .eq('interval', '30m')
    .order('bar_time', { ascending: false })
    .limit(10);

  const offsetSeconds = -new Date().getTimezoneOffset() * 60;

  const candleTimes = candles.map(c => Math.floor(new Date(c.open_time).getTime() / 1000) + offsetSeconds);
  const signalTimes = signals.map(s => Math.floor(new Date(s.bar_time).getTime() / 1000) + offsetSeconds);

  console.log('Sample candle times (last 5):', candleTimes.slice(-5));
  console.log('Sample signal times (first 5):', signalTimes.slice(0, 5));

  // Check if any signal time matches any candle time
  const matches = signalTimes.filter(st => candleTimes.includes(st));
  console.log('Matching times count:', matches.length);
  if (matches.length > 0) {
    console.log('Matching times:', matches);
  }
}

check();
