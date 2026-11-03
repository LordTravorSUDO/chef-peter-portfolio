import React from 'react';

interface Option { value: string; label: string; }

interface Props {
  label:      string;
  options:   Option[];
  value?:     string;
  onChange?:  (e: React.ChangeEvent<HTMLSelectElement>) => void;
  error?:     string;
  hint?:      string;
  id?:        string;
  required?:  boolean;
  disabled?:  boolean;
  className?: string;
}

export default function Select({ label, options, error, hint, id, className = '', ...rest }: Props) {
  const selectId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1">
      <label htmlFor={selectId} className="block text-sm font-medium text-[#1A2B40]">
        {label}
        {rest.required && <span className="text-[#C0392B] ml-0.5" aria-hidden>*</span>}
      </label>
      <select
        {...rest}
        id={selectId}
        className={`
          w-full rounded-lg border px-3 py-2 text-sm text-[#1A2B40] bg-white
          transition appearance-none
          focus:outline-none focus:ring-2 focus:ring-[#1B365D]/30 focus:border-[#1B365D]
          ${error ? 'border-[#C0392B]' : 'border-[#DDE3EA]'}
          disabled:bg-[#F4F6F8] disabled:cursor-not-allowed
          ${className}
        `}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint  && !error && <p className="text-xs text-[#6B7A8D]">{hint}</p>}
      {error && <p className="text-xs text-[#C0392B]" role="alert">{error}</p>}
    </div>
  );
}
