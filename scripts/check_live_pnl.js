require('dotenv').config({ path: './telegram-signal-worker/.env' });
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

(async () => {
  for (const symbol of ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']) {
    const { data: live } = await supabase
      .from('signals')
      .select('*')
      .eq('symbol', symbol)
      .eq('interval', '30m')
      .is('closed_at', null)
      .order('bar_time', { ascending: false })
      .limit(1);

    if (!live || live.length === 0) {
      console.log(`${symbol}: No live signal`);
      continue;
    }

    const sig = live[0];

    // Get current market price
    const { data: ticker } = await axios.get('https://fapi.binance.com/fapi/v1/ticker/price', {
      params: { symbol }
    });
    const currentPrice = parseFloat(ticker.price);

    const isBuy = sig.signal_type === 'buy';
    const entry = parseFloat(sig.entry_price);
    const pnlPct = isBuy
      ? ((currentPrice - entry) / entry) * 100
      : ((entry - currentPrice) / entry) * 100;

    console.log(`\n${symbol}:`);
    console.log(`  Signal: ${sig.signal_type.toUpperCase()} @ ${entry} (bar_time: ${sig.bar_time})`);
    console.log(`  Current market price: ${currentPrice}`);
    console.log(`  Live PnL: ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`);
    console.log(`  SL: ${sig.sl_price} | TP: ${sig.tp_price}`);
  }
  process.exit(0);
})();
