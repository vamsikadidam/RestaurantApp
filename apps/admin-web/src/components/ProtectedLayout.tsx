'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

const NAV_ITEMS = [
  { href: '/orders', label: 'Orders' },
  { href: '/menu', label: 'Menu' },
  { href: '/settings', label: 'Settings' },
  { href: '/reports', label: 'Reports' },
];

export function ProtectedLayout({ children }: { children: ReactNode }) {
  const { status, staff, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <div className="spinner-page">Loading…</div>;
  }

  if (status === 'unauthenticated' || !staff) {
    return <div className="spinner-page">Redirecting to login…</div>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">Restaurant Admin</div>
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`sidebar-link${pathname?.startsWith(item.href) ? ' active' : ''}`}
          >
            {item.label}
          </a>
        ))}
        <div className="sidebar-footer">
          <div>{user?.email ?? 'Signed in'}</div>
          <div>{staff.isAdmin ? 'Admin' : 'Employee'}</div>
          <button className="sidebar-logout" onClick={() => void logout().then(() => router.replace('/login'))}>
            Log out
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
