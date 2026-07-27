'use client';

import type { OrderDetail } from '@restaurant-platform/shared-types';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { ProtectedLayout } from '@/components/ProtectedLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { formatCents, formatDateTime, formatStatusLabel } from '@/lib/format';

const FILTERS = [
  { label: 'Needs action', statuses: ['PAID', 'SUBMITTED_TO_RESTAURANT'] },
  { label: 'In progress', statuses: ['ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'] },
  { label: 'Completed', statuses: ['COMPLETED'] },
  { label: 'Cancelled / rejected', statuses: ['CANCELLED', 'REJECTED'] },
  { label: 'All', statuses: [] as string[] },
];

const REFUNDABLE_STATUSES = new Set([
  'ACCEPTED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'PARTIALLY_REFUNDED',
]);

function nextActions(order: OrderDetail): Array<{ label: string; status: string; danger?: boolean }> {
  switch (order.status) {
    case 'PAID':
    case 'SUBMITTED_TO_RESTAURANT':
      return [
        { label: 'Accept', status: 'ACCEPTED' },
        { label: 'Reject', status: 'REJECTED', danger: true },
      ];
    case 'ACCEPTED':
      return [
        { label: 'Start preparing', status: 'PREPARING' },
        { label: 'Cancel', status: 'CANCELLED', danger: true },
      ];
    case 'PREPARING':
      return [
        order.fulfillmentType === 'DELIVERY'
          ? { label: 'Out for delivery', status: 'OUT_FOR_DELIVERY' }
          : { label: 'Ready for pickup', status: 'READY_FOR_PICKUP' },
        { label: 'Cancel', status: 'CANCELLED', danger: true },
      ];
    case 'READY_FOR_PICKUP':
    case 'OUT_FOR_DELIVERY':
      return [
        { label: 'Complete', status: 'COMPLETED' },
        { label: 'Cancel', status: 'CANCELLED', danger: true },
      ];
    default:
      return [];
  }
}

function OrdersPageContent() {
  const { staff } = useAuth();
  const [filterIndex, setFilterIndex] = useState(0);
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [refundState, setRefundState] = useState<{ orderId: string; amount: string; reason: string } | null>(null);

  const load = useCallback(async () => {
    if (!staff) return;
    setError(null);
    try {
      const filter = FILTERS[filterIndex];
      if (filter.statuses.length === 0) {
        const result = await apiClient.listRestaurantOrders(staff.restaurantId);
        setOrders(result);
      } else {
        const results = await Promise.all(
          filter.statuses.map((status) =>
            apiClient.listRestaurantOrders(staff.restaurantId, { status: status as OrderDetail['status'] }),
          ),
        );
        const merged = results.flat().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        setOrders(merged);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [staff, filterIndex]);

  useEffect(() => {
    setLoading(true);
    void load();
    const interval = setInterval(() => void load(), 20_000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleAction(orderId: string, status: string) {
    setActionBusyId(orderId);
    try {
      if (status === 'CANCELLED' || status === 'REJECTED') {
        const reason = window.prompt(`Reason for ${status === 'REJECTED' ? 'rejecting' : 'cancelling'} this order?`) ?? undefined;
        await apiClient.updateOrderStatus(orderId, status as OrderDetail['status'], reason);
      } else {
        await apiClient.updateOrderStatus(orderId, status as OrderDetail['status']);
      }
      await load();
    } catch (err) {
      setError((err as Error).message || 'Failed to update order');
    } finally {
      setActionBusyId(null);
    }
  }

  async function submitRefund() {
    if (!refundState) return;
    setActionBusyId(refundState.orderId);
    try {
      const amountCents = refundState.amount ? Math.round(parseFloat(refundState.amount) * 100) : undefined;
      await apiClient.createRefund(refundState.orderId, {
        amountCents: Number.isFinite(amountCents) ? amountCents : undefined,
        reason: refundState.reason || undefined,
      });
      setRefundState(null);
      await load();
    } catch (err) {
      setError((err as Error).message || 'Failed to issue refund');
    } finally {
      setActionBusyId(null);
    }
  }

  const hasSucceededPayment = (order: OrderDetail) => order.payments.some((p) => p.status === 'SUCCEEDED');

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Order queue</h1>
          <p>Live view of incoming and in-progress orders. Refreshes automatically every 20s.</p>
        </div>
        <button className="btn" onClick={() => void load()}>
          Refresh now
        </button>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="tabs">
        {FILTERS.map((f, i) => (
          <button
            key={f.label}
            className={`tab${i === filterIndex ? ' active' : ''}`}
            onClick={() => setFilterIndex(i)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">No orders in this view.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Placed</th>
                <th>Type</th>
                <th>Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <Fragment key={order.id}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                    <td>#{order.publicOrderNumber}</td>
                    <td>{formatDateTime(order.createdAt)}</td>
                    <td>{formatStatusLabel(order.fulfillmentType)}</td>
                    <td>{formatCents(order.totalCents, order.currency)}</td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {nextActions(order).map((action) => (
                          <button
                            key={action.status}
                            className={`btn btn-sm${action.danger ? ' btn-danger' : ''}`}
                            disabled={actionBusyId === order.id}
                            onClick={() => void handleAction(order.id, action.status)}
                          >
                            {action.label}
                          </button>
                        ))}
                        {hasSucceededPayment(order) && REFUNDABLE_STATUSES.has(order.status) ? (
                          <button
                            className="btn btn-sm"
                            disabled={actionBusyId === order.id}
                            onClick={() => setRefundState({ orderId: order.id, amount: '', reason: '' })}
                          >
                            Refund
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  {expandedId === order.id ? (
                    <tr>
                      <td colSpan={6} style={{ background: '#fafafb' }}>
                        <div style={{ padding: '8px 4px' }}>
                          {order.specialInstructions ? (
                            <p style={{ marginTop: 0 }}>
                              <strong>Notes:</strong> {order.specialInstructions}
                            </p>
                          ) : null}
                          <table>
                            <tbody>
                              {order.items.map((item) => (
                                <tr key={item.id}>
                                  <td style={{ border: 'none' }}>
                                    {item.quantity}× {item.nameSnapshot}
                                    {item.modifiers.length > 0 ? (
                                      <div className="muted" style={{ fontSize: 12.5 }}>
                                        {item.modifiers
                                          .map((m) => `${m.quantity > 1 ? `${m.quantity}× ` : ''}${m.nameSnapshot}`)
                                          .join(', ')}
                                      </div>
                                    ) : null}
                                    {item.specialInstructions ? (
                                      <div className="muted" style={{ fontSize: 12.5 }}>
                                        &ldquo;{item.specialInstructions}&rdquo;
                                      </div>
                                    ) : null}
                                  </td>
                                  <td style={{ border: 'none', textAlign: 'right' }}>
                                    {formatCents(item.lineTotalCents, order.currency)}
                                  </td>
                                </tr>
                              ))}
                              <tr>
                                <td style={{ border: 'none' }} className="muted">
                                  Subtotal / tax / fees / tip
                                </td>
                                <td style={{ border: 'none', textAlign: 'right' }} className="muted">
                                  {formatCents(order.subtotalCents, order.currency)} /{' '}
                                  {formatCents(order.taxCents, order.currency)} /{' '}
                                  {formatCents(order.serviceFeeCents + order.deliveryFeeCents, order.currency)} /{' '}
                                  {formatCents(order.tipCents, order.currency)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {refundState ? (
        <div className="card" style={{ maxWidth: 420 }}>
          <h2>Issue refund</h2>
          <div className="form-row">
            <label htmlFor="refund-amount">Amount (USD, leave blank for full remaining amount)</label>
            <input
              id="refund-amount"
              type="number"
              step="0.01"
              min="0"
              value={refundState.amount}
              onChange={(e) => setRefundState({ ...refundState, amount: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label htmlFor="refund-reason">Reason</label>
            <input
              id="refund-reason"
              type="text"
              value={refundState.reason}
              onChange={(e) => setRefundState({ ...refundState, reason: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => void submitRefund()} disabled={actionBusyId === refundState.orderId}>
              Issue refund
            </button>
            <button className="btn" onClick={() => setRefundState(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function OrdersPage() {
  return (
    <ProtectedLayout>
      <OrdersPageContent />
    </ProtectedLayout>
  );
}
