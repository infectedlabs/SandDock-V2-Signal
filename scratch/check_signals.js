const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('signals')
    .select('*')
    .eq('symbol', 'BTCUSDT')
    .eq('interval', '30m')
    .order('bar_time', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching signals:', error);
    return;
  }

  console.log('Fetched signals count:', data.length);
  if (data.length > 0) {
    console.log('Sample signal:', JSON.stringify(data[0], null, 2));
  }
}

check();
