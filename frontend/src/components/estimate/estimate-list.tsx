'use client';

import { useState } from 'react';
import { buildAuthHeaders, getApiBaseUrl, parseApiResponse } from '@/lib/api';
import { Estimate, EstimateStatus } from '@/lib/types';

const API_BASE = getApiBaseUrl();

interface EstimateListProps {
  estimates: Estimate[];
  sessionId: string;
  authToken: string;
  onRefresh: () => Promise<unknown>;
}

const STATUS_OPTIONS: EstimateStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'];

const statusStyles: Record<EstimateStatus, string> = {
  draft: 'bg-surface text-text-secondary border-border',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  accepted: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  expired: 'bg-amber-50 text-amber-700 border-amber-200',
  converted: 'bg-purple-50 text-purple-700 border-purple-200',
};

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function EstimateList({ estimates, sessionId, authToken, onRefresh }: EstimateListProps) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  async function handleStatusUpdate(estimateId: string, status: EstimateStatus) {
    setError('');
    setSuccess('');
    try {
      const headers = new Headers({
        ...buildAuthHeaders(sessionId, authToken || undefined),
        'Content-Type': 'application/json',
      });
      const response = await fetch(`${API_BASE}/api/v1/estimates/${estimateId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      });
      await parseApiResponse<Estimate>(response);
      setSuccess(`Status updated to "${status}"`);
      setTimeout(() => setSuccess(''), 3000);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  async function handleDownloadPdf(estimate: Estimate) {
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/v1/estimates/${estimate.id}/pdf`, {
        method: 'GET',
        headers: buildAuthHeaders(sessionId, authToken || undefined),
      });
      if (!response.ok) throw new Error(`Unable to download PDF (${response.status})`);

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${estimate.estimateNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download PDF');
    }
  }

  async function handleSendEmail(estimate: Estimate) {
    setError('');
    setSendingId(estimate.id);
    try {
      const headers = new Headers({
        ...buildAuthHeaders(sessionId, authToken || undefined),
        'Content-Type': 'application/json',
      });
      const response = await fetch(`${API_BASE}/api/v1/estimates/${estimate.id}/send`, {
        method: 'POST',
        headers,
      });
      const result = await parseApiResponse<{ status?: string; errorMessage?: string }>(response);
      if (result?.status === 'failed') {
        setError(result.errorMessage || 'Email delivery failed');
      } else {
        setSuccess('Estimate sent via email');
        setTimeout(() => setSuccess(''), 3000);
      }
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSendingId(null);
    }
  }

  async function handleConvertToInvoice(estimate: Estimate) {
    setError('');
    setConvertingId(estimate.id);
    try {
      const headers = new Headers({
        ...buildAuthHeaders(sessionId, authToken || undefined),
        'Content-Type': 'application/json',
      });
      const response = await fetch(`${API_BASE}/api/v1/estimates/${estimate.id}/convert`, {
        method: 'POST',
        headers,
      });
      await parseApiResponse<{ estimate: Estimate; invoice: unknown }>(response);
      setSuccess('Estimate converted to invoice');
      setTimeout(() => setSuccess(''), 3000);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert to invoice');
    } finally {
      setConvertingId(null);
    }
  }

  if (estimates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-secondary">
            <path d="M9 12h6M9 16h6M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-foreground">No estimates yet</p>
        <p className="mt-1 text-sm text-text-secondary">
          Create your first estimate using the form or the AI chatbot.
        </p>
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
      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
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
              <th className="px-3 pb-3">Valid Until</th>
              <th className="px-3 pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {estimates.map((estimate) => (
              <tr key={estimate.id} className="border-b border-border/50 hover:bg-surface/50">
                <td className="px-3 py-3 font-medium">{estimate.estimateNumber}</td>
                <td className="px-3 py-3 text-text-secondary">{estimate.clientProfile?.name || 'Unknown'}</td>
                <td className="px-3 py-3 font-medium">
                  {formatMoney(Number(estimate.total), estimate.currency || 'USD')}
                </td>
                <td className="px-3 py-3">
                  {estimate.status === 'converted' ? (
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles.converted}`}>
                      converted
                    </span>
                  ) : (
                    <select
                      value={estimate.status}
                      onChange={(e) => void handleStatusUpdate(estimate.id, e.target.value as EstimateStatus)}
                      className="h-7 rounded-md border border-border bg-background px-2 text-xs focus:outline-none"
                    >
                      {STATUS_OPTIONS.filter((s) => s !== 'converted').map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-3 py-3 text-xs text-text-secondary">{estimate.validUntil}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void handleDownloadPdf(estimate)}
                      className="rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:bg-surface"
                    >
                      PDF
                    </button>
                    {(estimate.status === 'draft' || estimate.status === 'sent') && (
                      <button
                        type="button"
                        onClick={() => void handleSendEmail(estimate)}
                        disabled={sendingId === estimate.id}
                        className="rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:bg-surface disabled:opacity-50"
                      >
                        {sendingId === estimate.id ? '...' : 'Send'}
                      </button>
                    )}
                    {estimate.status === 'accepted' && !estimate.convertedInvoiceId && (
                      <button
                        type="button"
                        onClick={() => void handleConvertToInvoice(estimate)}
                        disabled={convertingId === estimate.id}
                        className="rounded-md border border-green-200 px-2 py-1 text-xs text-green-600 hover:bg-green-50 disabled:opacity-50"
                      >
                        {convertingId === estimate.id ? '...' : 'Convert'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {estimates.map((estimate) => (
          <div key={estimate.id} className="rounded-xl border border-border bg-surface/50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold">{estimate.estimateNumber}</p>
                <p className="text-xs text-text-secondary">{estimate.clientProfile?.name || 'Unknown'}</p>
              </div>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[estimate.status]}`}>
                {estimate.status}
              </span>
            </div>
            <p className="mt-2 text-lg font-bold">
              {formatMoney(Number(estimate.total), estimate.currency || 'USD')}
            </p>
            <p className="text-xs text-text-secondary">Valid until {estimate.validUntil}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {estimate.status !== 'converted' && (
                <select
                  value={estimate.status}
                  onChange={(e) => void handleStatusUpdate(estimate.id, e.target.value as EstimateStatus)}
                  className="h-7 rounded-md border border-border bg-background px-2 text-xs focus:outline-none"
                >
                  {STATUS_OPTIONS.filter((s) => s !== 'converted').map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => void handleDownloadPdf(estimate)}
                className="h-7 rounded-md border border-border px-2 text-xs text-text-secondary hover:bg-surface"
              >
                PDF
              </button>
              {(estimate.status === 'draft' || estimate.status === 'sent') && (
                <button
                  type="button"
                  onClick={() => void handleSendEmail(estimate)}
                  disabled={sendingId === estimate.id}
                  className="h-7 rounded-md border border-border px-2 text-xs text-text-secondary hover:bg-surface disabled:opacity-50"
                >
                  {sendingId === estimate.id ? '...' : 'Send'}
                </button>
              )}
              {estimate.status === 'accepted' && !estimate.convertedInvoiceId && (
                <button
                  type="button"
                  onClick={() => void handleConvertToInvoice(estimate)}
                  disabled={convertingId === estimate.id}
                  className="h-7 rounded-md border border-green-200 px-2 text-xs text-green-600 hover:bg-green-50 disabled:opacity-50"
                >
                  {convertingId === estimate.id ? '...' : 'Convert'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
