const http = require('http');

const ports = [3000, 3001, 3002, 5000, 8000];

function fetchHistory(port) {
  return new Promise((resolve) => {
    const url = `http://localhost:${port}/api/signals/history?symbol=ALL&interval=4h&filter=1y&plan=master`;
    console.log(`Trying ${url}...`);
    
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            console.log(`Port ${port} success! Status: 200, Signals count: ${json.length}`);
            resolve({ port, success: true, count: json.length, data: json });
          } catch (e) {
            console.log(`Port ${port} success but failed to parse JSON.`);
            resolve({ port, success: false });
          }
        } else {
          console.log(`Port ${port} returned status: ${res.statusCode}`);
          resolve({ port, success: false });
        }
      });
    });

    req.on('error', (err) => {
      console.log(`Port ${port} connection failed: ${err.message}`);
      resolve({ port, success: false });
    });
    
    req.setTimeout(3000, () => {
      req.destroy();
      console.log(`Port ${port} timed out.`);
      resolve({ port, success: false });
    });
  });
}

async function main() {
  for (const port of ports) {
    const res = await fetchHistory(port);
    if (res.success) {
      const data = res.data;
      if (data.length > 0) {
        const wins = data.filter(s => s.is_win === true).length;
        const losses = data.filter(s => s.is_win === false).length;
        console.log(`Wins: ${wins}, Losses: ${losses}`);
        
        let cumulativeR = 0;
        data.forEach(s => {
          const pnl = parseFloat(s.pnl_pct || 0);
          const sl = parseFloat(s.sl_pct || 0);
          const r = sl > 0 ? (pnl / sl) : 0;
          cumulativeR += r;
        });
        console.log(`Cumulative R: ${cumulativeR.toFixed(2)}%`);
      }
      break;
    }
  }
}

main().catch(console.error);
