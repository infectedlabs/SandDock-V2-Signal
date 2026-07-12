#!/usr/bin/env node
/**
 * Check signal history - Show sample signals with closes
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('📊 SIGNAL HISTORY SAMPLE\n' + '='.repeat(70) + '\n');

  // Get recent closed signals
  const { data: signals } = await supabase
    .from('signals')
    .select('symbol, bar_time, signal_type, entry_price, close_price, close_reason, pnl_pct, is_win')
    .eq('interval', '30m')
    .not('close_price', 'is', null)
    .order('bar_time', { ascending: false })
    .limit(10);

  console.log('Recent closed signals:');
  for (const s of signals || []) {
    const pnl = s.pnl_pct >= 0 ? `+${s.pnl_pct}%` : `${s.pnl_pct}%`;
    const status = s.is_win ? '✅ WIN' : '❌ LOSS';
    console.log(`${s.bar_time} | ${s.symbol} ${s.signal_type.toUpperCase()} | Entry: ${s.entry_price} | Close: ${s.close_price} | ${pnl} | ${s.close_reason} | ${status}`);
  }

  console.log('\n' + '='.repeat(70));
}

main().catch(e => console.error('Error:', e.message));
