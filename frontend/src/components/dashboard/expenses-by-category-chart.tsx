'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ExpensesByCategoryChartProps {
  data: Array<{
    category: string;
    total: number;
    count: number;
  }>;
  currency: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  office: 'Office',
  travel: 'Travel',
  software: 'Software',
  marketing: 'Marketing',
  salary: 'Salary',
  utilities: 'Utilities',
  equipment: 'Equipment',
  meals: 'Meals',
  professional_services: 'Prof. Services',
  other: 'Other',
};

function formatCompact(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

export function ExpensesByCategoryChart({
  data,
  currency,
}: ExpensesByCategoryChartProps) {
  const hasData = data.length > 0;

  const chartData = data.map((d) => ({
    ...d,
    label: CATEGORY_LABELS[d.category] || d.category,
  }));

  return (
    <div className="rounded-xl border border-border bg-surface/50 p-5">
      <h3 className="text-sm font-semibold text-foreground">
        Expenses by Category
      </h3>
      {hasData ? (
        <div className="mt-4 h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => formatCompact(v, currency)}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={100}
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [
                  formatCompact(Number(value), currency),
                  'Expenses',
                ]}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  fontSize: '12px',
                }}
              />
              <Bar
                dataKey="total"
                fill="#f59e0b"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-4 flex h-[200px] items-center justify-center">
          <p className="text-sm text-text-secondary">
            No expenses recorded yet
          </p>
        </div>
      )}
    </div>
  );
}
