/**
 * UploadProgressList — per-file upload progress with cancel / dismiss.
 */
import React from 'react';
import { X } from 'lucide-react';
import type { UploadItem } from '../../hooks/useMediaUploads';

interface Props {
  items:     UploadItem[];
  onCancel:  (id: string) => void;
  onDismiss: (id: string) => void;
  compact?:  boolean;
}

const LABEL: Record<UploadItem['status'], string> = {
  queued:    'Waiting…',
  uploading: '',
  done:      '✓ Uploaded',
  failed:    '✗ Failed',
  cancelled: 'Cancelled',
};

export default function UploadProgressList({ items, onCancel, onDismiss, compact = false }: Props) {
  if (items.length === 0) return null;
  const text = compact ? 'text-[11px]' : 'text-xs';

  return (
    <ul className="space-y-2" aria-label="Uploads" data-testid="upload-list">
      {items.map((u) => {
        const active = u.status === 'queued' || u.status === 'uploading';
        const color =
          u.status === 'done'      ? 'text-emerald-600' :
          u.status === 'failed'    ? 'text-[#C0392B]'   :
          u.status === 'cancelled' ? 'text-[#6B7A8D]'   : 'text-[#4A777A]';
        const bar =
          u.status === 'done'      ? 'bg-emerald-500' :
          u.status === 'failed'    ? 'bg-[#C0392B]'   :
          u.status === 'cancelled' ? 'bg-[#AAB4C0]'   : 'bg-[#4A777A]';
        const width = u.status === 'done' ? 100 : u.progress;

        return (
          <li key={u.id} data-testid="upload-item" data-status={u.status}>
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className={`${text} text-[#1A2B40] truncate`}>{u.filename}</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className={`${text} font-medium ${color}`} aria-live="polite">
                  {u.status === 'uploading' ? `${u.progress}%` : LABEL[u.status]}
                </span>
                {active ? (
                  <button
                    type="button"
                    onClick={() => onCancel(u.id)}
                    className={`${text} text-[#6B7A8D] hover:text-[#C0392B] hover:underline`}
                    aria-label={`Cancel upload of ${u.filename}`}
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onDismiss(u.id)}
                    className="text-[#6B7A8D] hover:text-[#1A2B40]"
                    aria-label={`Dismiss ${u.filename}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </span>
            </div>
            <div
              className={`${compact ? 'h-1' : 'h-1.5'} bg-[#F4F6F8] rounded-full overflow-hidden`}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={width}
              aria-label={`${u.filename} upload progress`}
            >
              <div className={`h-full rounded-full transition-all duration-300 ${bar}`} style={{ width: `${width}%` }} />
            </div>
            {u.status === 'failed' && u.error && (
              <p className={`${text} text-[#C0392B] mt-1 break-words`} role="alert">{u.error}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
