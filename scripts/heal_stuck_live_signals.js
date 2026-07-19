// Standalone repair script — closes live signals that got stuck due to a
// bug in telegram-signal-worker's fetchCandles (missing close_time field
// caused closed_at to silently drop from update payloads). The worker's
// close_price/close_reason/pnl_pct/is_win were already computed correctly
// each cycle — only closed_at never persisted, and the follow-up insert of
// the new live signal failed (bar_time NOT NULL constraint). This script
// finds the real candle matching the already-stored close_price, uses its
// close_time as the true closed_at, closes the stuck row, and inserts the
// correct new live signal. Does NOT touch telegram-signal-worker/index.js.
require('dotenv').config({ path: './telegram-signal-worker/.env' });
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);
const SL_PCT = 0.5;
const TP_PCT = 1.5;

async function fetchCandles(symbol) {
  const { data } = await axios.get('https://fapi.binance.com/fapi/v1/klines', {
    params: { symbol, interval: '30m', limit: 500 },
    timeout: 10000,
  });
  const now = Date.now();
  return data
    .filter(k => k[6] <= now)
    .map(k => ({
      open_time: new Date(k[0]).toISOString(),
      close_time: new Date(k[6]).toISOString(),
      high: +k[2],
      low: +k[3],
    }));
}

async function getDynamicConfidence(symbol) {
  const { data } = await supabase
    .from('signals')
    .select('is_win')
    .eq('symbol', symbol)
    .eq('interval', '30m')
    .not('closed_at', 'is', null)
    .order('bar_time', { ascending: false })
    .limit(20);
  if (!data || data.length === 0) return 75;
  const wins = data.filter(s => s.is_win).length;
  return Math.min(Math.max(Math.round((wins / data.length) * 100), 60), 95);
}

(async () => {
  for (const symbol of ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']) {
    log(`[${symbol}] Checking for stuck live signal...`);

    const { data: liveRows, error: liveErr } = await supabase
      .from('signals')
      .select('*')
      .eq('symbol', symbol)
      .eq('interval', '30m')
      .is('closed_at', null)
      .order('bar_time', { ascending: false })
      .limit(1);

    if (liveErr) { log(`[${symbol}] Fetch error: ${liveErr.message}`); continue; }
    if (!liveRows || liveRows.length === 0) { log(`[${symbol}] No live signal — skipping.`); continue; }

    const openSig = liveRows[0];
    if (!openSig.close_price || !openSig.close_reason) {
      log(`[${symbol}] Live signal has no pending close data — nothing to heal.`);
      continue;
    }

    const wasBuy = openSig.signal_type === 'buy';
    const newDirection = wasBuy ? 'sell' : 'buy'; // opposite of the stuck signal
    const targetPrice = parseFloat(openSig.close_price);

    const candles = await fetchCandles(symbol);
    // The opposite signal's entry_price is candle.low for a BUY, candle.high for a SELL
    const match = candles.find(c => {
      const candidate = newDirection === 'buy' ? c.low : c.high;
      return Math.abs(candidate - targetPrice) < 0.01;
    });

    if (!match) {
      log(`[${symbol}] ⚠️ Could not find a candle matching stored close_price ${targetPrice} — skipping (manual review needed).`);
      continue;
    }

    const closedAt = match.close_time;
    const pnlPct = Number((wasBuy
      ? (targetPrice - openSig.entry_price) / openSig.entry_price * 100
      : (openSig.entry_price - targetPrice) / openSig.entry_price * 100
    ).toFixed(2));

    // 1) Properly close the stuck signal
    const { error: closeErr } = await supabase
      .from('signals')
      .update({
        close_price: targetPrice,
        close_reason: 'swing_opposite',
        closed_at: closedAt,
        pnl_pct: pnlPct,
        is_win: pnlPct > 0,
      })
      .eq('id', openSig.id);

    if (closeErr) { log(`[${symbol}] Close update failed: ${closeErr.message}`); continue; }
    log(`[${symbol}] ✓ Closed ${openSig.signal_type.toUpperCase()} @ ${openSig.entry_price} → ${targetPrice} (closed_at ${closedAt}, pnl ${pnlPct}%)`);

    // 2) Insert the correct new live signal (opposite direction)
    const confidence = await getDynamicConfidence(symbol);
    const newSignal = {
      symbol,
      interval: '30m',
      bar_time: closedAt,
      signal_type: newDirection,
      action: newDirection.toUpperCase(),
      rationale: newDirection === 'buy' ? 'Swing low detected' : 'Swing high detected',
      entry_price: targetPrice,
      sl_price: newDirection === 'buy' ? targetPrice * (1 - SL_PCT / 100) : targetPrice * (1 + SL_PCT / 100),
      tp_price: newDirection === 'buy' ? targetPrice * (1 + TP_PCT / 100) : targetPrice * (1 - TP_PCT / 100),
      sl_pct: SL_PCT,
      tp_pct: TP_PCT,
      confidence,
      closed_at: null,
      close_price: null,
      close_reason: null,
      pnl_pct: null,
      is_win: null,
    };

    const { error: insertErr } = await supabase.from('signals').insert(newSignal);
    if (insertErr) {
      log(`[${symbol}] ⚠️ New live signal insert failed: ${insertErr.message}`);
      continue;
    }
    log(`[${symbol}] ➕ New LIVE ${newDirection.toUpperCase()} @ ${targetPrice} (bar_time ${closedAt}, confidence ${confidence}%)`);
  }
  log('✅ COMPLETE');
  process.exit(0);
})().catch(e => {
  log(`FATAL: ${e.message}`);
  process.exit(1);
});
