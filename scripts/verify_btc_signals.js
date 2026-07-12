#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Total BTC signals
  const { count: total } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .eq('symbol', 'BTCUSDT')
    .eq('interval', '30m');

  // Wins/Losses
  const { count: wins } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .eq('symbol', 'BTCUSDT')
    .eq('interval', '30m')
    .eq('is_win', true);

  // Date range
  const { data: signals } = await supabase
    .from('signals')
    .select('bar_time')
    .eq('symbol', 'BTCUSDT')
    .eq('interval', '30m')
    .order('bar_time', { ascending: true })
    .limit(1);

  const { data: latest } = await supabase
    .from('signals')
    .select('bar_time')
    .eq('symbol', 'BTCUSDT')
    .eq('interval', '30m')
    .order('bar_time', { ascending: false })
    .limit(1);

  console.log('📊 BTC 30M SIGNALS STATUS');
  console.log('='.repeat(50));
  console.log(`Total signals: ${total}`);
  console.log(`Winning trades: ${wins}`);
  console.log(`Loss trades: ${total - wins}`);
  console.log(`Win rate: ${((wins / total) * 100).toFixed(1)}%`);
  console.log(`\nDate range:`);
  console.log(`  Start: ${signals?.[0]?.bar_time || 'N/A'}`);
  console.log(`  End: ${latest?.[0]?.bar_time || 'N/A'}`);
  console.log('='.repeat(50) + '\n');
}

main();
