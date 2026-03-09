'use client';

import { useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import { buildAuthHeaders, getApiBaseUrl, parseApiResponse } from '@/lib/api';
import { Estimate, EstimateStatus } from '@/lib/types';
import { EstimateForm } from '@/components/estimate/estimate-form';

const API_BASE = getApiBaseUrl();

const STATUS_STYLES: Record<EstimateStatus, string> = {
  draft: 'bg-surface text-text-secondary border-border',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  accepted: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  expired: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  converted: 'bg-purple-50 text-purple-700 border-purple-200',
};

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export default function EstimatesPage() {
  const { estimates, refreshWorkspaceData, sessionId, authToken, isLoadingData } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  async function handleStatusUpdate(estimateId: string, status: EstimateStatus) {
    setError('');
    setSuccess('');
    try {
      const headers = new Headers({
        ...buildAuthHeaders(sessionId, authToken || undefined),
        'Content-Type': 'application/json',
      });
      await fetch(`${API_BASE}/api/v1/estimates/${estimateId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      });
      setSuccess(`Status updated to "${status}"`);
      setTimeout(() => setSuccess(''), 3000);
      await refreshWorkspaceData();
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
        body: JSON.stringify({}),
      });
      await parseApiResponse<unknown>(response);
      setSuccess('Estimate sent via email');
      setTimeout(() => setSuccess(''), 3000);
      await refreshWorkspaceData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSendingId(null);
    }
  }

  async function handleCopyPortalLink(estimate: Estimate) {
    setError('');
    setCopyingId(estimate.id);
    try {
      const headers = new Headers({
        ...buildAuthHeaders(sessionId, authToken || undefined),
        'Content-Type': 'application/json',
      });
      const response = await fetch(`${API_BASE}/api/v1/estimates/${estimate.id}/portal-link`, {
        method: 'POST',
        headers,
      });
      const data = await parseApiResponse<{ url: string }>(response);
      try {
        await navigator.clipboard.writeText(`${window.location.origin}${data.url}`);
        setSuccess('Portal link copied to clipboard');
      } catch {
        setSuccess(`Portal link: ${window.location.origin}${data.url}`);
      }
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate portal link');
    } finally {
      setCopyingId(null);
    }
  }

  async function handleConvert(estimate: Estimate) {
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
      const data = await parseApiResponse<{ invoice: { invoiceNumber: string } }>(response);
      setSuccess(`Converted to invoice ${data.invoice.invoiceNumber}`);
      setTimeout(() => setSuccess(''), 5000);
      await refreshWorkspaceData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert estimate');
    } finally {
      setConvertingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estimates</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Create quotes, send to clients, and convert to invoices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refreshWorkspaceData()}
            disabled={isLoadingData}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-background disabled:opacity-50"
          >
            {isLoadingData ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
          >
            {showForm ? 'Close Form' : 'New Estimate'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-background">
          <EstimateForm
            onEstimateCreated={() => {
              setShowForm(false);
              setSuccess('Estimate created successfully');
              setTimeout(() => setSuccess(''), 3000);
            }}
          />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {estimates.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-secondary">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">No estimates yet</p>
          <p className="mt-1 text-sm text-text-secondary">
            Create your first estimate to send a quote to a client.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90"
          >
            Create Estimate
          </button>
        </div>
      ) : (
        <>
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
                      <select
                        value={estimate.status}
                        onChange={(e) => void handleStatusUpdate(estimate.id, e.target.value as EstimateStatus)}
                        disabled={estimate.status === 'converted'}
                        className="h-7 rounded-md border border-border bg-background px-2 text-xs focus:outline-none disabled:opacity-50"
                      >
                        <option value="draft">draft</option>
                        <option value="sent">sent</option>
                        <option value="accepted">accepted</option>
                        <option value="rejected">rejected</option>
                        <option value="expired">expired</option>
                        <option value="converted" disabled>converted</option>
                      </select>
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
                        {estimate.status !== 'draft' && estimate.status !== 'converted' && (
                          <button
                            type="button"
                            onClick={() => void handleCopyPortalLink(estimate)}
                            disabled={copyingId === estimate.id}
                            className="rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:bg-surface disabled:opacity-50"
                          >
                            {copyingId === estimate.id ? '...' : 'Link'}
                          </button>
                        )}
                        {estimate.status === 'accepted' && !estimate.convertedInvoiceId && (
                          <button
                            type="button"
                            onClick={() => void handleConvert(estimate)}
                            disabled={convertingId === estimate.id}
                            className="rounded-md border border-green-200 px-2 py-1 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50"
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
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[estimate.status]}`}>
                    {estimate.status}
                  </span>
                </div>
                <p className="mt-2 text-lg font-bold">
                  {formatMoney(Number(estimate.total), estimate.currency || 'USD')}
                </p>
                <p className="text-xs text-text-secondary">Valid until {estimate.validUntil}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value={estimate.status}
                    onChange={(e) => void handleStatusUpdate(estimate.id, e.target.value as EstimateStatus)}
                    disabled={estimate.status === 'converted'}
                    className="h-7 rounded-md border border-border bg-background px-2 text-xs focus:outline-none disabled:opacity-50"
                  >
                    <option value="draft">draft</option>
                    <option value="sent">sent</option>
                    <option value="accepted">accepted</option>
                    <option value="rejected">rejected</option>
                    <option value="expired">expired</option>
                    <option value="converted" disabled>converted</option>
                  </select>
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
                      onClick={() => void handleConvert(estimate)}
                      disabled={convertingId === estimate.id}
                      className="h-7 rounded-md border border-green-200 px-2 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50"
                    >
                      {convertingId === estimate.id ? '...' : 'Convert'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
