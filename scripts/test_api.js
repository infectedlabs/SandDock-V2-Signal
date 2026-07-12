#!/usr/bin/env node
const axios = require('axios');

async function main() {
  try {
    const { data } = await axios.get('http://localhost:3000/api/signals/log?page=1&page_size=10');
    
    console.log('API Response:\n');
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

main();
