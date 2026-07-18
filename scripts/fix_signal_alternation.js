// Standalone DB repair script — fixes alternation violations (consecutive
// same-direction signals) left over from the initial backfill's duplicate
// candle bug. Does NOT touch telegram-signal-worker/index.js.
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
      .select('*')
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

function dropAlternationViolations(all) {
  const kept = [];
  const dropped = [];
  let lastType = null;

  for (const s of all) {
    if (s.signal_type !== lastType) {
      kept.push(s);
      lastType = s.signal_type;
    } else {
      dropped.push(s);
    }
  }
  return { kept, dropped };
}

function recomputeCloses(kept) {
  return kept.map((s, i) => {
    const isBuy = s.signal_type === 'buy';
    if (i < kept.length - 1) {
      const next = kept[i + 1];
      const closePrice = next.entry_price;
      const pnlPct = Number((isBuy
        ? (closePrice - s.entry_price) / s.entry_price * 100
        : (s.entry_price - closePrice) / s.entry_price * 100
      ).toFixed(2));
      return {
        ...s,
        close_price: closePrice,
        close_reason: 'swing_opposite',
        closed_at: next.bar_time,
        pnl_pct: pnlPct,
        is_win: pnlPct > 0,
      };
    }
    // Last signal in the clean chain stays LIVE
    return {
      ...s,
      close_price: s.tp_price,
      close_reason: 'pending',
      closed_at: null,
      pnl_pct: null,
      is_win: null,
    };
  });
}

async function applyFix(symbol, dropped, recomputed) {
  // Delete violation rows
  if (dropped.length > 0) {
    const ids = dropped.map(s => s.id);
    for (let i = 0; i < ids.length; i += 200) {
      const batch = ids.slice(i, i + 200);
      const { error } = await supabase.from('signals').delete().in('id', batch);
      if (error) throw new Error(`${symbol} delete error: ${error.message}`);
    }
    log(`[${symbol}] Deleted ${dropped.length} violation rows.`);
  }

  // Update recomputed close data for the clean chain
  let updated = 0;
  for (const s of recomputed) {
    const { error } = await supabase
      .from('signals')
      .update({
        close_price: s.close_price,
        close_reason: s.close_reason,
        closed_at: s.closed_at,
        pnl_pct: s.pnl_pct,
        is_win: s.is_win,
      })
      .eq('id', s.id);
    if (error) {
      log(`[${symbol}] Update failed for id=${s.id}: ${error.message}`);
      continue;
    }
    updated++;
  }
  log(`[${symbol}] Updated ${updated}/${recomputed.length} rows with recomputed close data.`);
}

(async () => {
  for (const symbol of ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']) {
    log(`[${symbol}] Fetching full history...`);
    const all = await fetchAll(symbol);
    log(`[${symbol}] ${all.length} total signals fetched.`);

    const { kept, dropped } = dropAlternationViolations(all);
    log(`[${symbol}] ${dropped.length} violations found, ${kept.length} kept in clean chain.`);

    if (dropped.length === 0) {
      log(`[${symbol}] No violations — skipping.`);
      continue;
    }

    const recomputed = recomputeCloses(kept);
    await applyFix(symbol, dropped, recomputed);

    const live = recomputed.filter(s => !s.closed_at);
    const wins = recomputed.filter(s => s.is_win).length;
    const closedCount = recomputed.filter(s => s.closed_at).length;
    const wr = closedCount > 0 ? ((wins / closedCount) * 100).toFixed(1) : 'N/A';
    log(`[${symbol}] ✅ Fixed. ${live.length} LIVE, ${closedCount} CLOSED, ${wr}% WR.`);
    if (live.length === 1) {
      log(`[${symbol}]    Current LIVE: ${live[0].signal_type.toUpperCase()} @ ${live[0].entry_price} (bar_time ${live[0].bar_time})`);
    } else if (live.length > 1) {
      log(`[${symbol}]    ⚠️ Still ${live.length} LIVE signals after fix — investigate further.`);
    }
  }
  log('✅ COMPLETE');
  process.exit(0);
})().catch(e => {
  log(`FATAL: ${e.message}`);
  process.exit(1);
});
