async function test() {
  const plan = 'pro';
  const interval = '1h';
  const url = `http://localhost:3000/api/signals/live?plan=${plan}&interval=${interval}`;
  
  console.log('Fetching:', url);
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Returned data length:', data.length);
    if (data.length > 0) {
      console.log('Data:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Fetch failed:', err.message);
  }
}

test();
