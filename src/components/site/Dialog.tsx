/**
 * Accessible modal dialog used by the public site (consultation form,
 * gallery viewer).
 *
 * - role="dialog" + aria-modal + aria-labelledby
 * - moves focus into the dialog on open and returns it to the trigger on close
 * - keeps Tab focus inside the dialog
 * - closes on Escape and on backdrop click
 * - locks page scrolling while open
 */
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: React.ReactNode;
  /** Tailwind max-width class for the panel */
  size?: string;
  /** Extra keyboard handling (e.g. arrow keys in the gallery viewer) */
  onKeyDown?: (e: KeyboardEvent) => void;
  panelClassName?: string;
  closeLabel?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Elements that are rendered and reachable by keyboard (skips hidden honeypots). */
function visible(nodes: NodeListOf<HTMLElement>): HTMLElement[] {
  return Array.from(nodes).filter((el) => el.tabIndex !== -1 && el.getClientRects().length > 0);
}

export function Dialog({
  open,
  onClose,
  labelledBy,
  children,
  size = 'max-w-xl',
  onKeyDown,
  panelClassName = '',
  closeLabel = 'Close',
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const onKeyDownRef = useRef(onKeyDown);
  onCloseRef.current = onClose;
  onKeyDownRef.current = onKeyDown;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the first form field if there is one, otherwise the panel itself.
    const panel = panelRef.current;
    const firstField = panel
      ? visible(panel.querySelectorAll<HTMLElement>('input:not([tabindex="-1"]), select, textarea'))[0]
      : undefined;
    (firstField ?? panel)?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const items = visible(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      onKeyDownRef.current?.(e);
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-charcoal/70 p-0 sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`relative max-h-[92vh] w-full ${size} overflow-y-auto rounded-t-xl bg-cream text-ink shadow-[0_24px_60px_-20px_rgba(28,26,23,0.45)] outline-none sm:rounded-xl ${panelClassName}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-card/90 text-ink-soft ring-1 ring-sand transition-colors hover:text-ink"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>
  );
}
