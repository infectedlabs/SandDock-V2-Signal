require('dotenv').config({ path: './telegram-signal-worker/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

(async () => {
  for (const symbol of ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']) {
    const { data, error } = await supabase
      .from('signals')
      .select('id, signal_type, entry_price, bar_time, closed_at, close_price, close_reason, pnl_pct')
      .eq('symbol', symbol)
      .eq('interval', '30m')
      .order('bar_time', { ascending: false })
      .limit(15);

    if (error) { console.error(symbol, error.message); continue; }

    console.log(`\n=== ${symbol} — last 15 by bar_time desc ===`);
    data.forEach(s => {
      console.log(`  id=${s.id} [${s.closed_at ? 'CLOSED' : 'LIVE  '}] ${s.signal_type.toUpperCase()} entry=${s.entry_price} bar_time=${s.bar_time} closed_at=${s.closed_at || 'N/A'} close_price=${s.close_price || 'N/A'} reason=${s.close_reason || 'N/A'}`);
    });
  }
  process.exit(0);
})();
