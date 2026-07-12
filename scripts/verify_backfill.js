#!/usr/bin/env node
/**
 * VERIFY BACKFILL - Check database status
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TIMEFRAME = '30m';
const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];

async function main() {
  console.log('📊 DATABASE VERIFICATION\n' + '='.repeat(70) + '\n');

  // Total signals by symbol
  for (const sym of SYMBOLS) {
    const { count: total } = await supabase
      .from('signals')
      .select('*', { count: 'exact', head: true })
      .eq('symbol', sym)
      .eq('interval', TIMEFRAME);

    const { count: withClose } = await supabase
      .from('signals')
      .select('*', { count: 'exact', head: true })
      .eq('symbol', sym)
      .eq('interval', TIMEFRAME)
      .not('close_price', 'is', null);

    const { count: open } = await supabase
      .from('signals')
      .select('*', { count: 'exact', head: true })
      .eq('symbol', sym)
      .eq('interval', TIMEFRAME)
      .is('close_price', null);

    console.log(`${sym}:`);
    console.log(`  Total: ${total}`);
    console.log(`  Closed: ${withClose}`);
    console.log(`  Open: ${open}\n`);
  }

  // Grand totals
  const { count: totalAll } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .eq('interval', TIMEFRAME);

  const { count: closedAll } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .eq('interval', TIMEFRAME)
    .not('close_price', 'is', null);

  console.log('TOTALS:');
  console.log(`  All signals: ${totalAll}`);
  console.log(`  With close data: ${closedAll}`);
  console.log(`  Remaining open: ${totalAll - closedAll}`);
  console.log(`  Progress: ${((closedAll / totalAll) * 100).toFixed(1)}%\n`);

  // Win/loss breakdown for closed signals
  if (closedAll > 0) {
    const { count: wins } = await supabase
      .from('signals')
      .select('*', { count: 'exact', head: true })
      .eq('interval', TIMEFRAME)
      .eq('is_win', true);

    console.log('PROFITABILITY:');
    console.log(`  Wins: ${wins}`);
    console.log(`  Losses: ${closedAll - wins}`);
    console.log(`  Win rate: ${((wins / closedAll) * 100).toFixed(1)}%\n`);
  }

  console.log('='.repeat(70));
}

main().catch(e => console.error('Error:', e.message));
