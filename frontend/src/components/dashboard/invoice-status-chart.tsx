'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface InvoiceStatusChartProps {
  data: Array<{ status: string; count: number; amount: number }>;
  currency: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#9CA3AF',
  sent: '#3B82F6',
  paid: '#22C55E',
  cancelled: '#EF4444',
};

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function InvoiceStatusChart({
  data,
  currency,
}: InvoiceStatusChartProps) {
  const hasData = data.length > 0 && data.some((d) => d.count > 0);

  return (
    <div className="rounded-xl border border-border bg-surface/50 p-5">
      <h3 className="text-sm font-semibold text-foreground">
        Invoices by Status
      </h3>
      {hasData ? (
        <>
          <div className="mt-4 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="status"
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLORS[entry.status] || '#9CA3AF'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${value} invoices`,
                    String(name),
                  ]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {data.map((item) => (
              <div key={item.status} className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      STATUS_COLORS[item.status] || '#9CA3AF',
                  }}
                />
                <span className="text-xs text-text-secondary capitalize">
                  {item.status}
                </span>
                <span className="ml-auto text-xs font-medium text-foreground">
                  {item.count}
                </span>
                <span className="text-xs text-text-secondary">
                  {formatMoney(item.amount, currency)}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-4 flex h-[280px] items-center justify-center">
          <p className="text-sm text-text-secondary">No invoices yet</p>
        </div>
      )}
    </div>
  );
}
