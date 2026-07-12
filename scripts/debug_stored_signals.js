#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data: signals } = await supabase
    .from('signals')
    .select('*')
    .limit(10);

  console.log('First 10 signals in database:\n');
  for (const sig of signals || []) {
    console.log({
      bar_time: sig.bar_time,
      signal_type: sig.signal_type,
      entry_price: sig.entry_price,
      close_price: sig.close_price,
      pnl_pct: sig.pnl_pct,
      is_win: sig.is_win,
      close_reason: sig.close_reason
    });
  }
}

main();
