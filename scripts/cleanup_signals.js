#!/usr/bin/env node
/**
 * Force-clear all signals from database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanup() {
  console.log('🗑️  Fetching all signal IDs...');

  const { data: allSignals, error: fetchError } = await supabase
    .from('signals')
    .select('id');

  if (fetchError) {
    console.error('Fetch error:', fetchError);
    process.exit(1);
  }

  console.log(`Found ${allSignals.length} signals. Deleting in batches...`);

  let deleted = 0;
  for (let i = 0; i < allSignals.length; i += 100) {
    const batch = allSignals.slice(i, i + 100).map(s => s.id);
    const { error: deleteError } = await supabase
      .from('signals')
      .delete()
      .in('id', batch);

    if (deleteError) {
      console.error(`Batch delete error:`, deleteError);
    } else {
      deleted += batch.length;
      console.log(`✅ Deleted ${deleted}/${allSignals.length}`);
    }
  }

  console.log(`\n✅ Cleanup complete. Deleted ${deleted} signals.`);
  process.exit(0);
}

cleanup().catch(e => { console.error('Fatal:', e); process.exit(1); });
