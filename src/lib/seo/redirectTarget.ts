/**
 * True for a same-site, root-relative path that cannot be read as another
 * host. Same rule as safeRedirectTarget in middleware.ts: no "//", no
 * backslashes, no whitespace (browsers and React Router can read "/\host"
 * as an external address — GHSA-wrjc-x8rr-h8h6).
 */
export function isSafeRedirectPath(dest: unknown): dest is string {
  return typeof dest === 'string' && dest.startsWith('/') && !dest.startsWith('//') && !/[\\\s]/.test(dest);
}
