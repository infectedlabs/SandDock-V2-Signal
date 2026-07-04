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
    .select('id, symbol, interval, created_at, bar_time')
    .eq('symbol', 'BTCUSDT')
    .eq('interval', '1h');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Record count:', data.length);
    if (data.length > 0) {
      console.log('First 5 records:', data.slice(0, 5));
    }
  }
}

test();
