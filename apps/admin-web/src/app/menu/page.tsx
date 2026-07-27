'use client';

import type { AdminMenuItem, AdminMenuResponse } from '@restaurant-platform/shared-types';
import { useCallback, useEffect, useState } from 'react';
import { ProtectedLayout } from '@/components/ProtectedLayout';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

function ItemRow({
  item,
  onSaved,
}: {
  item: AdminMenuItem;
  onSaved: (updated: AdminMenuItem) => void;
}) {
  const [priceInput, setPriceInput] = useState((item.priceCents / 100).toFixed(2));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const priceChanged = Math.round(parseFloat(priceInput || '0') * 100) !== item.priceCents;

  async function patch(changes: Partial<AdminMenuItem>) {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiClient.updateMenuItem(item.id, item.restaurantId, changes);
      onSaved({ ...item, ...updated });
    } catch (err) {
      setError((err as Error).message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr>
      <td>
        <div style={{ fontWeight: 600 }}>{item.name}</div>
        {item.description ? (
          <div className="muted" style={{ fontSize: 12.5, maxWidth: 320 }}>
            {item.description}
          </div>
        ) : null}
        {error ? <div style={{ color: 'var(--color-danger)', fontSize: 12 }}>{error}</div> : null}
      </td>
      <td>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span>$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            style={{ width: 90, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--color-border)' }}
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
          />
          {priceChanged ? (
            <button
              className="btn btn-sm btn-primary"
              disabled={saving}
              onClick={() => void patch({ priceCents: Math.round(parseFloat(priceInput) * 100) })}
            >
              Save
            </button>
          ) : null}
        </div>
      </td>
      <td>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={item.isAvailable}
            disabled={saving}
            onChange={(e) => void patch({ isAvailable: e.target.checked })}
          />
          On menu
        </label>
      </td>
      <td>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={item.isSoldOutOverride}
            disabled={saving}
            onChange={(e) => void patch({ isSoldOutOverride: e.target.checked })}
          />
          86&apos;d today
        </label>
      </td>
      <td>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={item.isFeatured}
            disabled={saving}
            onChange={(e) => void patch({ isFeatured: e.target.checked })}
          />
          Featured
        </label>
      </td>
    </tr>
  );
}

function MenuPageContent() {
  const { staff } = useAuth();
  const [data, setData] = useState<AdminMenuResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!staff) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.listAdminMenuItems(staff.restaurantId);
      setData(result);
    } catch (err) {
      setError((err as Error).message || 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  }, [staff]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleSaved(updated: AdminMenuItem) {
    setData((prev) => (prev ? { ...prev, items: prev.items.map((i) => (i.id === updated.id ? updated : i)) } : prev));
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Menu</h1>
          <p>Prices, availability, and today&apos;s sold-out items. Full item/category creation happens via Clover sync.</p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {loading || !data ? (
        <div className="card empty-state">Loading menu…</div>
      ) : data.items.length === 0 ? (
        <div className="card empty-state">
          No menu items yet. Connect Clover and run a sync from the Settings page, or add items directly to the
          database for a local-only menu.
        </div>
      ) : (
        [...data.categories, { id: '__uncategorized', name: 'Uncategorized', displayOrder: 999, isActive: true }].map(
          (category) => {
            const items = data.items.filter((i) =>
              category.id === '__uncategorized' ? !i.categoryId : i.categoryId === category.id,
            );
            if (items.length === 0) return null;
            return (
              <div className="card" key={category.id}>
                <h2>{category.name}</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Price</th>
                      <th>Availability</th>
                      <th>Today</th>
                      <th>Featured</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <ItemRow key={item.id} item={item} onSaved={handleSaved} />
                    ))}
                  </tbody>
                </table>
              </div>
            );
          },
        )
      )}
    </>
  );
}

export default function MenuPage() {
  return (
    <ProtectedLayout>
      <MenuPageContent />
    </ProtectedLayout>
  );
}
