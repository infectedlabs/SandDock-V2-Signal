async function test() {
  const plan = 'pro';
  const joined_at = '2026-06-27T18:24:45.023776+00:00';
  const url = `http://localhost:3000/api/performance/alltime-pnl?plan=${plan}&joined_at=${joined_at}`;
  
  console.log('Fetching:', url);
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', data);
  } catch (err) {
    console.error('Fetch failed:', err.message);
  }
}

test();
