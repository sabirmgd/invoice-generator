'use client';

import { Invoice, InvoiceStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface InvoiceCardProps {
  invoice: Invoice;
  onStatusChange: (id: string, status: InvoiceStatus) => void;
  onDownloadPdf: (invoice: Invoice) => void;
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function InvoiceCard({ invoice, onStatusChange, onDownloadPdf }: InvoiceCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface/50 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{invoice.invoiceNumber}</p>
          <p className="mt-0.5 text-xs text-text-secondary">
            {invoice.clientProfile?.name || 'Unknown client'}
          </p>
        </div>
        <Badge status={invoice.status} />
      </div>

      <p className="mt-3 text-lg font-bold text-foreground">
        {formatMoney(Number(invoice.total), invoice.currency || 'USD')}
      </p>

      <div className="mt-2 text-xs text-text-secondary">
        <span>Issued: {invoice.issueDate}</span>
        <span className="mx-2">|</span>
        <span>Due: {invoice.dueDate}</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <select
          value={invoice.status}
          onChange={(e) => onStatusChange(invoice.id, e.target.value as InvoiceStatus)}
          className="h-7 rounded-md border border-border bg-background px-2 text-xs focus:outline-none"
        >
          <option value="draft">draft</option>
          <option value="sent">sent</option>
          <option value="paid">paid</option>
          <option value="cancelled">cancelled</option>
        </select>

        <button
          type="button"
          onClick={() => onDownloadPdf(invoice)}
          className="h-7 rounded-md border border-border px-2 text-xs text-text-secondary hover:bg-surface"
        >
          PDF
        </button>
      </div>
    </div>
  );
}
