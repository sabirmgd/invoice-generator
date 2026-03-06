import { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ label, className = '', children, id, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
      {label && <span className="text-xs text-text-secondary">{label}</span>}
      <select
        id={selectId}
        className={`h-10 rounded-lg border border-border bg-background px-3 text-sm transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
