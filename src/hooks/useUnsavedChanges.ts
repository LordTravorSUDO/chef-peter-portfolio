/**
 * useUnsavedChanges — warns the user when navigating away with unsaved changes.
 *
 * Two layers:
 *   1. beforeunload — browser tab/window close warning (native confirm dialog)
 *   2. React Router  — intercepted by a confirm() when navigating within the SPA
 *
 * Usage:
 *   const { hasChanges } = useAutosave(...);
 *   useUnsavedChanges(hasChanges || isDirty);
 */

import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function useUnsavedChanges(isDirty: boolean): void {
  const navigate  = useNavigate();
  const location  = useLocation();

  // ── beforeunload: browser-level guard ──────────────────────────────────
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';  // triggers the browser's "Leave site?" dialog
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── React Router guard: in-app navigation ───────────────────────────────
  // We use a History API patching approach to intercept pushState/replaceState.
  // This is the standard approach for SPAs without react-router blockers.
  useEffect(() => {
    if (!isDirty) return;

    let intercepted = false;
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;

    const handleNav = (e: PopStateEvent | Event) => {
      if (intercepted) return;
      if (!window.confirm('You have unsaved changes. Leave this page?')) {
        // Restore the original URL — block navigation
        e.preventDefault();
        intercepted = true;
        history.pushState(originalPush.call(history, {}, '', location.pathname + location.search), '', location.pathname + location.search);
        intercepted = false;
        return;
      }
    };

    const confirmPush = function (this: History, ...args: Parameters<typeof originalPush>) {
      if (intercepted) return originalPush.apply(this, args);
      const url = args[2];
      if (typeof url === 'string' && url !== location.pathname + location.search) {
        if (!window.confirm('You have unsaved changes. Leave this page?')) {
          return; // block the pushState
        }
      }
      return originalPush.apply(this, args);
    };

    history.pushState = confirmPush as typeof originalPush;

    window.addEventListener('popstate', handleNav);

    return () => {
      history.pushState = originalPush;
      history.replaceState = originalReplace;
      window.removeEventListener('popstate', handleNav);
    };
  }, [isDirty, location.pathname, location.search, navigate]);
}
