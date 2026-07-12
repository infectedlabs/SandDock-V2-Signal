import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { memoryCache } from '@/lib/memoryCache';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT'
];
// PRODUCTION: 30m only
const TIMEFRAMES = ['30m'];

function generateDeterministicUUID(symbol, interval, barTime) {
  const hash = crypto.createHash('md5').update(`${symbol}-${interval}-${barTime}`).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16),
    'a' + hash.slice(17, 20),
    hash.slice(20, 32)
  ].join('-');
}

async function upsertSignalsSafe(supabaseAdmin, dbPayload) {
  if (!dbPayload || dbPayload.length === 0) return;
  const sym = dbPayload[0].symbol;
  const tf = dbPayload[0].interval;

  const { error } = await supabaseAdmin
    .from('signals')
    .upsert(dbPayload, { onConflict: 'id' });

  if (error) {
    console.warn(`[Sync-Upsert] Upsert error for ${sym} ${tf}:`, error.message);
    throw error;
  }
}

async function runBackgroundSync() {
  console.log('[Background Sync] 30m signal database ready. All signals pre-loaded from backfill.');
  // Sync is minimal for 30m-only: signals are pre-backfilled in database
  // Future: Add logic to update closed_at / close_price for live tracking
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bypass = searchParams.get('bypass') === 'true';
    const now = Date.now();
    const lastSync = memoryCache.lastSyncTime || 0;
    
    // Cooldown check (5 minutes = 300,000ms)
    if (!bypass && now - lastSync < 300000) {
      const remainingSeconds = Math.ceil((300000 - (now - lastSync)) / 1000);
      return NextResponse.json({ 
        status: 'throttled', 
        message: `Sync throttled. Try again in ${remainingSeconds}s.` 
      });
    }

    // Update last sync timestamp immediately to prevent concurrent requests from launching separate sync loops
    memoryCache.lastSyncTime = now;

    // Trigger sync in background (not awaited)
    runBackgroundSync().catch(err => console.error('[Sync API] Error in background execution:', err));

    return NextResponse.json({ 
      status: 'syncing', 
      message: 'Background synchronization started for all 15 coins.' 
    });
  } catch (err) {
    console.error('[/api/signals/sync] Error:', err);
    return NextResponse.json({ status: 'error', message: err.message }, { status: 500 });
  }
}
