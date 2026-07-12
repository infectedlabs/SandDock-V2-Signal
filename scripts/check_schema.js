#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // Get one signal to see structure
  const { data } = await supabase
    .from('signals')
    .select('*')
    .limit(1);

  if (data && data.length > 0) {
    console.log('Current signal structure:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('No signals in database');
  }
}

main();
