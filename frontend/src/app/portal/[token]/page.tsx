'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Invoice } from '@/lib/types';
import { formatCurrency } from '@/lib/currencies';
import { getApiBaseUrl } from '@/lib/api';

const API_BASE = getApiBaseUrl();

export default function PortalPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payError, setPayError] = useState('');
  const [paying, setPaying] = useState(false);

  const paymentStatus = searchParams.get('payment');

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const response = await fetch(`${API_BASE}/api/v1/portal/${token}`);
        if (!response.ok) {
          throw new Error(response.status === 404 ? 'Invoice not found or link expired' : 'Failed to load invoice');
        }
        const json = await response.json();
        setInvoice(json.data ?? json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    }
    fetchInvoice();
  }, [token]);

  async function handleDownloadPdf() {
    try {
      const response = await fetch(`${API_BASE}/api/v1/portal/${token}/pdf`);
      if (!response.ok) throw new Error('Failed to download PDF');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice?.invoiceNumber || 'invoice'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download PDF');
    }
  }

  async function handlePay() {
    setPaying(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/portal/${token}/pay`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to create payment session');
      const json = await response.json();
      const data = json.data ?? json;
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Payment failed');
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-text-secondary">Loading invoice...</div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-lg font-semibold text-foreground">Unable to load invoice</p>
          <p className="mt-2 text-sm text-text-secondary">{error || 'Invoice not found'}</p>
        </div>
      </div>
    );
  }

  const isPaid = invoice.status === 'paid';

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-2xl px-4">
        {/* Payment status banner */}
        {paymentStatus === 'success' && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Payment received successfully. Thank you!
          </div>
        )}
        {paymentStatus === 'cancelled' && (
          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
            Payment was cancelled. You can try again below.
          </div>
        )}

        {/* Invoice card */}
        <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border pb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">INVOICE</h1>
              <p className="mt-1 text-sm text-text-secondary">{invoice.invoiceNumber}</p>
            </div>
            <StatusBadge status={invoice.status} />
          </div>

          {/* Parties */}
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">From</p>
              <p className="mt-1 font-medium text-foreground">{invoice.senderProfile?.companyName || invoice.senderProfile?.name}</p>
              {invoice.senderProfile?.email && <p className="text-sm text-text-secondary">{invoice.senderProfile.email}</p>}
              {invoice.senderProfile?.addressLine1 && (
                <p className="text-sm text-text-secondary">
                  {[invoice.senderProfile.addressLine1, invoice.senderProfile.city, invoice.senderProfile.country].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">Bill To</p>
              <p className="mt-1 font-medium text-foreground">{invoice.clientProfile?.companyName || invoice.clientProfile?.name}</p>
              {invoice.clientProfile?.email && <p className="text-sm text-text-secondary">{invoice.clientProfile.email}</p>}
              {invoice.clientProfile?.addressLine1 && (
                <p className="text-sm text-text-secondary">
                  {[invoice.clientProfile.addressLine1, invoice.clientProfile.city, invoice.clientProfile.country].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="mt-6 flex gap-6 text-sm">
            <div>
              <span className="text-text-secondary">Issue Date: </span>
              <span className="font-medium text-foreground">{invoice.issueDate}</span>
            </div>
            <div>
              <span className="text-text-secondary">Due Date: </span>
              <span className="font-medium text-foreground">{invoice.dueDate}</span>
            </div>
          </div>

          {/* Items table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-secondary">
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-right">Qty</th>
                  <th className="pb-2 text-right">Price</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item) => (
                  <tr key={item.id} className="border-b border-border/50">
                    <td className="py-2 text-foreground">{item.description}</td>
                    <td className="py-2 text-right text-foreground">{item.quantity}</td>
                    <td className="py-2 text-right text-foreground">{formatCurrency(Number(item.unitPrice), invoice.currency)}</td>
                    <td className="py-2 text-right font-medium text-foreground">{formatCurrency(Number(item.quantity) * Number(item.unitPrice), invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Subtotal</span>
                <span className="text-foreground">{formatCurrency(Number(invoice.subtotal), invoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Tax ({invoice.taxRate}%)</span>
                <span className="text-foreground">{formatCurrency(Number(invoice.taxAmount), invoice.currency)}</span>
              </div>
              {invoice.lateFeeAmount != null && Number(invoice.lateFeeAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-red-500">Late Fee</span>
                  <span className="text-red-500">{formatCurrency(Number(invoice.lateFeeAmount), invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-lg font-bold">
                <span className="text-foreground">{invoice.lateFeeAmount != null && Number(invoice.lateFeeAmount) > 0 ? 'Total Due' : 'Total'}</span>
                <span className="text-foreground">{formatCurrency(Number(invoice.total) + (invoice.lateFeeAmount ? Number(invoice.lateFeeAmount) : 0), invoice.currency)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-6 rounded-lg bg-background p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">Notes</p>
              <p className="mt-1 text-sm text-foreground">{invoice.notes}</p>
            </div>
          )}

          {/* Bank details */}
          {invoice.bankProfile && (
            <div className="mt-4 rounded-lg bg-background p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">Bank Details</p>
              <div className="mt-1 space-y-0.5 text-sm text-foreground">
                {invoice.bankProfile.bankName && <p>{invoice.bankProfile.bankName}</p>}
                {invoice.bankProfile.accountHolder && <p>Account: {invoice.bankProfile.accountHolder}</p>}
                {invoice.bankProfile.iban && <p>IBAN: {invoice.bankProfile.iban}</p>}
                {invoice.bankProfile.swiftCode && <p>SWIFT: {invoice.bankProfile.swiftCode}</p>}
              </div>
            </div>
          )}

          {/* Pay error inline banner */}
          {payError && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {payError}
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="h-10 rounded-lg border border-border px-5 text-sm font-medium text-foreground hover:bg-background transition-colors"
            >
              Download PDF
            </button>
            {!isPaid && (
              <button
                type="button"
                onClick={handlePay}
                disabled={paying}
                className="h-10 rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {paying ? 'Redirecting...' : 'Pay Now'}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-text-secondary">
          Powered by Invo
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status] || styles.draft}`}>
      {status}
    </span>
  );
}
