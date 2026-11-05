import React from 'react';

interface Props {
  label:      string;
  value?:     string | number;
  onChange?:  (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?:     string;
  hint?:      string;
  id?:        string;
  placeholder?: string;
  required?:  boolean;
  disabled?:  boolean;
  rows?:      number;
  maxLength?: number;
  className?: string;
}

export default function Textarea({ label, error, hint, id, className = '', ...rest }: Props) {
  const textareaId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1">
      <label htmlFor={textareaId} className="block text-sm font-medium text-[#1A2B40]">
        {label}
        {rest.required && <span className="text-[#C0392B] ml-0.5" aria-hidden>*</span>}
      </label>
      <textarea
        {...rest}
        id={textareaId}
        className={`
          w-full rounded-lg border px-3 py-2 text-sm text-[#1A2B40] bg-white
          placeholder:text-[#5F6E80] resize-y min-h-[80px]
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
