/**
 * useCachedQuery — load data for a page with correct loading/error states.
 *
 * - Shows cached data for the same key immediately (no spinner) and refreshes
 *   it in the background.
 * - `loading` is true only when there is nothing to show yet.
 * - `refreshing` is true while a background refresh runs.
 * - Responses that arrive after the key changed (fast paging/filtering) are
 *   ignored, so an older request can never overwrite newer results.
 * - `error` keeps the message; `retry()` tries again.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { load, peek } from '../lib/cache';

export function useCachedQuery<T>(key: string | null, fetcher: () => Promise<T>) {
  const cached = key ? peek<T>(key) : undefined;
  const [data, setData]             = useState<T | undefined>(cached?.data);
  const [error, setError]           = useState<string | null>(null);
  const [pending, setPending]       = useState(false);
  const [tick, setTick]             = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const currentKey = useRef(key);

  useEffect(() => {
    currentKey.current = key;
    if (!key) return;
    const hit = peek<T>(key);
    if (hit) setData(hit.data);
    setPending(true);
    setError(null);
    load(key, () => fetcherRef.current())
      .then((d) => { if (currentKey.current === key) setData(d); })
      .catch((e) => { if (currentKey.current === key) setError(e instanceof Error ? e.message : 'Could not load data.'); })
      .finally(() => { if (currentKey.current === key) setPending(false); });
  }, [key, tick]);

  const retry = useCallback(() => setTick((t) => t + 1), []);

  // When the key changes, data from the previous key is kept visible (dimmed
  // by `refreshing`) instead of being replaced by a spinner.
  return {
    data,
    error,
    loading:    pending && data === undefined,
    refreshing: pending && data !== undefined,
    retry,
  };
}
