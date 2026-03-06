import { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className = '', id, ...props }: TextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
      {label && <span className="text-xs text-text-secondary">{label}</span>}
      <textarea
        id={textareaId}
        className={`rounded-lg border border-border bg-background px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${className}`}
        {...props}
      />
    </label>
  );
}
