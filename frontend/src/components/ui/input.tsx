import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
      {label && <span className="text-xs text-text-secondary">{label}</span>}
      <input
        id={inputId}
        className={`h-10 rounded-lg border border-border bg-background px-3 text-sm transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${className}`}
        {...props}
      />
    </label>
  );
}
