'use client';

import { useState, useEffect } from 'react';

/**
 * usePerformance — fetches aggregated performance stats from /api/performance/summary.
 *
 * @param {string} symbol
 * @param {string} interval
 * @returns {{ stats: object|null, loading: boolean, error: string|null }}
 */
export function usePerformance(symbol = 'BTCUSDT', interval = '15m') {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/performance/summary?symbol=${symbol}&interval=${interval}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) { setStats(data); setError(null); } })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [symbol, interval]);

  return { stats, loading, error };
}
