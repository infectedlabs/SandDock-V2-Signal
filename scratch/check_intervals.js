const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('signals')
    .select('interval, symbol, bar_time')
    .limit(100);

  if (error) {
    console.error(error);
    return;
  }

  const intervals = [...new Set(data.map(d => d.interval))];
  console.log('Unique intervals in DB signals:', intervals);

  // Group by interval and print count
  const counts = data.reduce((acc, curr) => {
    acc[curr.interval] = (acc[curr.interval] || 0) + 1;
    return acc;
  }, {});
  console.log('Counts:', counts);

  console.log('First 5 signals with details:');
  console.log(data.slice(0, 5));
}

check();
