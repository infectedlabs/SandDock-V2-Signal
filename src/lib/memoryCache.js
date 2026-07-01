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
export function runWithTimeout(promise, timeoutMs = 2000) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout: Operation exceeded ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([
    promise.then((val) => {
      clearTimeout(timeoutId);
      return val;
    }),
    timeoutPromise
  ]);
}
