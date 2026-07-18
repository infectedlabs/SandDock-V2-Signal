/**
 * Check for ACTIVE signals (closed_at = null)
 */

require('dotenv').config({ path: './telegram-signal-worker/.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function check() {
  try {
    console.log('🔍 Checking for ACTIVE signals (closed_at = null)...\n');

    // Check for active signals (closed_at is null)
    for (const symbol of ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']) {
      const { data: activeSignals, error: activeError } = await supabase
        .from('signals')
        .select('id, symbol, signal_type, bar_time, entry_price, closed_at')
        .eq('symbol', symbol)
        .eq('interval', '30m')
        .is('closed_at', null)
        .order('bar_time', { ascending: false });

      if (activeError) {
        console.error(`❌ Error checking ${symbol}:`, activeError.message);
        continue;
      }

      console.log(`\n📍 ${symbol} (30m) - ACTIVE signals: ${activeSignals?.length || 0}`);
      if (activeSignals && activeSignals.length > 0) {
        activeSignals.forEach(s => {
          console.log(`    ✓ ${s.signal_type.toUpperCase()} @ $${s.entry_price} (bar: ${s.bar_time})`);
        });
      }

      // Also show total closed signals
      const { data: closedSignals, error: closedError } = await supabase
        .from('signals')
        .select('id', { count: 'exact', head: true })
        .eq('symbol', symbol)
        .eq('interval', '30m')
        .not('closed_at', 'is', null);

      if (!closedError) {
        console.log(`     CLOSED signals: ${closedSignals?.length || 0}`);
      }
    }

    console.log('\n✅ Check complete');
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

check();
