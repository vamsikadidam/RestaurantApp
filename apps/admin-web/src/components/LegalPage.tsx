import type { ReactNode } from 'react';

/**
 * Shared chrome for the public legal document pages (apps/admin-web/src/app/legal/*).
 * These render the same content as the markdown templates in /legal at the repo root -
 * keep both in sync when either is edited. Deliberately outside ProtectedLayout: these
 * must be reachable by anyone (Google Play, customers, regulators) without logging in.
 */
export function LegalPage({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>
      <div className="alert alert-error" style={{ marginBottom: 24 }}>
        <strong>Template - not final legal text.</strong> This document requires review by
        a qualified lawyer before publishing. Every <code>[BRACKETED]</code> value must be
        filled in first. See <code>legal/README.md</code> in the repository.
      </div>
      <h1 style={{ marginBottom: 4 }}>{title}</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Last updated: {lastUpdated}
      </p>
      <div style={{ fontSize: 14.5, lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 16 }}>{heading}</h2>
      {children}
    </section>
  );
}
