require('dotenv').config({ path: './telegram-signal-worker/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

(async () => {
  for (const symbol of ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']) {
    let all = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('signals')
        .select('id, signal_type, bar_time, entry_price, closed_at, close_price, close_reason, pnl_pct, is_win')
        .eq('symbol', symbol)
        .eq('interval', '30m')
        .order('bar_time', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) { console.error(`${symbol} fetch error:`, error.message); break; }
      all = all.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    console.log(`\n=== ${symbol}: ${all.length} total signals ===`);

    let violations = 0;
    let lastType = null;
    let lastEntry = null;
    for (let i = 0; i < all.length; i++) {
      const s = all[i];
      if (s.signal_type === lastType) {
        violations++;
        console.log(`  ❌ VIOLATION at idx ${i}: ${s.signal_type.toUpperCase()} @ ${s.entry_price} (bar_time ${s.bar_time}) follows another ${lastType.toUpperCase()} @ ${lastEntry}`);
      }
      lastType = s.signal_type;
      lastEntry = s.entry_price;
    }

    console.log(`  Total violations: ${violations}`);
  }
  process.exit(0);
})();
