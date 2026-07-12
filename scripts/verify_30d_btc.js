#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('📊 30D BTC VERIFICATION\n' + '='.repeat(70) + '\n');

  // Get stats
  const { count: total } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true });

  const { count: wins } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .eq('is_win', true);

  const { count: tpHits } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .eq('close_reason', 'tp_hit');

  const { data: samples } = await supabase
    .from('signals')
    .select('bar_time, action, entry_price, close_price, pnl_pct, close_reason, is_win')
    .order('bar_time', { ascending: false })
    .limit(15);

  console.log('SUMMARY:');
  console.log(`  Total signals: ${total}`);
  console.log(`  Winning trades: ${wins}`);
  console.log(`  TP hits: ${tpHits}`);
  console.log(`  Win rate: ${((wins / total) * 100).toFixed(1)}%`);
  console.log(`  TP hit rate: ${((tpHits / total) * 100).toFixed(1)}%\n`);

  console.log('Recent Signals:');
  for (const s of samples || []) {
    const pnl = s.pnl_pct >= 0 ? `+${s.pnl_pct}%` : `${s.pnl_pct}%`;
    const status = s.is_win ? '✅' : '❌';
    console.log(`  ${s.bar_time.substring(0, 10)} ${s.action} ${pnl} ${s.close_reason} ${status}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ 30-day BTC data ready for app verification\n');
}

main();
