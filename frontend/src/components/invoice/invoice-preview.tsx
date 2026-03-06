'use client';

import { Invoice } from '@/lib/types';

interface InvoicePreviewProps {
  invoice: Invoice | null;
  logoDataUrl?: string;
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function InvoicePreview({ invoice, logoDataUrl }: InvoicePreviewProps) {
  if (!invoice) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-surface/30 p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-secondary">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">Invoice Preview</p>
          <p className="mt-1 text-xs text-text-secondary">
            Chat with Invo to create an invoice and see a live preview here.
          </p>
        </div>
      </div>
    );
  }

  const sender = invoice.senderProfile;
  const client = invoice.clientProfile;
  const bank = invoice.bankProfile;
  const items = invoice.items?.sort((a, b) => a.sortOrder - b.sortOrder) || [];
  const currency = invoice.currency || 'USD';

  return (
    <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          {logoDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoDataUrl} alt="Logo" className="mb-3 max-h-12 w-auto" />
          )}
          <h2 className="text-2xl font-bold text-foreground">INVOICE</h2>
        </div>
        <div className="text-right text-xs text-text-secondary space-y-0.5">
          <p className="font-semibold text-foreground">{invoice.invoiceNumber}</p>
          <p>Status: {invoice.status.toUpperCase()}</p>
          <p>Issue: {invoice.issueDate}</p>
          <p>Due: {invoice.dueDate}</p>
        </div>
      </div>

      <hr className="my-4 border-border" />

      {/* Parties */}
      <div className="grid grid-cols-2 gap-6 text-xs">
        <div>
          <p className="mb-1 font-semibold text-text-secondary uppercase tracking-wider text-[10px]">From</p>
          {sender?.companyName && <p className="font-semibold text-foreground">{sender.companyName}</p>}
          {sender?.name && sender.name !== sender.companyName && <p>{sender.name}</p>}
          {sender?.addressLine1 && <p>{sender.addressLine1}</p>}
          {sender?.city && <p>{[sender.city, sender.state, sender.postalCode].filter(Boolean).join(', ')}</p>}
          {sender?.country && <p>{sender.country}</p>}
          {sender?.email && <p>{sender.email}</p>}
          {sender?.taxId && <p>Tax ID: {sender.taxId}</p>}
        </div>
        <div>
          <p className="mb-1 font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Bill To</p>
          {client?.companyName && <p className="font-semibold text-foreground">{client.companyName}</p>}
          {client?.name && client.name !== client.companyName && <p>{client.name}</p>}
          {client?.addressLine1 && <p>{client.addressLine1}</p>}
          {client?.city && <p>{[client.city, client.state, client.postalCode].filter(Boolean).join(', ')}</p>}
          {client?.country && <p>{client.country}</p>}
          {client?.email && <p>{client.email}</p>}
          {client?.taxId && <p>Tax ID: {client.taxId}</p>}
        </div>
      </div>

      {/* Items table */}
      {items.length > 0 && (
        <div className="mt-6">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-text-secondary">
                <th className="pb-2">#</th>
                <th className="pb-2">Description</th>
                <th className="pb-2 text-right">Qty</th>
                <th className="pb-2 text-right">Unit Price</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} className="border-b border-border/50">
                  <td className="py-2 text-text-secondary">{i + 1}</td>
                  <td className="py-2">{item.description}</td>
                  <td className="py-2 text-right">{Number(item.quantity).toFixed(2)}</td>
                  <td className="py-2 text-right">{formatMoney(Number(item.unitPrice), currency)}</td>
                  <td className="py-2 text-right font-medium">{formatMoney(Number(item.amount), currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals */}
      <div className="mt-4 ml-auto w-48 space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-text-secondary">Subtotal</span>
          <span>{formatMoney(Number(invoice.subtotal), currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Tax ({Number(invoice.taxRate).toFixed(1)}%)</span>
          <span>{formatMoney(Number(invoice.taxAmount), currency)}</span>
        </div>
        <hr className="border-border" />
        <div className="flex justify-between text-sm font-bold">
          <span>Total</span>
          <span>{formatMoney(Number(invoice.total), currency)}</span>
        </div>
      </div>

      {/* Bank details */}
      {bank && (
        <div className="mt-6 rounded-lg bg-surface p-3 text-xs">
          <p className="mb-1 font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Bank Details</p>
          {bank.bankName && <p>Bank: {bank.bankName}</p>}
          {bank.accountHolder && <p>Account Holder: {bank.accountHolder}</p>}
          {bank.iban && <p>IBAN: {bank.iban}</p>}
          {bank.swiftCode && <p>SWIFT: {bank.swiftCode}</p>}
        </div>
      )}

      {/* Notes */}
      {invoice.notes && (
        <div className="mt-4 text-xs">
          <p className="mb-1 font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Notes</p>
          <p className="text-text-secondary">{invoice.notes}</p>
        </div>
      )}

      {/* Footer */}
      <p className="mt-6 text-center text-[10px] text-text-secondary">
        Generated with Invo
      </p>
    </div>
  );
}
