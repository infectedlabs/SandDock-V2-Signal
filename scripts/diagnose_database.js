#!/usr/bin/env node
/**
 * Database Diagnostics Script
 * Checks what signals are actually in the database
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

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
const INTERVALS = ['15m', '30m', '1h', '4h'];

async function diagnoseDatabase() {
  console.log('🔍 DATABASE DIAGNOSTICS');
  console.log('====================================\n');

  let totalSignals = 0;
  const issues = [];

  for (const symbol of SYMBOLS) {
    console.log(`\n📊 ${symbol}:`);
    let symbolTotal = 0;

    for (const interval of INTERVALS) {
      try {
        // Get count
        const { count, error: countError } = await supabaseAdmin
          .from('signals')
          .select('id', { count: 'exact', head: true })
          .eq('symbol', symbol)
          .eq('interval', interval);

        if (countError) {
          console.log(`  ${interval}: ❌ Error - ${countError.message}`);
          issues.push(`Count error for ${symbol} ${interval}`);
          continue;
        }

        console.log(`  ${interval}: ${count} signals`);
        symbolTotal += count || 0;

        // Sample first signal
        const { data: sample, error: sampleError } = await supabaseAdmin
          .from('signals')
          .select('*')
          .eq('symbol', symbol)
          .eq('interval', interval)
          .order('bar_time', { ascending: true })
          .limit(1);

        if (sampleError) {
          console.log(`    ❌ Sample error: ${sampleError.message}`);
          issues.push(`Sample error for ${symbol} ${interval}`);
        } else if (sample && sample.length > 0) {
          const sig = sample[0];
          console.log(`    Sample signal:`);
          console.log(`      bar_time: ${sig.bar_time}`);
          console.log(`      entry_price: ${sig.entry_price}`);
          console.log(`      pnl_pct: ${sig.pnl_pct}`);
          console.log(`      is_win: ${sig.is_win}`);
          console.log(`      confidence: ${sig.confidence}`);
          console.log(`      close_reason: ${sig.close_reason}`);

          // Check for missing fields
          if (!sig.bar_time) issues.push(`${symbol} ${interval}: Missing bar_time`);
          if (sig.pnl_pct === null) issues.push(`${symbol} ${interval}: pnl_pct is NULL`);
          if (sig.is_win === null) issues.push(`${symbol} ${interval}: is_win is NULL`);
        }
      } catch (err) {
        console.log(`  ${interval}: ❌ Exception - ${err.message}`);
        issues.push(`Exception for ${symbol} ${interval}: ${err.message}`);
      }
    }

    console.log(`  ${symbol} Total: ${symbolTotal}`);
    totalSignals += symbolTotal;
  }

  console.log('\n====================================');
  console.log(`📈 TOTAL SIGNALS IN DATABASE: ${totalSignals}`);

  if (issues.length === 0) {
    console.log('✅ No issues found - Database looks good!\n');
  } else {
    console.log(`\n⚠️  ISSUES FOUND (${issues.length}):`);
    issues.forEach((issue, idx) => {
      console.log(`  ${idx + 1}. ${issue}`);
    });
    console.log();
  }

  // Check if signals table exists and has data
  console.log('\n🔍 CHECKING SIGNALS TABLE STRUCTURE:');
  try {
    const { data: allSignals, error: allError } = await supabaseAdmin
      .from('signals')
      .select('*')
      .limit(1);

    if (allError) {
      console.log(`❌ Table access error: ${allError.message}`);
    } else if (allSignals && allSignals.length > 0) {
      const sig = allSignals[0];
      console.log('✓ Table accessible');
      console.log('  Fields present:');
      Object.keys(sig).forEach(key => {
        console.log(`    - ${key}: ${sig[key] !== null ? '✓' : '❌ NULL'}`);
      });
    } else {
      console.log('⚠️  Signals table is empty');
    }
  } catch (err) {
    console.log(`❌ Error checking table: ${err.message}`);
  }

  // Test performance endpoint query
  console.log('\n🔍 TESTING PERFORMANCE QUERY:');
  try {
    const { data: perfData, error: perfError } = await supabaseAdmin
      .from('signals')
      .select('*')
      .eq('symbol', 'BTCUSDT')
      .eq('interval', '15m')
      .order('bar_time', { ascending: true });

    if (perfError) {
      console.log(`❌ Query error: ${perfError.message}`);
    } else {
      const completed = perfData.filter(s => s.pnl_pct !== null && s.pnl_pct !== undefined);
      const wins = completed.filter(s => s.is_win === true);
      const losses = completed.filter(s => s.is_win === false);
      const pnlValues = completed.map(s => parseFloat(s.pnl_pct));
      const totalPnl = pnlValues.reduce((a, b) => a + b, 0);
      const winRate = completed.length > 0 ? (wins.length / completed.length * 100).toFixed(1) : '0';

      console.log(`✓ BTCUSDT 15m Performance:`);
      console.log(`  Total signals: ${perfData.length}`);
      console.log(`  Completed (with PnL): ${completed.length}`);
      console.log(`  Wins: ${wins.length}`);
      console.log(`  Losses: ${losses.length}`);
      console.log(`  Win rate: ${winRate}%`);
      console.log(`  Total PnL: ${totalPnl.toFixed(2)}%`);
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }
}

diagnoseDatabase().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
