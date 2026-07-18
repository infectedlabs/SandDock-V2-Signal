require('dotenv').config({ path: './telegram-signal-worker/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

(async () => {
  for (const symbol of ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']) {
    const { data, count, error } = await supabase
      .from('signals')
      .select('*', { count: 'exact' })
      .eq('symbol', symbol)
      .eq('interval', '30m')
      .limit(1);
    
    console.log(`${symbol}: ${count} signals`);
  }
  process.exit(0);
})();
