/**
 * useAutosave — debounced automatic save with visible status.
 *
 * Status states:
 *   'idle'      — nothing to save
 *   'dirty'     — has unsaved changes, waiting for the debounce delay
 *   'saving'    — a save is in progress
 *   'saved'     — the last save succeeded (returns to 'idle' after 3 s)
 *   'failed'    — the last save failed; `error` holds the reason
 *
 * Guarantees:
 *   - Only ONE save runs at a time. Saves requested while another is in
 *     flight wait for it, then run only if there are still unsaved changes.
 *   - A failure never disables autosave: the next edit schedules a new
 *     attempt, and an automatic retry runs with back-off (15 s → 60 s).
 *   - The "saved" baseline is the snapshot that was actually written, so edits
 *     made while a save is in flight are detected and saved afterwards — no
 *     content is silently dropped.
 *   - saveNow() rejects with the real error so callers can show it.
 *
 * Usage:
 *   const { status, error, saveNow, hasUnsavedChanges } = useAutosave({
 *     data: formData,
 *     onSave: async () => { await updateArticle(id, payload); },
 *     interval: 4000,          // debounce delay
 *     enabled: !!articleId,    // only autosave existing articles (not new)
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

const RETRY_DELAYS_MS = [15_000, 30_000, 60_000];

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Save failed. Please try again.';
}

export function useAutosave<T>({ data, onSave, interval = 3000, enabled = true }: Options<T>) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [error,  setError]  = useState<string | null>(null);

  const serialized = JSON.stringify(data);

  // Always-current references for use inside timers and async continuations
  const dataRef       = useRef(data);
  const serializedRef = useRef(serialized);
  const onSaveRef     = useRef(onSave);
  dataRef.current       = data;
  serializedRef.current = serialized;
  onSaveRef.current     = onSave;

  /** Serialized snapshot of the last successfully saved data */
  const baselineRef    = useRef(serialized);
  const inFlightRef    = useRef<Promise<void> | null>(null);
  const failureCount   = useRef(0);
  const mountedRef     = useRef(true);
  const savedTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  /**
   * Run one save of the latest data. Serialised: never overlaps another save.
   * Resolves when the data is saved (or nothing needed saving); rejects with
   * the save error.
   */
  const runSave = useCallback(async (): Promise<void> => {
    // Wait for any save already in flight (it may have saved everything)
    while (inFlightRef.current) {
      try { await inFlightRef.current; } catch { /* handled by its own caller */ }
    }

    if (serializedRef.current === baselineRef.current) {
      if (mountedRef.current) {
        setStatus((s) => (s === 'dirty' || s === 'failed' ? 'idle' : s));
        setError(null);
      }
      return;
    }

    const snapshotData = dataRef.current;
    const snapshot     = serializedRef.current;

    const attempt = (async () => {
      if (mountedRef.current) setStatus('saving');
      try {
        await onSaveRef.current(snapshotData);
        baselineRef.current  = snapshot;
        failureCount.current = 0;
        if (!mountedRef.current) return;
        setError(null);
        if (serializedRef.current === snapshot) {
          setStatus('saved');
          if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
          savedTimerRef.current = setTimeout(() => {
            if (mountedRef.current) setStatus((s) => (s === 'saved' ? 'idle' : s));
          }, 3000);
        } else {
          // Edits were made while saving — they will be saved by the debounce
          setStatus('dirty');
        }
      } catch (err) {
        failureCount.current += 1;
        if (mountedRef.current) {
          setError(errorMessage(err));
          setStatus('failed');
        }
        throw err;
      }
    })();

    inFlightRef.current = attempt;
    try {
      await attempt;
    } finally {
      if (inFlightRef.current === attempt) inFlightRef.current = null;
    }
  }, []);

  // ── Change tracking + debounced autosave ─────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    if (serialized === baselineRef.current) {
      // Back to the saved state (e.g. an edit was undone)
      setStatus((s) => (s === 'dirty' ? 'idle' : s));
      return;
    }

    // Keep 'saving' and 'failed' visible until the next attempt starts
    setStatus((s) => (s === 'saving' || s === 'failed' ? s : 'dirty'));

    const timer = setTimeout(() => {
      runSave().catch(() => { /* surfaced through status/error */ });
    }, interval);
    return () => clearTimeout(timer);
  }, [serialized, enabled, interval, runSave]);

  // ── Automatic retry after a failure (with back-off) ──────────────────────
  useEffect(() => {
    if (!enabled || status !== 'failed') return;
    const delay = RETRY_DELAYS_MS[Math.min(failureCount.current - 1, RETRY_DELAYS_MS.length - 1)] ?? RETRY_DELAYS_MS[0];
    const timer = setTimeout(() => {
      runSave().catch(() => { /* surfaced through status/error */ });
    }, delay);
    return () => clearTimeout(timer);
  }, [status, error, enabled, runSave]);

  /** Save immediately (used by the Save button). Rejects with the real error. */
  const saveNow = useCallback((): Promise<void> => runSave(), [runSave]);

  const hasUnsavedChanges = serialized !== baselineRef.current;

  return { status, error, saveNow, hasUnsavedChanges };
}
