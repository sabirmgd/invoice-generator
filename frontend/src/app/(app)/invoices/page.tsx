'use client';

import { useApp } from '@/lib/context/app-context';
import { InvoiceList } from '@/components/invoice/invoice-list';

export default function InvoicesPage() {
  const { invoices, refreshWorkspaceData, sessionId, authToken, isLoadingData } = useApp();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage and download your invoices.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshWorkspaceData()}
          disabled={isLoadingData}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-background disabled:opacity-50"
        >
          {isLoadingData ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <InvoiceList
        invoices={invoices}
        sessionId={sessionId}
        authToken={authToken}
        onRefresh={refreshWorkspaceData}
      />
    </div>
  );
}
