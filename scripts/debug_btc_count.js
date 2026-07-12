#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // Get count
  const { count: total } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .eq('symbol', 'BTCUSDT')
    .eq('interval', '30m');

  console.log(`Total BTC signals: ${total}`);

  // Try loading all at once
  const { data, error } = await supabase
    .from('signals')
    .select('id')
    .eq('symbol', 'BTCUSDT')
    .eq('interval', '30m')
    .limit(100000);

  if (error) console.error('Error:', error.message);
  else console.log(`Loaded: ${data.length}`);
}

main();
