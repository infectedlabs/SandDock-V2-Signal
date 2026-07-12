#!/usr/bin/env node
/**
 * VERIFY BTC ONLY - Check if data aligns with backtest
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('📊 BTC VERIFICATION\n' + '='.repeat(70) + '\n');

  // BTC totals
  const { count: total } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .eq('symbol', 'BTCUSDT')
    .eq('interval', '30m');

  const { count: withClose } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .eq('symbol', 'BTCUSDT')
    .eq('interval', '30m')
    .not('close_price', 'is', null);

  const { count: wins } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .eq('symbol', 'BTCUSDT')
    .eq('interval', '30m')
    .eq('is_win', true);

  const { count: tpHits } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .eq('symbol', 'BTCUSDT')
    .eq('interval', '30m')
    .eq('close_reason', 'tp_hit');

  // Sample recent signals
  const { data: samples } = await supabase
    .from('signals')
    .select('bar_time, signal_type, entry_price, close_price, pnl_pct, close_reason, is_win')
    .eq('symbol', 'BTCUSDT')
    .eq('interval', '30m')
    .order('bar_time', { ascending: false })
    .limit(10);

  console.log('BTCUSDT Summary:');
  console.log(`  Total signals: ${total}`);
  console.log(`  With close data: ${withClose}`);
  console.log(`  Winning signals: ${wins}`);
  console.log(`  TP hits: ${tpHits}`);
  console.log(`  Win rate: ${((wins / withClose) * 100).toFixed(1)}%`);
  console.log(`  TP hit rate: ${((tpHits / withClose) * 100).toFixed(1)}%\n`);

  console.log('Recent BTC Signals:');
  for (const s of samples || []) {
    const pnl = s.pnl_pct >= 0 ? `+${s.pnl_pct}%` : `${s.pnl_pct}%`;
    const status = s.is_win ? '✅' : '❌';
    console.log(`  ${s.bar_time.substring(0, 10)} ${s.signal_type.toUpperCase()} ${pnl} ${s.close_reason} ${status}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('Status: Ready for comparison with backtest data\n');
}

main().catch(e => console.error('Error:', e.message));
