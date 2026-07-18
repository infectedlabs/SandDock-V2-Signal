require('dotenv').config({ path: './telegram-signal-worker/.env' });
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function testInsert() {
  const testSignals = [
    {
      symbol: 'TESTBTC',
      interval: '30m',
      bar_time: new Date().toISOString(),
      signal_type: 'buy',
      action: 'BUY',
      rationale: 'Test',
      entry_price: 100,
      sl_price: 99,
      tp_price: 101,
      sl_pct: 1,
      tp_pct: 1,
      confidence: 95,
      close_price: 102,
      close_reason: 'test',
      closed_at: new Date().toISOString(),
      pnl_pct: 2,
      is_win: true,
    }
  ];
  
  console.log('Attempting insert...');
  const { data, error } = await supabase.from('signals').insert(testSignals);
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Success! Inserted:', data?.length || 'unknown');
  }
  process.exit(error ? 1 : 0);
}

testInsert();
