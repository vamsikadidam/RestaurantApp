# Privacy Policy

> **TEMPLATE - requires legal review before publishing.** See `legal/README.md`.

**Last updated:** [DATE]

[COMPANY_LEGAL_NAME] ("we", "us", "our") operates the [APP_NAME] mobile app and website
(together, the "Service"), which lets you browse a restaurant's menu and order food for
pickup or delivery. This Privacy Policy explains what personal data we collect, why, how
long we keep it, and the choices you have.

## 1. Data we collect

### Provided directly by you

- **Account data**: name, email address, phone number, password (stored only as a
  salted Argon2id hash - we never see or store your plaintext password).
- **Delivery addresses**: saved addresses, delivery instructions.
- **Order data**: items ordered, modifiers/customizations, special instructions, order
  totals, tips.
- **Support communications**: anything you send us directly (e.g. via [SUPPORT_EMAIL]).

### Collected automatically

- **Device/push token**: to deliver order-status push notifications (via Firebase Cloud
  Messaging), if you enable notifications.
- **Basic diagnostic/crash data**: via Firebase Crashlytics and Analytics, to fix bugs
  and understand feature usage. These event schemas are designed to exclude order
  contents and payment data by construction - only technical/usage signals are sent.
- **IP address and user-agent**: recorded on login/session events for account-security
  purposes (detecting suspicious sign-ins), and on refresh-token records.

### We never collect or store

- **Full card numbers, CVV, or other raw payment card data.** Card entry happens
  entirely inside Clover's hosted, PCI-compliant tokenization interface or directly on
  Clover hardware at the restaurant. We only ever receive a Clover-issued token/reference
  - never the underlying card data. See `SECURITY.md` §2 for the technical detail.

## 2. How we use your data

- To create and manage your account, and let you order from participating restaurants.
- To process orders: send them to the restaurant, charge payment (via Clover), and keep
  you updated on order status (push notifications, in-app status).
- To provide customer support.
- To detect, investigate, and prevent fraud, abuse, and security incidents.
- To improve the Service (aggregated/anonymized usage analytics).
- To comply with legal obligations, including tax and financial record-keeping (see
  `data-retention-policy.md`).

We do not sell your personal data.

## 3. Who we share data with

- **The restaurant(s) you order from** (via Clover): order contents, delivery address if
  applicable, and enough contact information to fulfill and deliver your order.
- **Clover** (our payment processor): payment tokens and the information needed to
  process a charge or refund. Clover's own privacy policy governs its handling of
  payment data: [CLOVER_PRIVACY_POLICY_URL].
- **Firebase / Google Cloud** (push notifications, crash reporting, analytics):
  [FIREBASE_PRIVACY_POLICY_URL].
- **Service providers** who help us run the Service (hosting, database, error
  monitoring), under contracts that restrict them to using your data only to provide
  services to us.
- **Legal/regulatory authorities**, when required by law, subpoena, or court order.

We do not share your data with third parties for their own independent marketing
purposes without your explicit consent.

## 4. Your rights and choices

- **Access/correction**: you can view and edit most of your profile data in-app.
- **Deletion**: you can request account deletion at any time, in-app or via
  [ACCOUNT_DELETION_URL] (no login session required - only your email and password to
  confirm identity). See `account-deletion-policy.md` for exactly what is and isn't
  deleted.
- **Notification preferences**: push notifications can be disabled in your device
  settings or in-app notification preferences at any time.
- **Regional rights** (GDPR/CCPA/etc., as applicable to you): right to access, correct,
  delete, or port your data, and to object to or restrict certain processing. Contact
  [PRIVACY_CONTACT_EMAIL] to exercise these rights. [JURISDICTION_SPECIFIC_RIGHTS_TEXT]

## 5. Data retention

See `data-retention-policy.md` for the full breakdown. In short: account/profile data is
deleted (anonymized) promptly on request; order, payment, and refund records are
retained longer where required for tax/financial record-keeping, but are disassociated
from your identity once your account is deleted.

## 6. Security

We use industry-standard measures to protect your data, including encryption in
transit (HTTPS/TLS), encryption at rest for sensitive credentials, password hashing
(Argon2id), and role-based access controls for restaurant staff. See `SECURITY.md` for
technical detail. No system is 100% secure, and we cannot guarantee absolute security.

## 7. Children's privacy

The Service is not directed at children under [MINIMUM_AGE, e.g. 13 or 16 depending on
jurisdiction], and we do not knowingly collect personal data from them. If you believe a
child has provided us data, contact [PRIVACY_CONTACT_EMAIL] and we will delete it.

## 8. International data transfers

[INTERNATIONAL_TRANSFER_CLAUSE - fill in if you operate across borders, e.g. data is
processed in [COUNTRY/REGION] and may be transferred internationally to our service
providers listed above under appropriate safeguards.]

## 9. Changes to this policy

We may update this Privacy Policy from time to time. Material changes will be notified
in-app or by email before they take effect.

## 10. Contact us

[COMPANY_LEGAL_NAME]
[COMPANY_ADDRESS]
[PRIVACY_CONTACT_EMAIL]
