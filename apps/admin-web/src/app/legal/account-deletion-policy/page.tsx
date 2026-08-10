import { LegalPage, LegalSection } from '@/components/LegalPage';

export const metadata = { title: 'Account Deletion Policy' };

export default function AccountDeletionPolicyPage() {
  return (
    <LegalPage title="Account Deletion Policy" lastUpdated="August 10, 2026">
      <LegalSection heading="1. How to request deletion">
        <p>You can request deletion of your account in either of these ways, without needing an active app session:</p>
        <ul>
          <li>
            <strong>In-app</strong>: Account settings → Delete account (once built in the mobile app).
          </li>
          <li>
            <strong>On the web, without the app</strong>: use our{' '}
            <a href="/account-deletion">account deletion page</a> - enter the email and password for the account you
            want deleted. This satisfies Google Play&apos;s requirement that account deletion be requestable from
            outside the app.
          </li>
        </ul>
        <p>
          Guest checkout sessions are not persistent accounts and have nothing to delete beyond their order history,
          which is retained per §3 below regardless.
        </p>
      </LegalSection>

      <LegalSection heading="2. What happens when you delete your account">
        <p>Once you confirm your password, we immediately:</p>
        <ul>
          <li>
            Permanently remove your email, name, phone number, and password from our systems (the account record is
            anonymized, not merely hidden).
          </li>
          <li>Delete any saved push-notification device tokens, so you stop receiving notifications.</li>
          <li>Revoke every active login session on every device.</li>
          <li>
            Delete saved delivery addresses and payment-related references tied to your profile (we never stored
            raw card data in the first place).
          </li>
        </ul>
        <p>
          This action is <strong>immediate and cannot be undone</strong>. There is currently no &ldquo;undo&rdquo;
          grace period.
        </p>
      </LegalSection>

      <LegalSection heading="3. What is retained, and why">
        <p>
          Your <strong>order history records</strong> (items ordered, amounts charged, refunds, and the fact that an
          order occurred) are <strong>not deleted</strong>, but are disassociated from your identity - the order
          remains linked to an anonymized account rather than your name/email. This is retained because tax and
          financial regulations require businesses to keep transaction records for a minimum period (see our{' '}
          <a href="/legal/data-retention-policy">Data Retention Policy</a>), and restaurants may have independent
          record-keeping obligations for the same transactions.
        </p>
        <p>
          We do not use retained, anonymized order records for any purpose other than financial record-keeping,
          fraud investigation, and aggregated/anonymized analytics.
        </p>
      </LegalSection>

      <LegalSection heading="4. Data held by third parties">
        <p>
          Deleting your account with us does not automatically delete data held independently by Clover (our
          payment processor, which retains payment records per its own obligations) or Firebase/Google (for
          historical, aggregated analytics/crash data that is not personally identifying once your device token is
          removed). Contact those providers directly if you have concerns about their independent retention.
        </p>
      </LegalSection>

      <LegalSection heading="5. Restaurant-side records">
        <p>
          Restaurants using this platform may keep their own records of past orders outside of our systems. This
          policy governs data held by India Garden Restaurant only.
        </p>
      </LegalSection>

      <LegalSection heading="6. Contact us">
        <p>
          If you have questions about account deletion, or believe your data was not properly deleted, contact
          +1 (661) 200-3055.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
