'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * useCandles - fetches Heikin Ashi candle data from /api/chart/candles.
 * Polls every 60 seconds to pick up new bars from the signal engine.
 *
 * @param {string} symbol   - e.g. 'BTCUSDT'
 * @param {string} interval - e.g. '15m', '1h', '4h'
 * @param {number} limit    - number of candles to fetch (default 300)
 * @returns {{ candles: Array, loading: boolean, error: string|null }}
 */
export function useCandles(symbol = 'BTCUSDT', interval = '15m', limit = 300) {
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const timerRef = useRef(null);

  const fetchCandles = async () => {
    try {
      const res = await fetch(
        `/api/chart/candles?symbol=${symbol}&interval=${interval}&limit=${limit}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCandles(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setCandles([]);
    fetchCandles();

    timerRef.current = setInterval(fetchCandles, 60_000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, interval]);

  return { candles, loading, error };
}
