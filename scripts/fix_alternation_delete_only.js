require('dotenv').config({ path: './telegram-signal-worker/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

async function fetchAll(symbol) {
  let all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('signals')
      .select('id, signal_type, bar_time, entry_price')
      .eq('symbol', symbol)
      .eq('interval', '30m')
      .order('bar_time', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${symbol} fetch error: ${error.message}`);
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

(async () => {
  const symbol = 'BNBUSDT';
  log(`[${symbol}] Fetching full history...`);
  const all = await fetchAll(symbol);
  log(`[${symbol}] ${all.length} total signals fetched.`);

  const dropped = [];
  let lastType = null;
  for (const s of all) {
    if (s.signal_type !== lastType) {
      lastType = s.signal_type;
    } else {
      dropped.push(s);
    }
  }
  log(`[${symbol}] ${dropped.length} violations to delete.`);

  if (dropped.length > 0) {
    const ids = dropped.map(s => s.id);
    for (let i = 0; i < ids.length; i += 200) {
      const batch = ids.slice(i, i + 200);
      const { error } = await supabase.from('signals').delete().in('id', batch);
      if (error) throw new Error(`Delete error: ${error.message}`);
    }
    log(`[${symbol}] Deleted ${dropped.length} rows.`);
  }
  log('✅ COMPLETE');
  process.exit(0);
})().catch(e => {
  log(`FATAL: ${e.message}`);
  process.exit(1);
});
