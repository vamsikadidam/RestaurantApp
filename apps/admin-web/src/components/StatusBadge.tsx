import { formatStatusLabel } from '@/lib/format';

const STATUS_STYLE: Record<string, string> = {
  PENDING_PAYMENT: 'badge-neutral',
  PAYMENT_PROCESSING: 'badge-info',
  PAYMENT_FAILED: 'badge-danger',
  PAID: 'badge-info',
  SUBMITTED_TO_RESTAURANT: 'badge-warning',
  ACCEPTED: 'badge-info',
  PREPARING: 'badge-info',
  READY_FOR_PICKUP: 'badge-warning',
  OUT_FOR_DELIVERY: 'badge-warning',
  COMPLETED: 'badge-success',
  REJECTED: 'badge-danger',
  CANCELLED: 'badge-danger',
  REFUND_PENDING: 'badge-warning',
  PARTIALLY_REFUNDED: 'badge-neutral',
  REFUNDED: 'badge-neutral',
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLE[status] ?? 'badge-neutral';
  return <span className={`badge ${cls}`}>{formatStatusLabel(status)}</span>;
}
