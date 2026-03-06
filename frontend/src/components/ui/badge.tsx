import { InvoiceStatus } from '@/lib/types';

const statusStyles: Record<InvoiceStatus, string> = {
  draft: 'bg-surface text-text-secondary border-border',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  paid: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

interface BadgeProps {
  status: InvoiceStatus;
}

export function Badge({ status }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
