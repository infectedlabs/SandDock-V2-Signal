#!/usr/bin/env node
/**
 * One-time repair for the "multiple simultaneously open signals" bug.
 *
 * calculateCloses() only matches a signal against the next OPPOSITE-direction
 * signal; if several consecutive same-direction swings occur with none of
 * them ever followed by a real opposite, every one of them used to get
 * reverted to closed_at=null ("still live") instead of just the last one.
 *
 * This closes every open row for a symbol except the chronologically last
 * one, using the immediately-following open row as the superseding event
 * (close_price = that row's entry_price, closed_at = that row's bar_time,
 * close_reason = 'superseded'). The going-forward fix lives in
 * telegram-signal-worker/index.js (resolveTrailingSupersession) — this
 * script only cleans up rows already corrupted before that fix existed.
 *
 * Usage: node scripts/repair_stale_open_signals.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
const INTERVAL = '30m';

async function repairSymbol(symbol) {
  const { data: openRows, error } = await supabase
    .from('signals')
    .select('*')
    .eq('symbol', symbol)
    .eq('interval', INTERVAL)
    .is('closed_at', null)
    .order('bar_time', { ascending: true });

  if (error) {
    console.error(`${symbol}: fetch error — ${error.message}`);
    return;
  }
  if (!openRows || openRows.length <= 1) {
    console.log(`${symbol}: ${openRows?.length || 0} open row(s) — nothing to repair`);
    return;
  }

  console.log(`${symbol}: found ${openRows.length} open rows — closing all but the latest`);

  for (let i = 0; i < openRows.length - 1; i++) {
    const sig = openRows[i];
    const next = openRows[i + 1];
    const entryPrice = parseFloat(sig.entry_price);
    const closePrice = parseFloat(next.entry_price);
    const isBuy = sig.signal_type === 'buy';
    const change = isBuy
      ? ((closePrice - entryPrice) / entryPrice) * 100
      : ((entryPrice - closePrice) / entryPrice) * 100;
    const pnlPct = Number(change.toFixed(2));

    const { error: updateError } = await supabase
      .from('signals')
      .update({
        close_price: closePrice,
        close_reason: 'superseded',
        closed_at: next.bar_time,
        pnl_pct: pnlPct,
        is_win: pnlPct > 0,
      })
      .eq('id', sig.id);

    if (updateError) {
      console.error(`${symbol}: failed to close ${sig.action} @ ${sig.bar_time} — ${updateError.message}`);
    } else {
      console.log(`${symbol}: closed ${sig.action} @ ${sig.bar_time} -> superseded by ${next.bar_time} (pnl ${pnlPct}%)`);
    }
  }
}

(async () => {
  for (const symbol of SYMBOLS) {
    await repairSymbol(symbol);
  }
  console.log('Repair complete.');
})();
