'use client';

import { useEffect, useState, useRef } from 'react';
import { useApp } from '@/lib/context/app-context';
import { buildAuthHeaders, getApiBaseUrl } from '@/lib/api';
import { Invoice } from '@/lib/types';

const API_BASE = getApiBaseUrl();

interface InvoicePreviewProps {
  invoice: Invoice | null;
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const { sessionId, authToken } = useApp();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!invoice) {
      // Clean up previous URL
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
        prevUrlRef.current = null;
      }
      setPdfUrl(null);
      setError(null);
      return;
    }

    let cancelled = false;

    async function fetchPdf() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/api/v1/invoices/${invoice!.id}/pdf`, {
          headers: buildAuthHeaders(sessionId, authToken || undefined),
        });

        if (!response.ok) {
          throw new Error(`Failed to load PDF (${response.status})`);
        }

        const blob = await response.blob();
        if (cancelled) return;

        // Revoke previous URL
        if (prevUrlRef.current) {
          URL.revokeObjectURL(prevUrlRef.current);
        }

        const url = URL.createObjectURL(blob);
        prevUrlRef.current = url;
        setPdfUrl(url);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load PDF');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchPdf();

    return () => {
      cancelled = true;
    };
  }, [invoice?.id, sessionId, authToken]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
    };
  }, []);

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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-border bg-white">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm text-text-secondary">Generating PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-border bg-white p-8">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-error">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">Could not load PDF</p>
          <p className="mt-1 text-xs text-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-white overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs font-medium text-foreground">{invoice.invoiceNumber}</span>
        <a
          href={pdfUrl || '#'}
          download={`${invoice.invoiceNumber}.pdf`}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-surface transition-colors"
        >
          Download
        </a>
      </div>

      {/* PDF viewer */}
      {pdfUrl && (
        <iframe
          src={pdfUrl}
          title={`Invoice ${invoice.invoiceNumber}`}
          className="flex-1 w-full"
        />
      )}
    </div>
  );
}
