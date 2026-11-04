/**
 * useMediaUploads — upload queue shared by the Media page and the media picker.
 *
 * - Files upload one after another, each with its own progress.
 * - Each queued or running upload can be cancelled (the request is aborted;
 *   nothing is stored and no media row is created).
 * - Finished uploads clear themselves after a few seconds; failed ones stay
 *   until dismissed so the error can be read.
 * - Uploads still running when the component unmounts are aborted.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadMedia } from '../lib/services/media';
import type { Media } from '../types/article';

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'failed' | 'cancelled';

export interface UploadItem {
  id:        string;
  filename:  string;
  progress:  number;          // 0–100
  status:    UploadStatus;
  error?:    string;
  media?:    Media;
}

export interface UploadBatchResult {
  uploaded:  Media[];
  failed:    number;
  cancelled: number;
}

const AUTO_CLEAR_MS = 5000;

export function useMediaUploads(opts: { folder?: string } = {}) {
  const { folder = 'articles' } = opts;
  const [items, setItems] = useState<UploadItem[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const map = controllers.current;
    return () => {
      mounted.current = false;
      map.forEach((c) => c.abort());
      map.clear();
    };
  }, []);

  const patch = useCallback((id: string, p: Partial<UploadItem>) => {
    if (!mounted.current) return;
    setItems((prev) => prev.map((u) => (u.id === id ? { ...u, ...p } : u)));
  }, []);

  const scheduleClear = useCallback((id: string) => {
    setTimeout(() => {
      if (mounted.current) setItems((prev) => prev.filter((u) => u.id !== id));
    }, AUTO_CLEAR_MS);
  }, []);

  /** Queue files and upload them in order. Resolves when the batch is finished. */
  const uploadFiles = useCallback(async (files: File[]): Promise<UploadBatchResult> => {
    const batch = files.map((file) => ({
      file,
      item: {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        filename: file.name, progress: 0, status: 'queued' as UploadStatus,
      },
    }));
    batch.forEach(({ item }) => controllers.current.set(item.id, new AbortController()));
    setItems((prev) => [...batch.map((b) => b.item), ...prev]);

    const result: UploadBatchResult = { uploaded: [], failed: 0, cancelled: 0 };

    for (const { file, item } of batch) {
      const controller = controllers.current.get(item.id);
      if (!controller || controller.signal.aborted) {
        result.cancelled++;
        patch(item.id, { status: 'cancelled' });
        scheduleClear(item.id);
        controllers.current.delete(item.id);
        continue;
      }
      patch(item.id, { status: 'uploading' });
      try {
        const media = await uploadMedia({
          file,
          folder,
          signal: controller.signal,
          onProgress: (sent, total) => {
            // Hold at 99% until the media row is saved, then show 100%.
            patch(item.id, { progress: total > 0 ? Math.min(99, Math.round((sent / total) * 100)) : 0 });
          },
        });
        result.uploaded.push(media);
        patch(item.id, { status: 'done', progress: 100, media });
        scheduleClear(item.id);
      } catch (err) {
        const cancelled = (err as { cancelled?: boolean })?.cancelled === true;
        if (cancelled) {
          result.cancelled++;
          patch(item.id, { status: 'cancelled' });
          scheduleClear(item.id);
        } else {
          result.failed++;
          patch(item.id, { status: 'failed', error: err instanceof Error ? err.message : 'Upload failed.' });
        }
      } finally {
        controllers.current.delete(item.id);
      }
    }
    return result;
  }, [folder, patch, scheduleClear]);

  /** Cancel a queued or running upload. */
  const cancel = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
  }, []);

  /** Remove a finished/failed entry from the list. */
  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((u) => u.id !== id || u.status === 'uploading' || u.status === 'queued'));
  }, []);

  const busy = items.some((u) => u.status === 'uploading' || u.status === 'queued');

  return { items, uploadFiles, cancel, dismiss, busy };
}
