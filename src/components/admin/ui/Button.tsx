import React from 'react';
import Spinner from './Spinner';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size    = 'sm' | 'md' | 'lg';

interface Props {
  variant?:  Variant;
  size?:     Size;
  loading?:  boolean;
  icon?:     React.ReactNode;
  children?: React.ReactNode;
  type?:      'button' | 'submit' | 'reset';
  disabled?: boolean;
  onClick?:  (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  'aria-label'?: string;
}

const BASE = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

const VARIANTS: Record<Variant, string> = {
  primary:   'bg-[#1B365D] text-white hover:bg-[#152A4A] focus-visible:ring-[#1B365D]',
  secondary: 'bg-[#4A777A] text-white hover:bg-[#3D6568] focus-visible:ring-[#4A777A]',
  danger:    'bg-[#C0392B] text-white hover:bg-[#A93226] focus-visible:ring-[#C0392B]',
  ghost:     'bg-transparent text-[#1B365D] hover:bg-[#F4F6F8] border border-[#DDE3EA] focus-visible:ring-[#1B365D]',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2   text-sm',
  lg: 'px-6 py-3   text-base',
};

export default function Button({
  variant = 'primary', size = 'md', loading = false,
  icon, children, disabled, className = '', ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading ? <Spinner size="sm" className="border-white/40 border-t-white" /> : icon}
      {children}
    </button>
  );
}
