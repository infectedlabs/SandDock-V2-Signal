'use client';

import { useState, useEffect } from 'react';

export function useDailyMetrics(symbol = 'BTCUSDT', interval = '15m', days = 7) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/performance/daily-metrics?symbol=${symbol}&interval=${interval}&days=${days}`
        );
        if (!res.ok) throw new Error('Failed to fetch daily metrics');
        const data = await res.json();
        setMetrics(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching daily metrics:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval_id = setInterval(fetchMetrics, 30000); // Refresh every 30s
    return () => clearInterval(interval_id);
  }, [symbol, interval, days]);

  return { metrics, loading, error };
}
