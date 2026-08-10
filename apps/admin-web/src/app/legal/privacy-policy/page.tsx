import { LegalPage, LegalSection } from '@/components/LegalPage';

export const metadata = { title: 'Privacy Policy' };

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="August 10, 2026">
      <p>
        India Garden Restaurant (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates the India Garden mobile
        app and website (together, the &ldquo;Service&rdquo;), which lets you browse a restaurant&apos;s menu and
        order food for pickup or delivery. This Privacy Policy explains what personal data we collect, why, how long
        we keep it, and the choices you have.
      </p>

      <LegalSection heading="1. Data we collect">
        <p>
          <strong>Provided directly by you:</strong> account data (name, email, phone, password - stored only as a
          salted Argon2id hash, never in plaintext), saved delivery addresses and instructions, order data (items,
          modifiers, special instructions, totals, tips), and anything you send us directly via support.
        </p>
        <p>
          <strong>Collected automatically:</strong> a push-notification device token (via Firebase Cloud Messaging)
          if you enable notifications; basic diagnostic/crash data (via Firebase Crashlytics and Analytics) designed
          to exclude order contents and payment data by construction; and IP address / user-agent on login and
          refresh-token events, for account-security purposes.
        </p>
        <p>
          <strong>We never collect or store</strong> full card numbers, CVV, or other raw payment card data. Card
          entry happens entirely inside Clover&apos;s hosted, PCI-compliant tokenization interface, or directly on
          Clover hardware at the restaurant - we only ever receive a Clover-issued token/reference.
        </p>
      </LegalSection>

      <LegalSection heading="2. How we use your data">
        <ul>
          <li>To create and manage your account, and let you order from participating restaurants.</li>
          <li>
            To process orders: send them to the restaurant, charge payment (via Clover), and keep you updated on
            order status.
          </li>
          <li>To provide customer support.</li>
          <li>To detect, investigate, and prevent fraud, abuse, and security incidents.</li>
          <li>To improve the Service using aggregated/anonymized usage analytics.</li>
          <li>
            To comply with legal obligations, including tax and financial record-keeping (see our{' '}
            <a href="/legal/data-retention-policy">Data Retention Policy</a>).
          </li>
        </ul>
        <p>We do not sell your personal data.</p>
      </LegalSection>

      <LegalSection heading="3. Who we share data with">
        <ul>
          <li>
            <strong>The restaurant(s) you order from</strong> (via Clover): order contents, delivery address if
            applicable, and enough contact information to fulfill and deliver your order.
          </li>
          <li>
            <strong>Clover</strong>, our payment processor: payment tokens and information needed to process a
            charge or refund.
          </li>
          <li>
            <strong>Firebase / Google Cloud</strong>: push notifications, crash reporting, and analytics.
          </li>
          <li>
            <strong>Service providers</strong> who help us run the Service (hosting, database, error monitoring),
            under contracts restricting them to using your data only to provide services to us.
          </li>
          <li>
            <strong>Legal/regulatory authorities</strong>, when required by law, subpoena, or court order.
          </li>
        </ul>
        <p>
          We do not share your data with third parties for their own independent marketing purposes without your
          explicit consent.
        </p>
      </LegalSection>

      <LegalSection heading="4. Your rights and choices">
        <ul>
          <li>
            <strong>Access/correction</strong>: view and edit most of your profile data in-app.
          </li>
          <li>
            <strong>Deletion</strong>: request account deletion at any time, in-app or via our{' '}
            <a href="/account-deletion">account deletion page</a> - no login session required, only your email and
            password to confirm identity. See our <a href="/legal/account-deletion-policy">Account Deletion Policy</a>{' '}
            for exactly what is and isn&apos;t deleted.
          </li>
          <li>
            <strong>Notification preferences</strong>: disable push notifications in your device settings or in-app
            at any time.
          </li>
          <li>
            <strong>Regional rights</strong> (GDPR/CCPA/etc., as applicable): right to access, correct, delete, or
            port your data, and to object to or restrict certain processing. Contact +1 (661) 200-3055 to
            exercise these rights.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Data retention">
        <p>
          See our <a href="/legal/data-retention-policy">Data Retention Policy</a> for the full breakdown. In short:
          account/profile data is deleted (anonymized) promptly on request; order, payment, and refund records are
          retained longer where required for tax/financial record-keeping, but are disassociated from your identity
          once your account is deleted.
        </p>
      </LegalSection>

      <LegalSection heading="6. Security">
        <p>
          We use industry-standard measures to protect your data, including encryption in transit (HTTPS/TLS),
          encryption at rest for sensitive credentials, password hashing (Argon2id), and role-based access controls
          for restaurant staff. No system is 100% secure, and we cannot guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection heading="7. Children's privacy">
        <p>
          The Service is not directed at children under 13, and we do not knowingly collect personal data
          from them. If you believe a child has provided us data, contact +1 (661) 200-3055 and we will delete
          it.
        </p>
      </LegalSection>

      <LegalSection heading="8. International data transfers">
        <p>
          [INTERNATIONAL_TRANSFER_CLAUSE - fill in if you operate across borders, e.g. data is processed in
          [COUNTRY/REGION] and may be transferred internationally to our service providers listed above under
          appropriate safeguards.]
        </p>
      </LegalSection>

      <LegalSection heading="9. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes will be notified in-app or by email
          before they take effect.
        </p>
      </LegalSection>

      <LegalSection heading="10. Contact us">
        <p>
          India Garden Restaurant
          <br />
          24341 Magic Mountain Pkwy, Santa Clarita, CA 91355, USA
          <br />
          +1 (661) 200-3055
        </p>
      </LegalSection>
    </LegalPage>
  );
}
