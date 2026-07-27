'use client';

import { FormEvent, useState } from 'react';
import { anonymousApiClient } from '@/lib/api-client';

/**
 * Public, unauthenticated page for customers to request deletion of their
 * account and personal data - reachable without installing/opening the app,
 * per Google Play's Data Safety / User Data policy account-deletion
 * requirements (see GOOGLE_PLAY_RELEASE_GUIDE.md and
 * legal/account-deletion-policy.md). Deliberately outside ProtectedLayout:
 * this is for restaurant *customers*, not restaurant staff.
 */
export default function AccountDeletionPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await anonymousApiClient.requestAccountDeletion(email, password);
      setDone(true);
    } catch (err) {
      setError((err as Error).message || 'We could not process this request. Please check your email and password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card" style={{ maxWidth: 440 }}>
        <h1>Delete your account</h1>
        <p>
          This permanently deletes your profile, saved addresses, and login credentials from our systems. Order
          history is retained in anonymized form for financial record-keeping, as required by law - see our{' '}
          <a href="/legal/account-deletion-policy" target="_blank" rel="noreferrer">
            Account Deletion Policy
          </a>
          . This cannot be undone.
        </p>

        {done ? (
          <div className="alert alert-success">
            If an account matched those credentials, it has been deleted. You&apos;re signed out of all devices.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error ? <div className="alert alert-error">{error}</div> : null}
            <div className="form-row">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-row">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button className="btn btn-danger" type="submit" disabled={submitting} style={{ width: '100%' }}>
              {submitting ? 'Deleting…' : 'Permanently delete my account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
