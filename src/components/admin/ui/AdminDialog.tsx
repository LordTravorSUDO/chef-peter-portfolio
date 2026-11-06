/**
 * AdminDialog — accessible modal for CMS confirmations that need content
 * (e.g. choosing where to move articles before deleting a category).
 * Escape closes it, focus moves inside on open and returns on close.
 */
import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Prevent closing while an action is running */
  busy?: boolean;
}

export default function AdminDialog({ open, title, onClose, children, footer, busy = false }: Props) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>('select, input, textarea, button:not([data-close])');
    (first ?? panel.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busyRef.current) closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="w-full max-w-lg rounded-xl bg-white shadow-xl outline-none">
        <div className="flex items-start justify-between gap-4 border-b border-[#DDE3EA] px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-[#1A2B40]">{title}</h2>
          <button type="button" data-close onClick={onClose} disabled={busy} aria-label="Close" className="rounded p-1 text-[#5F6E80] hover:text-[#1A2B40]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 px-5 py-4 text-sm text-[#1A2B40]">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-[#DDE3EA] px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
