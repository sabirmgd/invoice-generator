'use client';

interface SummaryCardsProps {
  summary: {
    totalRevenue: number;
    outstandingAmount: number;
    overdueCount: number;
    estimatesPending: number;
  };
  currency: string;
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

const cards = [
  {
    key: 'totalRevenue',
    label: 'Total Revenue',
    color: 'bg-green-500',
    format: 'money',
  },
  {
    key: 'outstandingAmount',
    label: 'Outstanding',
    color: 'bg-blue-500',
    format: 'money',
  },
  {
    key: 'overdueCount',
    label: 'Overdue Invoices',
    color: 'bg-red-500',
    format: 'number',
  },
  {
    key: 'estimatesPending',
    label: 'Pending Estimates',
    color: 'bg-yellow-500',
    format: 'number',
  },
] as const;

export function SummaryCards({ summary, currency }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const value = summary[card.key];
        return (
          <div
            key={card.key}
            className="rounded-xl border border-border bg-surface/50 p-5"
          >
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${card.color}`} />
              <span className="text-xs font-medium text-text-secondary">
                {card.label}
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {card.format === 'money' ? formatMoney(value, currency) : value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
