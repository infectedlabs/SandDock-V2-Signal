'use client';

import { useState, useEffect } from 'react';

/**
 * useSignalLog - paginated signal history from /api/signals/log.
 *
 * @param {object} opts - { plan, symbol, page, pageSize }
 * @returns {{ signals: Array, loading: boolean, error: string|null }}
 */
export function useSignalLog({ plan = 'free', symbol, interval, page = 1, pageSize = 50 } = {}) {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({ plan, page: String(page), page_size: String(pageSize) });
    if (symbol) params.set('symbol', symbol);
    if (interval) params.set('interval', interval);

    fetch(`/api/signals/log?${params.toString()}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) { setSignals(data); setError(null); } })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [plan, symbol, interval, page, pageSize]);

  return { signals, loading, error };
}
