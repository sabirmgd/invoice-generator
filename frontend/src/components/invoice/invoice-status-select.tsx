'use client';

import { InvoiceStatus } from '@/lib/types';

interface InvoiceStatusSelectProps {
  value: InvoiceStatus;
  onChange: (status: InvoiceStatus) => void;
}

export function InvoiceStatusSelect({ value, onChange }: InvoiceStatusSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as InvoiceStatus)}
      className="h-7 rounded-md border border-border bg-background px-2 text-xs focus:outline-none"
    >
      <option value="draft">draft</option>
      <option value="sent">sent</option>
      <option value="paid">paid</option>
      <option value="cancelled">cancelled</option>
    </select>
  );
}
