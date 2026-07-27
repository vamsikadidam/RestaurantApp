'use client';

import type { CloverSyncJob, RestaurantHoursEntry, RestaurantLocationSettings } from '@restaurant-platform/shared-types';
import { useCallback, useEffect, useState } from 'react';
import { ProtectedLayout } from '@/components/ProtectedLayout';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { DAY_NAMES, formatDateTime, timeLabelToMinutes } from '@/lib/format';

function BusinessSettingsCard({
  locationId,
  restaurantId,
  settings,
  isAdmin,
  onSaved,
}: {
  locationId: string;
  restaurantId: string;
  settings: RestaurantLocationSettings;
  isAdmin: boolean;
  onSaved: (s: RestaurantLocationSettings) => void;
}) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiClient.updateLocationSettings(restaurantId, locationId, {
        pickupEnabled: form.pickupEnabled,
        deliveryEnabled: form.deliveryEnabled,
        deliveryRadiusMeters: form.deliveryRadiusMeters ?? undefined,
        minimumOrderAmountCents: form.minimumOrderAmountCents,
        deliveryFeeCents: form.deliveryFeeCents,
        serviceFeeCents: form.serviceFeeCents,
        serviceFeeBasisPoints: form.serviceFeeBasisPoints,
        defaultPrepTimeMinutes: form.defaultPrepTimeMinutes,
        isActive: form.isActive,
      });
      onSaved({ ...updated, hours: settings.hours });
      setMessage('Settings saved.');
    } catch (err) {
      setError((err as Error).message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2>Business settings</h2>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      <div className="checkbox-row">
        <input
          type="checkbox"
          id="isActive"
          disabled={!isAdmin}
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
        />
        <label htmlFor="isActive">Location is active (uncheck to temporarily pause all ordering)</label>
      </div>
      <div className="checkbox-row">
        <input
          type="checkbox"
          id="pickupEnabled"
          disabled={!isAdmin}
          checked={form.pickupEnabled}
          onChange={(e) => setForm({ ...form, pickupEnabled: e.target.checked })}
        />
        <label htmlFor="pickupEnabled">Pickup enabled</label>
      </div>
      <div className="checkbox-row">
        <input
          type="checkbox"
          id="deliveryEnabled"
          disabled={!isAdmin}
          checked={form.deliveryEnabled}
          onChange={(e) => setForm({ ...form, deliveryEnabled: e.target.checked })}
        />
        <label htmlFor="deliveryEnabled">Delivery enabled</label>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div className="form-row">
          <label>Delivery radius (miles)</label>
          <input
            type="number"
            min="0"
            disabled={!isAdmin}
            value={form.deliveryRadiusMeters ? (form.deliveryRadiusMeters / 1609.34).toFixed(1) : ''}
            onChange={(e) =>
              setForm({
                ...form,
                deliveryRadiusMeters: e.target.value ? Math.round(parseFloat(e.target.value) * 1609.34) : null,
              })
            }
          />
        </div>
        <div className="form-row">
          <label>Minimum order ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            disabled={!isAdmin}
            value={(form.minimumOrderAmountCents / 100).toFixed(2)}
            onChange={(e) => setForm({ ...form, minimumOrderAmountCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
          />
        </div>
        <div className="form-row">
          <label>Delivery fee ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            disabled={!isAdmin}
            value={(form.deliveryFeeCents / 100).toFixed(2)}
            onChange={(e) => setForm({ ...form, deliveryFeeCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
          />
        </div>
        <div className="form-row">
          <label>Flat service fee ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            disabled={!isAdmin}
            value={(form.serviceFeeCents / 100).toFixed(2)}
            onChange={(e) => setForm({ ...form, serviceFeeCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
          />
        </div>
        <div className="form-row">
          <label>Service fee (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            disabled={!isAdmin}
            value={(form.serviceFeeBasisPoints / 100).toFixed(1)}
            onChange={(e) => setForm({ ...form, serviceFeeBasisPoints: Math.round(parseFloat(e.target.value || '0') * 100) })}
          />
        </div>
        <div className="form-row">
          <label>Default prep time (minutes)</label>
          <input
            type="number"
            min="0"
            max="180"
            disabled={!isAdmin}
            value={form.defaultPrepTimeMinutes}
            onChange={(e) => setForm({ ...form, defaultPrepTimeMinutes: parseInt(e.target.value || '0', 10) })}
          />
        </div>
      </div>

      {isAdmin ? (
        <button className="btn btn-primary" onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      ) : (
        <p className="muted">Only restaurant admins can edit business settings.</p>
      )}
    </div>
  );
}

function HoursCard({
  locationId,
  restaurantId,
  hours,
  isAdmin,
  onSaved,
}: {
  locationId: string;
  restaurantId: string;
  hours: RestaurantHoursEntry[];
  isAdmin: boolean;
  onSaved: (hours: RestaurantHoursEntry[]) => void;
}) {
  const [rows, setRows] = useState<RestaurantHoursEntry[]>(
    DAY_NAMES.map((_, dayOfWeek) => hours.find((h) => h.dayOfWeek === dayOfWeek) ?? {
      dayOfWeek,
      opensAtMinutes: 9 * 60,
      closesAtMinutes: 21 * 60,
      isClosed: true,
    }),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function updateRow(dayOfWeek: number, changes: Partial<RestaurantHoursEntry>) {
    setRows((prev) => prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...changes } : r)));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiClient.updateHours(
        restaurantId,
        locationId,
        rows.filter((r) => !r.isClosed),
      );
      onSaved(updated);
      setMessage('Hours saved.');
    } catch (err) {
      setError((err as Error).message || 'Failed to save hours');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2>Hours</h2>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      <div className="hours-grid header">
        <div>Day</div>
        <div>Opens</div>
        <div>Closes</div>
        <div>Closed</div>
      </div>
      {rows.map((row) => (
        <div className="hours-grid" key={row.dayOfWeek}>
          <div>{DAY_NAMES[row.dayOfWeek]}</div>
          <input
            type="time"
            disabled={!isAdmin || row.isClosed}
            value={minutesToTimeInput(row.opensAtMinutes)}
            onChange={(e) => updateRow(row.dayOfWeek, { opensAtMinutes: timeLabelToMinutes(e.target.value) })}
          />
          <input
            type="time"
            disabled={!isAdmin || row.isClosed}
            value={minutesToTimeInput(row.closesAtMinutes)}
            onChange={(e) => updateRow(row.dayOfWeek, { closesAtMinutes: timeLabelToMinutes(e.target.value) })}
          />
          <input
            type="checkbox"
            disabled={!isAdmin}
            checked={row.isClosed}
            onChange={(e) => updateRow(row.dayOfWeek, { isClosed: e.target.checked })}
          />
        </div>
      ))}

      {isAdmin ? (
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving…' : 'Save hours'}
        </button>
      ) : null}
    </div>
  );
}

function minutesToTimeInput(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function CloverCard({ restaurantId, locationId, isAdmin }: { restaurantId: string; locationId: string; isAdmin: boolean }) {
  const [status, setStatus] = useState<{ connected: boolean; merchantId?: string; lastSyncAt?: string | null } | null>(null);
  const [jobs, setJobs] = useState<CloverSyncJob[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [statusResult, jobsResult] = await Promise.all([
        apiClient.getCloverConnectionStatus(locationId),
        apiClient.getCloverSyncStatus(restaurantId),
      ]);
      setStatus(statusResult);
      setJobs(jobsResult);
    } catch (err) {
      setError((err as Error).message || 'Failed to load Clover status');
    }
  }, [restaurantId, locationId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await apiClient.getCloverOAuthStartUrl(locationId);
      window.location.href = url;
    } catch (err) {
      setError((err as Error).message || 'Failed to start Clover connection');
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!window.confirm('Disconnect this location from Clover?')) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.disconnectClover(restaurantId, locationId);
      await load();
    } catch (err) {
      setError((err as Error).message || 'Failed to disconnect');
    } finally {
      setBusy(false);
    }
  }

  async function sync() {
    setBusy(true);
    setError(null);
    try {
      await apiClient.triggerCloverSync(restaurantId, locationId);
      await load();
    } catch (err) {
      setError((err as Error).message || 'Failed to trigger sync');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Clover connection</h2>
      {error ? <div className="alert alert-error">{error}</div> : null}

      {status ? (
        <p>
          Status:{' '}
          {status.connected ? (
            <span className="badge badge-success">Connected{status.merchantId ? ` (${status.merchantId})` : ''}</span>
          ) : (
            <span className="badge badge-neutral">Not connected</span>
          )}
        </p>
      ) : null}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {isAdmin && !status?.connected ? (
          <button className="btn btn-primary" onClick={() => void connect()} disabled={busy}>
            Connect to Clover
          </button>
        ) : null}
        {isAdmin && status?.connected ? (
          <>
            <button className="btn" onClick={() => void sync()} disabled={busy}>
              Run inventory sync
            </button>
            <button className="btn btn-danger" onClick={() => void disconnect()} disabled={busy}>
              Disconnect
            </button>
          </>
        ) : null}
      </div>

      {jobs.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Started</th>
              <th>Type</th>
              <th>Status</th>
              <th>Synced / Created / Updated</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>{formatDateTime(job.startedAt)}</td>
                <td>{job.type}</td>
                <td>{job.status}</td>
                <td>
                  {job.itemsSynced} / {job.itemsCreated} / {job.itemsUpdated}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">No sync jobs yet.</p>
      )}
    </div>
  );
}

function SettingsPageContent() {
  const { staff } = useAuth();
  const [locationId, setLocationId] = useState<string | null>(null);
  const [settings, setSettings] = useState<RestaurantLocationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      if (!staff) return;
      setLoading(true);
      setError(null);
      try {
        let resolvedLocationId = staff.restaurantLocationId;
        if (!resolvedLocationId) {
          const restaurant = await apiClient.getRestaurant(staff.restaurantId);
          resolvedLocationId = (restaurant.locations.find((l) => l.isPrimary) ?? restaurant.locations[0])?.id ?? null;
        }
        if (!resolvedLocationId) {
          throw new Error('No restaurant location found for this account.');
        }
        setLocationId(resolvedLocationId);
        const result = await apiClient.getLocationSettings(staff.restaurantId, resolvedLocationId);
        setSettings(result);
      } catch (err) {
        setError((err as Error).message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [staff]);

  if (!staff) return null;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Business rules, posted hours, and your Clover connection.</p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {loading || !settings || !locationId ? (
        <div className="card empty-state">Loading settings…</div>
      ) : (
        <>
          <BusinessSettingsCard
            restaurantId={staff.restaurantId}
            locationId={locationId}
            settings={settings}
            isAdmin={staff.isAdmin}
            onSaved={setSettings}
          />
          <HoursCard
            restaurantId={staff.restaurantId}
            locationId={locationId}
            hours={settings.hours}
            isAdmin={staff.isAdmin}
            onSaved={(hours) => setSettings({ ...settings, hours })}
          />
          <CloverCard restaurantId={staff.restaurantId} locationId={locationId} isAdmin={staff.isAdmin} />
        </>
      )}
    </>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedLayout>
      <SettingsPageContent />
    </ProtectedLayout>
  );
}
