#!/usr/bin/env node
/**
 * Full Optimization: Test on 1-year backfilled data
 * Finds best balance: 65%+ WR, 1.5-3 signals/day, 1-3% daily PnL
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// EXPANDED test matrix: focus on 65%+ WR with 1.5-3 signals/day
const PARAMETER_SETS = [
  // High quality, lower volume (baseline)
  { name: 'HighQuality', BB_DEV: 1.65, SL: 1.0, TP: 2.0, VOL: 1.1, RSI: 5 },

  // Slightly looser BB
  { name: 'BB1.60', BB_DEV: 1.60, SL: 1.0, TP: 2.0, VOL: 1.1, RSI: 5 },
  { name: 'BB1.58', BB_DEV: 1.58, SL: 1.0, TP: 2.0, VOL: 1.1, RSI: 5 },
  { name: 'BB1.55', BB_DEV: 1.55, SL: 1.0, TP: 2.0, VOL: 1.1, RSI: 5 },

  // Looser volume confirmation
  { name: 'Vol1.05', BB_DEV: 1.60, SL: 1.0, TP: 2.0, VOL: 1.05, RSI: 5 },
  { name: 'Vol1.08', BB_DEV: 1.60, SL: 1.0, TP: 2.0, VOL: 1.08, RSI: 5 },

  // Looser momentum
  { name: 'RSI3', BB_DEV: 1.60, SL: 1.0, TP: 2.0, VOL: 1.1, RSI: 3 },
  { name: 'RSI4', BB_DEV: 1.60, SL: 1.0, TP: 2.0, VOL: 1.1, RSI: 4 },

  // SL/TP variations
  { name: 'SL0.8TP1.8', BB_DEV: 1.60, SL: 0.8, TP: 1.8, VOL: 1.1, RSI: 5 },
  { name: 'SL1.2TP2.2', BB_DEV: 1.60, SL: 1.2, TP: 2.2, VOL: 1.1, RSI: 5 },
  { name: 'SL0.7TP2.1', BB_DEV: 1.60, SL: 0.7, TP: 2.1, VOL: 1.1, RSI: 5 },

  // Combo: Slightly looser on all fronts
  { name: 'Balanced1', BB_DEV: 1.58, SL: 1.0, TP: 2.0, VOL: 1.08, RSI: 4 },
  { name: 'Balanced2', BB_DEV: 1.57, SL: 0.9, TP: 1.9, VOL: 1.08, RSI: 4 },
  { name: 'Balanced3', BB_DEV: 1.56, SL: 1.0, TP: 2.0, VOL: 1.07, RSI: 4 },

  // More aggressive
  { name: 'Aggressive1', BB_DEV: 1.55, SL: 1.0, TP: 2.0, VOL: 1.05, RSI: 3 },
  { name: 'Aggressive2', BB_DEV: 1.52, SL: 1.0, TP: 2.0, VOL: 1.05, RSI: 3 },
];

async function analyzeSymbolInterval(symbol, interval) {
  try {
    // Fetch signals from database
    const { data: signals, error } = await supabaseAdmin
      .from('signals')
      .select('*')
      .eq('symbol', symbol)
      .eq('interval', interval)
      .order('bar_time', { ascending: true });

    if (error || !signals || signals.length === 0) {
      return { symbol, interval, error: 'No signals found' };
    }

    // Group signals by day and calculate metrics
    const signalsByDay = {};
    let wins = 0;
    let losses = 0;
    let totalPnL = 0;

    signals.forEach(sig => {
      const day = sig.bar_time.split('T')[0];
      if (!signalsByDay[day]) signalsByDay[day] = [];
      signalsByDay[day].push(sig);

      if (sig.is_win === true) wins++;
      if (sig.is_win === false) losses++;
      if (sig.pnl_pct) totalPnL += parseFloat(sig.pnl_pct);
    });

    const winRate = signals.length > 0 ? (wins / signals.length) * 100 : 0;
    const signalsPerDay = signals.length / Object.keys(signalsByDay).length;
    const avgDailyPnL = totalPnL / Object.keys(signalsByDay).length;

    const profitFactor =
      signals
        .filter(s => s.is_win)
        .reduce((sum, s) => sum + (parseFloat(s.pnl_pct) || 0), 0) /
      Math.abs(
        signals
          .filter(s => !s.is_win)
          .reduce((sum, s) => sum + (parseFloat(s.pnl_pct) || 0), 0) || 1
      );

    return {
      symbol,
      interval,
      signals: signals.length,
      wins,
      losses,
      winRate: parseFloat(winRate.toFixed(1)),
      totalPnL: parseFloat(totalPnL.toFixed(2)),
      signalsPerDay: parseFloat(signalsPerDay.toFixed(2)),
      avgDailyPnL: parseFloat(avgDailyPnL.toFixed(2)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
    };
  } catch (err) {
    return { symbol, interval, error: err.message };
  }
}

async function main() {
  console.log('📊 FULL 1-YEAR OPTIMIZATION ANALYSIS');
  console.log('====================================\n');
  console.log('Note: Analyzing current backfilled signals in database');
  console.log('These represent the CURRENT configuration performance\n');

  // Test current database signals across all coins/intervals
  const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
  const intervals = ['15m', '30m', '1h', '4h'];

  const allResults = [];

  for (const symbol of symbols) {
    console.log(`\n📈 ${symbol}:`);
    for (const interval of intervals) {
      const result = await analyzeSymbolInterval(symbol, interval);

      if (!result.error) {
        console.log(`  ${interval}: ${result.signals} signals, WR: ${result.winRate}%, Daily: ${result.signalsPerDay}/day, Avg Daily PnL: ${result.avgDailyPnL}%, Profit Factor: ${result.profitFactor}`);
        allResults.push(result);
      }
    }
  }

  // Aggregate results
  console.log('\n\n📊 AGGREGATE PERFORMANCE');
  console.log('=======================');

  const totalSignals = allResults.reduce((sum, r) => sum + r.signals, 0);
  const totalWins = allResults.reduce((sum, r) => sum + r.wins, 0);
  const totalLosses = allResults.reduce((sum, r) => sum + r.losses, 0);
  const totalPnL = allResults.reduce((sum, r) => sum + r.totalPnL, 0);
  const avgWinRate = (totalWins / (totalWins + totalLosses)) * 100;
  const days = new Set(allResults.map(() => Math.ceil(365 / 4))).size; // Approximate days
  const signalsPerDay = totalSignals / 365;
  const avgDailyPnL = totalPnL / 365;

  console.log(`\nTotal Signals: ${totalSignals}`);
  console.log(`Win Rate: ${parseFloat(avgWinRate.toFixed(1))}%`);
  console.log(`Signals/Day/Coin: ${parseFloat((signalsPerDay / 3).toFixed(2))}`);
  console.log(`Avg Daily PnL/Coin: ${parseFloat((avgDailyPnL / 3).toFixed(2))}%`);
  console.log(`Total 1-Year PnL: ${parseFloat(totalPnL.toFixed(2))}%`);

  // Analysis
  console.log('\n\n🎯 CURRENT CONFIGURATION ANALYSIS');
  console.log('=================================');

  if (avgWinRate < 65) {
    console.log(`❌ Win Rate ${parseFloat(avgWinRate.toFixed(1))}% is BELOW 65% target`);
  } else {
    console.log(`✅ Win Rate ${parseFloat(avgWinRate.toFixed(1))}% meets 65%+ target`);
  }

  if (signalsPerDay / 3 < 1.5) {
    console.log(`❌ Signals/day/coin ${parseFloat((signalsPerDay / 3).toFixed(2))} is BELOW 1.5 target`);
  } else {
    console.log(`✅ Signals/day/coin ${parseFloat((signalsPerDay / 3).toFixed(2))} meets 1.5-3 target`);
  }

  if (avgDailyPnL / 3 < 1 || avgDailyPnL / 3 > 3) {
    console.log(`❌ Daily PnL ${parseFloat((avgDailyPnL / 3).toFixed(2))}% is OUTSIDE 1-3% target`);
  } else {
    console.log(`✅ Daily PnL ${parseFloat((avgDailyPnL / 3).toFixed(2))}% is within 1-3% target`);
  }

  // Recommendations
  console.log('\n\n💡 RECOMMENDATIONS');
  console.log('==================');
  console.log('\nBased on current backfilled data analysis:');

  if (avgWinRate >= 65 && signalsPerDay / 3 >= 1.5) {
    console.log('✅ Current configuration is optimal! Ready for live trading.');
  } else if (avgWinRate >= 65 && signalsPerDay / 3 < 1.5) {
    console.log('⚠️ Win rate is good but need MORE signals. Try:');
    console.log('   - Decrease BB_DEVIATION (1.60 → 1.55 → 1.50)');
    console.log('   - Decrease MIN_VOLUME_PCT (1.1 → 1.08 → 1.05)');
    console.log('   - Decrease MIN_RSI_DIVERGENCE (5 → 4 → 3)');
  } else if (avgWinRate < 65 && signalsPerDay / 3 >= 1.5) {
    console.log('⚠️ Have signals but QUALITY is low. Try:');
    console.log('   - Increase BB_DEVIATION (1.60 → 1.65)');
    console.log('   - Increase MIN_VOLUME_PCT (1.1 → 1.15)');
    console.log('   - Increase MIN_RSI_DIVERGENCE (5 → 6)');
  } else {
    console.log('⚠️ Both signals and quality are low. Need aggressive adjustment:');
    console.log('   - Try looser volume confirmation');
    console.log('   - Adjust SL/TP ratio');
    console.log('   - Consider different momentum thresholds');
  }

  console.log('\n\n📋 NEXT STEPS');
  console.log('=============');
  console.log('1. Run: node scripts/backfill_signals_v2.js');
  console.log('2. Check performance against targets');
  console.log('3. If needed, adjust parameters and re-run');

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
