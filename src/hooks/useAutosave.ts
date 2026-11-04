/**
 * useAutosave — debounced automatic save with visible status.
 *
 * Status states:
 *   'idle'      — nothing to save
 *   'dirty'     — has unsaved changes, waiting for debounce or user action
 *   'saving'    — save in progress
 *   'saved'     — last save succeeded (auto-clears after 3s)
 *   'failed'    — last save failed (see `error`); content is kept in the form
 *
 * Guarantees:
 *   - Only one save runs at a time. A save requested while another is in
 *     flight waits for it, then saves the newest data (no overlapping writes,
 *     no duplicate submissions).
 *   - `saveNow()` resolves only after the database confirmed the save and
 *     rejects with the real error message on failure.
 *   - Edits made while a save is in flight stay 'dirty' and are saved next.
 *   - A failed autosave is not retried in a loop; the next edit (or a manual
 *     save) tries again.
 *
 * Usage:
 *   const { status, error, saveNow } = useAutosave({
 *     data: formSnapshot,
 *     onSave: async (snapshot) => { await updateArticle(id, snapshot); },
 *     interval: 4000,
 *     enabled: isExistingArticle,
 *   });
 */

import { useRef, useState, useEffect, useCallback } from 'react';

export type AutosaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'failed';

interface Options<T> {
  data:       T;
  onSave:     (data: T) => Promise<void>;
  /** Debounce delay in ms (default 3000) */
  interval?:  number;
  /** Only autosave when true (e.g. only for existing articles, not new ones) */
  enabled?:   boolean;
}

export function useAutosave<T>({ data, onSave, interval = 3000, enabled = true }: Options<T>) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [error,  setError]  = useState<string | null>(null);

  const dataKey        = JSON.stringify(data);
  const lastSavedKey   = useRef(dataKey);
  const latest         = useRef({ data, dataKey, onSave });
  latest.current       = { data, dataKey, onSave };
  const inflight       = useRef<Promise<void> | null>(null);
  const savedTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Save the newest data, after any save already in flight. */
  const runSave = useCallback(async (): Promise<void> => {
    while (inflight.current) {
      try { await inflight.current; } catch { /* the earlier save reported its own error */ }
    }

    const { data: snapshot, dataKey: key, onSave: save } = latest.current;
    if (key === lastSavedKey.current) {
      setStatus((s) => (s === 'failed' || s === 'dirty' ? 'idle' : s));
      setError(null);
      return;
    }

    const attempt = (async () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
      setStatus('saving');
      setError(null);
      try {
        await save(snapshot);
        lastSavedKey.current = key;
        if (latest.current.dataKey === key) {
          setStatus('saved');
          savedTimer.current = setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 3000);
        } else {
          setStatus('dirty'); // edited while saving — the debounce will save again
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed.');
        setStatus('failed');
        throw e;
      }
    })();

    inflight.current = attempt;
    try {
      await attempt;
    } finally {
      if (inflight.current === attempt) inflight.current = null;
    }
  }, []);

  // Track dirtiness
  useEffect(() => {
    if (!enabled) return;
    if (inflight.current) return;               // status is managed by runSave
    if (dataKey !== lastSavedKey.current) setStatus('dirty');
  }, [dataKey, enabled]);

  // Debounced autosave — restarts on every edit
  useEffect(() => {
    if (!enabled) return;
    if (dataKey === lastSavedKey.current) return;
    const t = setTimeout(() => { runSave().catch(() => { /* surfaced via status/error */ }); }, interval);
    return () => clearTimeout(t);
  }, [dataKey, enabled, interval, runSave]);

  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current); }, []);

  /** Save immediately (Save button, or before publishing). Throws on failure. */
  const saveNow = useCallback(() => runSave(), [runSave]);

  const isDirty = dataKey !== lastSavedKey.current;

  return { status, error, saveNow, isDirty };
}
