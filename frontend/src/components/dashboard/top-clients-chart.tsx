'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TopClientsChartProps {
  data: Array<{
    clientName: string;
    clientId: string;
    totalRevenue: number;
    invoiceCount: number;
  }>;
  currency: string;
}

function formatCompact(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

export function TopClientsChart({ data, currency }: TopClientsChartProps) {
  const hasData = data.length > 0;

  return (
    <div className="rounded-xl border border-border bg-surface/50 p-5">
      <h3 className="text-sm font-semibold text-foreground">
        Top Clients by Revenue
      </h3>
      {hasData ? (
        <div className="mt-4 h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => formatCompact(v, currency)}
              />
              <YAxis
                type="category"
                dataKey="clientName"
                width={100}
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [
                  formatCompact(Number(value), currency),
                  'Revenue',
                ]}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  fontSize: '12px',
                }}
              />
              <Bar
                dataKey="totalRevenue"
                fill="var(--primary)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-4 flex h-[200px] items-center justify-center">
          <p className="text-sm text-text-secondary">
            No paid invoices yet
          </p>
        </div>
      )}
    </div>
  );
}
