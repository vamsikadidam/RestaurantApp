import { LegalPage, LegalSection } from '@/components/LegalPage';

export const metadata = { title: 'Data Retention Policy' };

const ROWS: Array<[string, string, string, string]> = [
  [
    'Account profile (name, email, phone, password hash)',
    'Account is active',
    'Deleted/anonymized immediately',
    'User consent / contract necessity',
  ],
  [
    'Saved addresses',
    'Account is active',
    'Deleted immediately',
    'User consent / contract necessity',
  ],
  [
    'Push notification device tokens',
    'Active/enabled',
    'Deleted immediately',
    'Contract necessity',
  ],
  [
    'Order records (items, totals, status history)',
    'Indefinitely',
    'Retained, anonymized',
    '[CONFIRM: financial/tax record-keeping period, e.g. 6-7 years]',
  ],
  [
    'Payment records (Clover tokens/refs, amounts, refunds)',
    'Indefinitely',
    'Retained, anonymized',
    '[CONFIRM: financial/tax record-keeping period] + Clover agreement terms',
  ],
  [
    'Refresh tokens / session records',
    'Until expiry (default 30 days) or revocation',
    'Revoked immediately',
    'Security (session management)',
  ],
  [
    'Audit log entries (admin/staff actions)',
    '[CONFIRM: e.g. 1-3 years]',
    'Retained (references staff, not customer)',
    'Security, fraud investigation, accountability',
  ],
  [
    'Crash reports / analytics (Firebase)',
    "Per Firebase's own retention settings",
    'Aggregated/anonymized',
    'Service improvement, debugging',
  ],
  [
    'Support communications',
    '[CONFIRM: e.g. 2 years from last contact]',
    'Retained unless separately requested',
    'Customer service quality, dispute resolution',
  ],
];

export default function DataRetentionPolicyPage() {
  return (
    <LegalPage title="Data Retention Policy" lastUpdated="August 10, 2026">
      <LegalSection heading="1. Purpose">
        <p>
          This policy defines how long each category of data collected by India Garden is retained, and why, so that
          we keep data only as long as we have a legitimate business or legal reason to, deletion requests are
          honored consistently, and we can demonstrate compliance with applicable law.
        </p>
      </LegalSection>

      <LegalSection heading="2. Retention schedule">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Data category</th>
                <th>Retained while</th>
                <th>After account deletion</th>
                <th>Basis</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([category, while_, after, basis]) => (
                <tr key={category}>
                  <td>{category}</td>
                  <td>{while_}</td>
                  <td>{after}</td>
                  <td>{basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection heading="3. Why order/payment records outlive account deletion">
        <p>
          Tax authorities and financial regulators in most jurisdictions require businesses to retain records of
          transactions for a minimum number of years, independent of whether the customer who placed the order still
          has an account. We satisfy this by <strong>anonymizing</strong> the customer&apos;s identity on the order
          record rather than deleting the order itself.
        </p>
      </LegalSection>

      <LegalSection heading="4. Deletion/anonymization mechanics">
        <p>
          Account deletion is immediate and irreversible - the user record is anonymized synchronously when the
          request is confirmed. [FUTURE WORK: if the business later wants a grace/undo period, or a scheduled purge
          job for very old anonymized order records past the mandatory retention window, that should be implemented
          as a scheduled job and documented here.]
        </p>
      </LegalSection>

      <LegalSection heading="5. Review cadence">
        <p>
          This policy should be reviewed at least annually, and whenever a new data category is introduced, to keep
          the table above accurate.
        </p>
      </LegalSection>

      <LegalSection heading="6. Contact us">
        <p>+1 (661) 200-3055</p>
      </LegalSection>
    </LegalPage>
  );
}
