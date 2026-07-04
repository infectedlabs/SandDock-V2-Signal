const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envLocalPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envLocalPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
});

const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data, error } = await supabaseAdmin
    .from('signals')
    .select('symbol, interval, close_reason');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const counts = {};
  data.forEach(row => {
    const key = `${row.symbol}_${row.interval}`;
    counts[key] = counts[key] || { active: 0, closed: 0 };
    if (row.close_reason === null) {
      counts[key].active++;
    } else {
      counts[key].closed++;
    }
  });

  console.log('Database Signal Counts:');
  console.log(JSON.stringify(counts, null, 2));
}

test();
