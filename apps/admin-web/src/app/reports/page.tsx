'use client';

import type { SalesSummary } from '@restaurant-platform/shared-types';
import { useCallback, useEffect, useState } from 'react';
import { ProtectedLayout } from '@/components/ProtectedLayout';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { formatCents, formatStatusLabel } from '@/lib/format';

function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function ReportsPageContent() {
  const { staff } = useAuth();
  const [from, setFrom] = useState(isoDateDaysAgo(30));
  const [to, setTo] = useState(isoDateDaysAgo(0));
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!staff) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.getSalesSummary(staff.restaurantId, from, to);
      setSummary(result);
    } catch (err) {
      setError((err as Error).message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [staff, from, to]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff]);

  const maxDayRevenue = summary ? Math.max(1, ...summary.revenueByDay.map((d) => d.netRevenueCents)) : 1;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>Sales performance for a date range. Refunds are netted out of revenue.</p>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <label>From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <label>To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => void load()} disabled={loading}>
          {loading ? 'Loading…' : 'Run report'}
        </button>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {summary ? (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Orders</div>
              <div className="stat-value">{summary.ordersCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Gross revenue</div>
              <div className="stat-value">{formatCents(summary.grossRevenueCents)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Refunded</div>
              <div className="stat-value">{formatCents(summary.refundedCents)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Net revenue</div>
              <div className="stat-value">{formatCents(summary.netRevenueCents)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg. order value</div>
              <div className="stat-value">{formatCents(summary.averageOrderValueCents)}</div>
            </div>
          </div>

          <div className="card">
            <h2>Revenue by day</h2>
            {summary.revenueByDay.length === 0 ? (
              <div className="empty-state">No orders in this range.</div>
            ) : (
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 160, overflowX: 'auto' }}>
                {summary.revenueByDay.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.date}: ${formatCents(day.netRevenueCents)} (${day.orders} orders)`}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 28 }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: Math.max(4, (day.netRevenueCents / maxDayRevenue) * 130),
                        background: 'var(--color-primary)',
                        borderRadius: 3,
                      }}
                    />
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4, whiteSpace: 'nowrap' }}>
                      {day.date.slice(5)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2>Orders by status</h2>
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.ordersByStatus).map(([status, count]) => (
                  <tr key={status}>
                    <td>{formatStatusLabel(status)}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </>
  );
}

export default function ReportsPage() {
  return (
    <ProtectedLayout>
      <ReportsPageContent />
    </ProtectedLayout>
  );
}
