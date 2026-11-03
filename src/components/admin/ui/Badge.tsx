import React from 'react';
import { STATUS_BADGE, STATUS_LABEL } from '../adminTheme';

interface Props { status: string; className?: string; }

export default function Badge({ status, className = '' }: Props) {
  const cls = STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
  const label = STATUS_LABEL[status] ?? status;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls} ${className}`}>
      {label}
    </span>
  );
}
