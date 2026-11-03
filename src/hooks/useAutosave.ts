/**
 * useAutosave — debounced automatic save with visible status.
 *
 * Status states:
 *   'idle'      — nothing to save
 *   'saving'    — save in progress
 *   'saved'     — last save succeeded (auto-clears after 3s)
 *   'failed'    — last save failed
 *   'dirty'     — has unsaved changes, waiting for debounce or user action
 *
 * Usage:
 *   const { status, saveNow } = useAutosave({
 *     data: formData,
 *     onSave: async (data) => { await updateArticle(id, data); },
 *     interval: 3000,          // debounce delay
 *     enabled: !!articleId,    // only autosave existing articles (not new)
 *   });
 */

import { useRef, useState, useEffect, useCallback } from 'react';

export type AutosaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'failed';

interface Options<T> {
  data:          T;
  onSave:       (data: T) => Promise<void>;
  /** Debounce delay in ms (default 3000) */
  interval?:    number;
  /** Only autosave when true (e.g. only for existing articles, not new ones) */
  enabled?:     boolean;
  /** Compare function — if omitted, uses JSON.stringify equality */
  hasChanges?:  (prev: T, next: T) => boolean;
}

export function useAutosave<T>({ data, onSave, interval = 3000, enabled = true, hasChanges }: Options<T>) {
  const [status,  setStatus]  = useState<AutosaveStatus>('idle');
  const lastSavedRef          = useRef<T>(data);
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef             = useRef(false);
  const dirtyRef              = useRef(false);

  // Compare data with last saved state
  const checkDirty = useCallback((d: T): boolean => {
    if (hasChanges) return hasChanges(lastSavedRef.current, d);
    return JSON.stringify(lastSavedRef.current) !== JSON.stringify(d);
  }, [hasChanges]);

  // Track changes
  useEffect(() => {
    if (!enabled) { setStatus('idle'); return; }
    const isDirty = checkDirty(data);
    dirtyRef.current = isDirty;
    if (isDirty && status !== 'saving' && status !== 'failed') {
      setStatus('dirty');
    }
  }, [data, enabled, checkDirty, status]);

  // Debounced autosave
  useEffect(() => {
    if (!enabled) return;
    if (status !== 'dirty') return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (!dirtyRef.current || savingRef.current) return;
      savingRef.current = true;
      setStatus('saving');
      try {
        await onSave(data);
        lastSavedRef.current = data;
        dirtyRef.current = false;
        setStatus('saved');
        // Auto-clear "saved" after 3 seconds
        setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 3000);
      } catch {
        setStatus('failed');
      } finally {
        savingRef.current = false;
      }
    }, interval);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [status, data, onSave, interval, enabled]);

  /** Manually trigger an immediate save (used by the Save button) */
  const saveNow = useCallback(async (): Promise<boolean> => {
    if (savingRef.current) return false;
    if (!checkDirty(data)) { setStatus('idle'); return true; }
    savingRef.current = true;
    setStatus('saving');
    try {
      await onSave(data);
      lastSavedRef.current = data;
      dirtyRef.current = false;
      setStatus('saved');
      setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 3000);
      return true;
    } catch {
      setStatus('failed');
      return false;
    } finally {
      savingRef.current = false;
    }
  }, [data, onSave, checkDirty]);

  /** Reset the "saved" baseline — call after a manual save outside autosave */
  const resetBaseline = useCallback((newBaseline: T) => {
    lastSavedRef.current = newBaseline;
    dirtyRef.current = false;
    setStatus('idle');
  }, []);

  return { status, saveNow, resetBaseline, isDirty: dirtyRef.current };
}
