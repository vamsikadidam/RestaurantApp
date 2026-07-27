import Link from 'next/link';

const DOCS = [
  { href: '/legal/privacy-policy', label: 'Privacy Policy' },
  { href: '/legal/terms-and-conditions', label: 'Terms & Conditions' },
  { href: '/legal/refund-cancellation-policy', label: 'Refund & Cancellation Policy' },
  { href: '/legal/delivery-policy', label: 'Delivery Policy' },
  { href: '/legal/account-deletion-policy', label: 'Account Deletion Policy' },
  { href: '/legal/data-retention-policy', label: 'Data Retention Policy' },
];

/**
 * Public index of legal documents. Linked from app store listings, the
 * account-deletion page, and in-app settings once built.
 */
export default function LegalIndexPage() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>
      <h1>Legal</h1>
      <ul style={{ fontSize: 15, lineHeight: 2 }}>
        {DOCS.map((doc) => (
          <li key={doc.href}>
            <Link href={doc.href}>{doc.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
