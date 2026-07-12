#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data: signals } = await supabase
    .from('signals')
    .select('bar_time, signal_type')
    .order('bar_time', { ascending: false });

  const uniqueTimes = new Set(signals.map(s => s.bar_time));
  
  console.log(`Total signals: ${signals.length}`);
  console.log(`Unique bar_time values: ${uniqueTimes.size}`);
  console.log('\nFirst 10 timestamps:');
  
  for (let i = 0; i < 10; i++) {
    console.log(`  ${signals[i].bar_time}`);
  }
  
  if (uniqueTimes.size < signals.length) {
    console.log('\n⚠️  WARNING: Duplicate timestamps found!');
  } else {
    console.log('\n✅ All timestamps are unique');
  }
}

main();
