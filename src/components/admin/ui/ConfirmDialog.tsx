import React from 'react';
import Button from './Button';

interface Props {
  open:        boolean;
  title:       string;
  description: string;
  confirmLabel?: string;
  onConfirm:   () => void;
  onCancel:    () => void;
  loading?:    boolean;
}

export default function ConfirmDialog({
  open, title, description, confirmLabel = 'Delete',
  onConfirm, onCancel, loading = false,
}: Props) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4">
        <h2 id="confirm-title" className="text-base font-semibold text-[#1A2B40]">{title}</h2>
        <p className="text-sm text-[#5F6E80]">{description}</p>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
