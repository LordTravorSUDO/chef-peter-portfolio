/**
 * Tiny in-memory cache for CMS reads (stale-while-revalidate).
 *
 * Pages show the last result for the same query immediately and refresh it in
 * the background, so returning to a page is instant and never flashes a
 * spinner. Entries live only for this browser tab. Every write invalidates
 * the affected prefix (e.g. "articles:"), so stale data is never shown after
 * the admin changes something.
 *
 * Deliberately minimal: no persistence, no dependencies.
 */

interface Entry<T> { data: T; at: number; }

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

/** Last cached value for `key`, if any (regardless of age). */
export function peek<T>(key: string): { data: T; ageMs: number } | undefined {
  const e = store.get(key) as Entry<T> | undefined;
  return e ? { data: e.data, ageMs: Date.now() - e.at } : undefined;
}

/**
 * Fetch `key` with de-duplication: concurrent calls for the same key share
 * one request. The result is cached.
 */
export function load<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const running = inflight.get(key) as Promise<T> | undefined;
  if (running) return running;
  const p = fetcher()
    .then((data) => { store.set(key, { data, at: Date.now() }); return data; })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/**
 * Return a fresh-enough cached value without a request, or fetch it.
 * Used for rarely-changing lists (categories, tags).
 */
export function getOrLoad<T>(key: string, maxAgeMs: number, fetcher: () => Promise<T>): Promise<T> {
  const hit = peek<T>(key);
  if (hit && hit.ageMs < maxAgeMs) return Promise.resolve(hit.data);
  return load(key, fetcher);
}

/** Drop every entry whose key starts with one of the prefixes. */
export function invalidate(...prefixes: string[]): void {
  for (const key of [...store.keys()]) {
    if (prefixes.some((p) => key.startsWith(p))) store.delete(key);
  }
}
