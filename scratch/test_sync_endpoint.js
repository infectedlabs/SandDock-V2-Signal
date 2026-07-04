async function test() {
  const url = 'http://localhost:3000/api/signals/sync';
  console.log('Hitting sync endpoint:', url);
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
