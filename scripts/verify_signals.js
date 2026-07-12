#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { count: total } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true });

  console.log(`Total signals in database: ${total}`);

  const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
  for (const sym of symbols) {
    const { count } = await supabase
      .from('signals')
      .select('*', { count: 'exact', head: true })
      .eq('symbol', sym)
      .eq('interval', '30m');

    console.log(`${sym}: ${count}`);
  }
}

main();
