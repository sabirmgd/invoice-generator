'use client';

import { useState } from 'react';
import { buildAuthHeaders, getApiBaseUrl, parseApiResponse } from '@/lib/api';
import { Invoice, InvoiceStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const API_BASE = getApiBaseUrl();

interface InvoiceListProps {
  invoices: Invoice[];
  sessionId: string;
  authToken: string;
  onRefresh: () => Promise<void>;
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function InvoiceList({ invoices, sessionId, authToken, onRefresh }: InvoiceListProps) {
  const [error, setError] = useState('');

  async function handleStatusUpdate(invoiceId: string, status: InvoiceStatus) {
    setError('');
    try {
      const headers = new Headers({
        ...buildAuthHeaders(sessionId, authToken || undefined),
        'Content-Type': 'application/json',
      });
      const response = await fetch(`${API_BASE}/api/v1/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      });
      await parseApiResponse<Invoice>(response);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  async function handleDownloadPdf(invoice: Invoice) {
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/v1/invoices/${invoice.id}/pdf`, {
        method: 'GET',
        headers: buildAuthHeaders(sessionId, authToken || undefined),
      });
      if (!response.ok) throw new Error(`Unable to download PDF (${response.status})`);

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download PDF');
    }
  }

  if (invoices.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-secondary">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <p className="text-sm font-medium text-foreground">No invoices yet</p>
        <p className="mt-1 text-sm text-text-secondary">
          Chat with Invo to create your first invoice.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90"
        >
          Start chatting
        </Link>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-secondary">
              <th className="px-3 pb-3">Number</th>
              <th className="px-3 pb-3">Client</th>
              <th className="px-3 pb-3">Amount</th>
              <th className="px-3 pb-3">Status</th>
              <th className="px-3 pb-3">Date</th>
              <th className="px-3 pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-b border-border/50 hover:bg-surface/50">
                <td className="px-3 py-3 font-medium">{invoice.invoiceNumber}</td>
                <td className="px-3 py-3 text-text-secondary">{invoice.clientProfile?.name || 'Unknown'}</td>
                <td className="px-3 py-3 font-medium">
                  {formatMoney(Number(invoice.total), invoice.currency || 'USD')}
                </td>
                <td className="px-3 py-3">
                  <select
                    value={invoice.status}
                    onChange={(e) => void handleStatusUpdate(invoice.id, e.target.value as InvoiceStatus)}
                    className="h-7 rounded-md border border-border bg-background px-2 text-xs focus:outline-none"
                  >
                    <option value="draft">draft</option>
                    <option value="sent">sent</option>
                    <option value="paid">paid</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </td>
                <td className="px-3 py-3 text-xs text-text-secondary">{invoice.issueDate}</td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => void handleDownloadPdf(invoice)}
                    className="rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:bg-surface"
                  >
                    PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {invoices.map((invoice) => (
          <div key={invoice.id} className="rounded-xl border border-border bg-surface/50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold">{invoice.invoiceNumber}</p>
                <p className="text-xs text-text-secondary">{invoice.clientProfile?.name || 'Unknown'}</p>
              </div>
              <Badge status={invoice.status} />
            </div>
            <p className="mt-2 text-lg font-bold">
              {formatMoney(Number(invoice.total), invoice.currency || 'USD')}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <select
                value={invoice.status}
                onChange={(e) => void handleStatusUpdate(invoice.id, e.target.value as InvoiceStatus)}
                className="h-7 rounded-md border border-border bg-background px-2 text-xs focus:outline-none"
              >
                <option value="draft">draft</option>
                <option value="sent">sent</option>
                <option value="paid">paid</option>
                <option value="cancelled">cancelled</option>
              </select>
              <button
                type="button"
                onClick={() => void handleDownloadPdf(invoice)}
                className="h-7 rounded-md border border-border px-2 text-xs text-text-secondary hover:bg-surface"
              >
                PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
