/**
 * Compare Different Lookback Values
 *
 * Tests lookback 5, 8, 10, 15, 20 to find optimal settings
 * Compares: profitability, win rate, trade duration, signal count
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const SYMBOL = 'BTCUSDT';
const INTERVAL = '30m';
const SL_PCT = 0.5;
const TP_PCT = 1.5;
const LOOKBACKS = [5, 8, 10, 15, 20];

// Detect swings with configurable lookback
function detectSwings(candles, lookback) {
  if (candles.length < lookback + 1) return [];

  const signals = [];
  let lastSignalType = null;

  for (let i = lookback; i < candles.length; i++) {
    const c = candles[i];

    // Check if local low (within lookback window)
    let isLow = true;
    for (let j = i - lookback; j <= i; j++) {
      if (j !== i && candles[j].low < c.low) { isLow = false; break; }
    }

    // Check if local high (within lookback window)
    let isHigh = true;
    for (let j = i - lookback; j <= i; j++) {
      if (j !== i && candles[j].high > c.high) { isHigh = false; break; }
    }

    if (isLow && lastSignalType !== 'buy') {
      signals.push({
        bar_time: c.open_time,
        signal_type: 'buy',
        entry_price: c.low,
      });
      lastSignalType = 'buy';
    } else if (isHigh && lastSignalType !== 'sell') {
      signals.push({
        bar_time: c.open_time,
        signal_type: 'sell',
        entry_price: c.high,
      });
      lastSignalType = 'sell';
    }
  }

  return signals;
}

// Calculate closes and PnL
function calculateCloses(signals) {
  const results = [];

  for (let i = 0; i < signals.length; i++) {
    const sig = signals[i];
    const isBuy = sig.signal_type === 'buy';

    // Find next opposite signal
    let nextOppositeIdx = -1;
    for (let j = i + 1; j < signals.length; j++) {
      const nextIsBuy = signals[j].signal_type === 'buy';
      if (isBuy !== nextIsBuy) {
        nextOppositeIdx = j;
        break;
      }
    }

    let closePrice, closedAt, pnlPct, isWin, tradeDuration;

    if (nextOppositeIdx !== -1) {
      const closeSignal = signals[nextOppositeIdx];
      closePrice = closeSignal.entry_price;
      closedAt = closeSignal.bar_time;

      const change = isBuy
        ? ((closePrice - sig.entry_price) / sig.entry_price) * 100
        : ((sig.entry_price - closePrice) / sig.entry_price) * 100;

      pnlPct = Number(change.toFixed(2));
      isWin = pnlPct > 0;

      // Calculate trade duration in 30m candles
      const openTime = new Date(sig.bar_time);
      const closeTime = new Date(closedAt);
      tradeDuration = Math.round((closeTime - openTime) / (30 * 60 * 1000));
    } else {
      closePrice = null;
      closedAt = null;
      pnlPct = null;
      isWin = null;
      tradeDuration = null;
    }

    results.push({
      ...sig,
      close_price: closePrice,
      closed_at: closedAt,
      pnl_pct: pnlPct,
      is_win: isWin,
      trade_duration: tradeDuration,
    });
  }

  return results;
}

async function analyze() {
  console.log('🔍 Comparing Lookback Values for BTCUSDT 30m\n');

  // Fetch candles from past 30 days (should be enough for all lookbacks)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const { data: candles, error } = await supabaseAdmin
    .from('ohlcv_cache')
    .select('*')
    .eq('symbol', SYMBOL)
    .eq('interval', INTERVAL)
    .gte('open_time', thirtyDaysAgo.toISOString())
    .order('open_time', { ascending: true });

  if (error || !candles) {
    console.error('❌ Failed to fetch candles:', error?.message);
    return;
  }

  console.log(`✅ Fetched ${candles.length} candles\n`);
  console.log('═'.repeat(140));
  console.log('LOOKBACK COMPARISON');
  console.log('═'.repeat(140));

  const results = {};

  for (const lookback of LOOKBACKS) {
    console.log(`\n📊 Testing Lookback = ${lookback}:`);
    console.log('─'.repeat(140));

    const signals = detectSwings(candles, lookback);
    const withCloses = calculateCloses(signals);
    const closed = withCloses.filter(s => s.closed_at);
    const wins = closed.filter(s => s.is_win);
    const losses = closed.filter(s => !s.is_win);

    const winRate = closed.length > 0 ? (wins.length / closed.length * 100).toFixed(1) : '—';
    const totalPnL = closed.reduce((sum, s) => sum + (s.pnl_pct || 0), 0).toFixed(2);
    const avgPnL = closed.length > 0 ? (totalPnL / closed.length).toFixed(2) : '—';
    const avgDuration = closed.length > 0
      ? (closed.reduce((sum, s) => sum + (s.trade_duration || 0), 0) / closed.length).toFixed(1)
      : '—';
    const maxDrawdown = closed.length > 0
      ? Math.min(...closed.map(s => s.pnl_pct || 0)).toFixed(2)
      : '—';

    console.log(`Total Signals:        ${withCloses.length}`);
    console.log(`Closed Signals:       ${closed.length}`);
    console.log(`Live Signals:         ${withCloses.length - closed.length}`);
    console.log(`Wins:                 ${wins.length}`);
    console.log(`Losses:               ${losses.length}`);
    console.log(`Win Rate:             ${winRate}%`);
    console.log(`Total PnL:            ${totalPnL}%`);
    console.log(`Avg PnL per Trade:    ${avgPnL}%`);
    console.log(`Avg Trade Duration:   ${avgDuration} candles (${avgDuration * 0.5} hours)`);
    console.log(`Max Drawdown:         ${maxDrawdown}%`);

    results[lookback] = {
      totalSignals: withCloses.length,
      closedSignals: closed.length,
      liveSignals: withCloses.length - closed.length,
      wins: wins.length,
      losses: losses.length,
      winRate: parseFloat(winRate) || 0,
      totalPnL: parseFloat(totalPnL),
      avgPnL: parseFloat(avgPnL) || 0,
      avgDuration: parseFloat(avgDuration) || 0,
      maxDrawdown: parseFloat(maxDrawdown),
      signals: withCloses,
    };
  }

  // Ranking
  console.log('\n' + '═'.repeat(140));
  console.log('📈 RANKINGS\n');

  const sorted = {
    byWinRate: [...LOOKBACKS].sort((a, b) => results[b].winRate - results[a].winRate),
    byAvgPnL: [...LOOKBACKS].sort((a, b) => results[b].avgPnL - results[a].avgPnL),
    byTotalPnL: [...LOOKBACKS].sort((a, b) => results[b].totalPnL - results[a].totalPnL),
    byAvgDuration: [...LOOKBACKS].sort((a, b) => results[a].avgDuration - results[b].avgDuration),
  };

  console.log('Win Rate (highest first):');
  sorted.byWinRate.forEach((lb, i) => {
    console.log(`  ${i + 1}. Lookback ${lb}: ${results[lb].winRate}% (${results[lb].wins}/${results[lb].closedSignals})`);
  });

  console.log('\nAvg PnL per Trade (highest first):');
  sorted.byAvgPnL.forEach((lb, i) => {
    console.log(`  ${i + 1}. Lookback ${lb}: ${results[lb].avgPnL}%`);
  });

  console.log('\nTotal PnL (highest first):');
  sorted.byTotalPnL.forEach((lb, i) => {
    console.log(`  ${i + 1}. Lookback ${lb}: ${results[lb].totalPnL}%`);
  });

  console.log('\nFastest Trade Execution (fewest candles):');
  sorted.byAvgDuration.forEach((lb, i) => {
    console.log(`  ${i + 1}. Lookback ${lb}: ${results[lb].avgDuration} candles (~${(results[lb].avgDuration * 0.5).toFixed(1)} hours)`);
  });

  // Summary table
  console.log('\n' + '═'.repeat(140));
  console.log('SUMMARY TABLE\n');
  console.log('Lookback | Signals | Closed | Wins | Losses | WinRate | TotalPnL | AvgPnL | AvgDuration');
  console.log('─'.repeat(100));

  LOOKBACKS.forEach(lb => {
    const r = results[lb];
    console.log(
      `${lb.toString().padEnd(8)} | ` +
      `${r.totalSignals.toString().padEnd(7)} | ` +
      `${r.closedSignals.toString().padEnd(6)} | ` +
      `${r.wins.toString().padEnd(4)} | ` +
      `${r.losses.toString().padEnd(6)} | ` +
      `${r.winRate.toFixed(1).padEnd(7)}% | ` +
      `${r.totalPnL.toFixed(2).padEnd(8)}% | ` +
      `${r.avgPnL.toFixed(2).padEnd(6)}% | ` +
      `${r.avgDuration.toFixed(1).padEnd(11)} candles`
    );
  });

  console.log('═'.repeat(140));
}

analyze().catch(console.error);
