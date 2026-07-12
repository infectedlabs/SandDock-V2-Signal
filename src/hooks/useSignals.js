'use client';

import { useState, useEffect, useRef } from 'react';
import { getTimezoneOffset } from '@/lib/timezone';

/**
 * useSignals - fetches live signals from /api/signals/live.
 * Polls every 30 seconds for fresh data.
 * WebSocket push can be added on top once the Python FastAPI server is deployed.
 *
 * @param {object} filters - { plan, symbol, signal_type, interval, limit }
 * @returns {{ signals: Array, loading: boolean, error: string|null, refresh: Function }}
 */
export function useSignals(filters = {}) {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const timerRef = useRef(null);

  const fetchSignals = async () => {
    try {
      const tzOffset = getTimezoneOffset();
      const params = new URLSearchParams();
      if (filters.plan)         params.set('plan',        filters.plan);
      if (filters.user_id)      params.set('user_id',     filters.user_id);
      if (filters.symbol)       params.set('symbol',      filters.symbol);
      if (filters.signal_type)  params.set('signal_type', filters.signal_type);
      if (filters.interval)     params.set('interval',    filters.interval);
      if (filters.limit)        params.set('limit',       String(filters.limit));
      params.set('tz_offset', String(tzOffset));

      const res = await fetch(`/api/signals/live?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSignals(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchSignals();

    // Poll every 30 seconds
    timerRef.current = setInterval(fetchSignals, 30_000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.plan, filters.symbol, filters.signal_type, filters.interval]);

  return { signals, loading, error, refresh: fetchSignals };
}
