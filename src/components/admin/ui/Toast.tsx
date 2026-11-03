/**
 * Toast notification system.
 * Usage:
 *   const { toasts, showToast } = useToast();
 *   showToast('Article saved', 'success');
 *   <ToastContainer toasts={toasts} />
 */
import React, { useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id:      string;
  message: string;
  type:    ToastType;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle  className="w-4 h-4 text-emerald-600 shrink-0" />,
  error:   <XCircle      className="w-4 h-4 text-red-600    shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-600  shrink-0" />,
  info:    <CheckCircle  className="w-4 h-4 text-[#1B365D]  shrink-0" />,
};

const BG: Record<ToastType, string> = {
  success: 'bg-white border-l-4 border-emerald-500',
  error:   'bg-white border-l-4 border-red-500',
  warning: 'bg-white border-l-4 border-amber-500',
  info:    'bg-white border-l-4 border-[#1B365D]',
};

interface ContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
    >
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg ${BG[t.type]}`}>
          {ICONS[t.type]}
          <p className="text-sm text-[#1A2B40] flex-1 leading-snug">{t.message}</p>
          <button
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss notification"
            className="text-[#6B7A8D] hover:text-[#1A2B40] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
