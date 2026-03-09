'use client';

interface RecentActivityProps {
  data: Array<{
    id: string;
    type: 'invoice' | 'estimate';
    number: string;
    clientName: string;
    status: string;
    total: number;
    currency: string;
    date: string;
  }>;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-surface text-text-secondary border-border',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  paid: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
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

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 0) return new Date(dateStr).toLocaleDateString();
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function RecentActivity({ data }: RecentActivityProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface/50 p-5">
        <h3 className="text-sm font-semibold text-foreground">
          Recent Activity
        </h3>
        <div className="mt-4 flex h-[100px] items-center justify-center">
          <p className="text-sm text-text-secondary">No activity yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface/50 p-5">
      <h3 className="text-sm font-semibold text-foreground">
        Recent Activity
      </h3>
      <div className="mt-4 divide-y divide-border/50">
        {data.map((item) => (
          <div
            key={`${item.type}-${item.id}`}
            className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
          >
            <span
              className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium ${
                item.type === 'invoice'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-purple-50 text-purple-600'
              }`}
            >
              {item.type === 'invoice' ? 'INV' : 'EST'}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate">
                  {item.number}
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${
                    STATUS_STYLES[item.status] || STATUS_STYLES.draft
                  }`}
                >
                  {item.status}
                </span>
              </div>
              <p className="text-xs text-text-secondary truncate">
                {item.clientName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                {formatMoney(item.total, item.currency)}
              </p>
              <p className="text-xs text-text-secondary">
                {timeAgo(item.date)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
