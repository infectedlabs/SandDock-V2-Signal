require('dotenv').config({ path: './telegram-signal-worker/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

(async () => {
  for (const symbol of ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']) {
    const { data } = await supabase
      .from('signals')
      .select('id, signal_type, entry_price, bar_time, closed_at, close_price, pnl_pct')
      .eq('symbol', symbol)
      .eq('interval', '30m')
      .order('bar_time', { ascending: false })
      .limit(5);

    console.log(`\n=== ${symbol} ===`);
    let issues = 0;
    data.forEach((s, i) => {
      if (s.closed_at && new Date(s.closed_at).getTime() < new Date(s.bar_time).getTime()) {
        console.log(`  ❌ TIME ORDER VIOLATION: closed_at ${s.closed_at} < bar_time ${s.bar_time}`);
        issues++;
      }
      console.log(`  [${s.closed_at ? 'CLOSED' : 'LIVE  '}] ${s.signal_type.toUpperCase()} entry=${s.entry_price} bar_time=${s.bar_time} closed_at=${s.closed_at || 'N/A'} pnl=${s.pnl_pct ?? 'N/A'}`);
    });
    const liveCount = data.filter(s => !s.closed_at).length;
    console.log(`  Live count in top-5: ${liveCount} ${liveCount === 1 ? '✓' : '⚠️'}`);
    console.log(`  Issues: ${issues}`);
  }
  process.exit(0);
})();
