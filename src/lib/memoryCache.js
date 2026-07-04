if (!globalThis.sanddockMemoryCache) {
  globalThis.sanddockMemoryCache = {
    candles: {},
    signals: {},
    live: {},
    log: {},
    stats: {},
    history: {},
  };
}

export const memoryCache = globalThis.sanddockMemoryCache;

/**
 * Wraps a promise in a timeout that rejects if the promise takes too long.
 * Useful for preventing Supabase connection timeouts from hanging backend routes.
 */
export function runWithTimeout(promise, timeoutMs = 5000) {
  const actualTimeout = Math.max(timeoutMs, 5000);
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout: Operation exceeded ${actualTimeout}ms`));
    }, actualTimeout);
  });

  return Promise.race([
    promise.then((val) => {
      clearTimeout(timeoutId);
      return val;
    }),
    timeoutPromise
  ]);
}
