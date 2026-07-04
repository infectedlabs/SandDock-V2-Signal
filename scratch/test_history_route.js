async function test() {
  const url = 'http://localhost:3000/api/signals/history?symbol=ALL&interval=15m&filter=today';
  console.log('Fetching history from:', url);
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Returned signals count:', data.length);
    if (data.length > 0) {
      console.log('First signal details:', {
        symbol: data[0].symbol,
        interval: data[0].interval,
        created_at: data[0].created_at,
        bar_time: data[0].bar_time,
        pnl_pct: data[0].pnl_pct
      });
    }
  } catch (err) {
    console.error('Fetch failed:', err.message);
  }
}

test();
