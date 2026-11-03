import React from 'react';

interface Props { size?: 'sm' | 'md' | 'lg'; className?: string; }

export default function Spinner({ size = 'md', className = '' }: Props) {
  const dim = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6';
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block rounded-full border-2 border-[#1B365D]/20 border-t-[#1B365D] animate-spin ${dim} ${className}`}
    />
  );
}
