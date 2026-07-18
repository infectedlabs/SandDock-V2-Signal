require('dotenv').config({ path: './telegram-signal-worker/.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function check() {
  const { data } = await supabase
    .from('signals')
    .select('symbol, signal_type, bar_time, entry_price, closed_at')
    .eq('symbol', 'BTCUSDT')
    .eq('interval', '30m')
    .is('closed_at', null)
    .limit(1);

  if (data && data.length > 0) {
    const sig = data[0];
    const barDate = new Date(sig.bar_time);
    console.log('LIVE Signal in DB:');
    console.log('  bar_time (ISO):', sig.bar_time);
    console.log('  bar_time (UTC):', barDate.toUTCString());
    console.log('  bar_time (Local):', barDate.toLocaleString());
    console.log('  Entry Price:', sig.entry_price);
  }
  process.exit(0);
}

check();
