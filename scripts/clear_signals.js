require('dotenv').config({ path: './telegram-signal-worker/.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function main() {
  try {
    console.log('[CLEARING] Deleting all signals from database...');

    // Delete all records from signals table
    let totalDeleted = 0;
    let batchNum = 0;

    // Keep deleting until no more records
    while (true) {
      // Get one batch of IDs to delete
      const { data: batch, error: selectError } = await supabase
        .from('signals')
        .select('id')
        .limit(500);

      if (selectError) {
        console.error('❌ Select failed:', selectError.message);
        process.exit(1);
      }

      if (!batch || batch.length === 0) break;

      // Delete this batch
      const ids = batch.map(s => s.id);
      const { error: deleteError } = await supabase
        .from('signals')
        .delete()
        .in('id', ids);

      if (deleteError) {
        console.error(`❌ Delete batch failed:`, deleteError.message);
        process.exit(1);
      }

      totalDeleted += batch.length;
      batchNum++;
      console.log(`✓ Deleted batch ${batchNum} (${batch.length} records, total: ${totalDeleted})`);

      if (batch.length < 500) break;
    }

    console.log(`✅ Signals table cleared! Total deleted: ${totalDeleted}`);

    // Verify
    const { count } = await supabase.from('signals').select('*', { count: 'exact', head: true });
    console.log(`✅ Final count: ${count} signals in database\n`);

    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

main();
