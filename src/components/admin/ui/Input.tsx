import React from 'react';

interface Props {
  label:      string;
  value?:     string | number;
  onChange?:  (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?:     string;
  hint?:      string;
  id?:        string;
  type?:      string;
  placeholder?: string;
  required?:  boolean;
  disabled?:  boolean;
  maxLength?: number;
  autoComplete?: string;
  className?: string;
  'aria-label'?: string;
}

export default function Input({ label, error, hint, id, className = '', ...rest }: Props) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-sm font-medium text-[#1A2B40]">
        {label}
        {rest.required && <span className="text-[#C0392B] ml-0.5" aria-hidden>*</span>}
      </label>
      <input
        {...rest}
        id={inputId}
        className={`
          w-full rounded-lg border px-3 py-2 text-sm text-[#1A2B40] bg-white
          placeholder:text-[#5F6E80]
          transition
          focus:outline-none focus:ring-2 focus:ring-[#1B365D]/30 focus:border-[#1B365D]
          ${error ? 'border-[#C0392B]' : 'border-[#DDE3EA]'}
          disabled:bg-[#F4F6F8] disabled:cursor-not-allowed
          ${className}
        `}
      />
      {hint  && !error && <p className="text-xs text-[#5F6E80]">{hint}</p>}
      {error && <p className="text-xs text-[#C0392B]" role="alert">{error}</p>}
    </div>
  );
}
