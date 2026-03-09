'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import { DashboardAnalytics } from '@/lib/types';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { InvoiceStatusChart } from '@/components/dashboard/invoice-status-chart';
import { EstimateConversionCard } from '@/components/dashboard/estimate-conversion-card';
import { TopClientsChart } from '@/components/dashboard/top-clients-chart';
import { RecentActivity } from '@/components/dashboard/recent-activity';

export default function DashboardPage() {
  const { apiFetch, settingsByKey } = useApp();
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currency = settingsByKey.currency || 'USD';

  const fetchDashboard = useCallback(async () => {
    try {
      const result = await apiFetch<DashboardAnalytics>(
        '/api/v1/analytics/dashboard',
      );
      setData(result);
      setError('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load dashboard',
      );
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Overview of your invoicing business.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-border bg-surface/50"
            />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-[340px] animate-pulse rounded-xl border border-border bg-surface/50"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
        <button
          type="button"
          onClick={fetchDashboard}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Overview of your invoicing business.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchDashboard}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-background"
        >
          Refresh
        </button>
      </div>

      <SummaryCards summary={data.summary} currency={currency} />

      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart data={data.revenueByMonth} currency={currency} />
        <InvoiceStatusChart data={data.invoicesByStatus} currency={currency} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TopClientsChart data={data.topClients} currency={currency} />
        <EstimateConversionCard data={data.estimateConversion} />
      </div>

      <RecentActivity data={data.recentActivity} />
    </div>
  );
}
