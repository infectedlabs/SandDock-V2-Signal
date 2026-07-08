const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error(`.env.local not found at ${envPath}`);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function main() {
  console.log('Testing page 1 query (range 1000 to 1999) for 4h timeframe...');
  
  const allowedSymbols = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT',
    'TRXUSDT', 'DOGEUSDT', 'HBARUSDT', 'UNIUSDT', 'SUIUSDT',
    'AVAXUSDT', 'AAVEUSDT', 'JUPUSDT', 'PUMPUSDT', 'ARBUSDT'
  ];

  const { data: page0, error: err0 } = await supabaseAdmin
    .from('signals')
    .select('id, bar_time')
    .in('symbol', allowedSymbols)
    .eq('interval', '4h')
    .order('bar_time', { ascending: true })
    .range(0, 999);

  if (err0) console.error('Page 0 error:', err0);
  else console.log(`Page 0 returned ${page0.length} records. Last bar_time: ${page0[page0.length - 1]?.bar_time}`);

  const { data: page1, error: err1 } = await supabaseAdmin
    .from('signals')
    .select('id, bar_time')
    .in('symbol', allowedSymbols)
    .eq('interval', '4h')
    .order('bar_time', { ascending: true })
    .range(1000, 1999);

  if (err1) console.error('Page 1 error:', err1);
  else console.log(`Page 1 returned ${page1 ? page1.length : 0} records.`);
  if (page1 && page1.length > 0) {
    console.log(`Page 1 First bar_time: ${page1[0]?.bar_time}`);
  }
}

main().catch(console.error);
