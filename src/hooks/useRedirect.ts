/**
 * useRedirect — checks the redirects table when an article slug is not found.
 *
 * When the ArticlePage renders its 404 state, it calls this hook to check
 * if the path has a redirect rule. If one exists, the hook navigates to the
 * new destination automatically.
 *
 * This is a client-side fallback. True server-side 3xx redirects require
 * updating vercel.json with explicit redirect rules (see docs/redirects.md).
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { findRedirect } from '../lib/services/redirects';

/**
 * @param shouldCheck  Only runs the check when true (i.e. when 404 state is confirmed)
 */
export function useRedirect(shouldCheck: boolean): void {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!shouldCheck) return;
    let cancelled = false;

    findRedirect(location.pathname)
      .then((redirect) => {
        if (cancelled || !redirect) return;

        // Prevent redirecting to an external URL (security — only allow same-origin or root-relative paths)
        const dest = redirect.to_path;
        const isSafe = dest.startsWith('/') && !dest.startsWith('//');
        if (!isSafe) return;

        // Use replace so the 404 page does not appear in browser history
        navigate(dest, { replace: true });
      })
      .catch(() => { /* silent — leave the 404 UI in place */ });

    return () => { cancelled = true; };
  }, [shouldCheck, location.pathname, navigate]);
}
