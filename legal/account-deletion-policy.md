# Account Deletion Policy

> **TEMPLATE - requires legal review before publishing.** See `legal/README.md`. This
> document should match the actual implementation in
> `apps/api/src/auth/auth.service.ts` (`requestAccountDeletion`) - update both together.

**Last updated:** [DATE]

## 1. How to request deletion

You can request deletion of your account in either of these ways, without needing an
active app session:

- **In-app**: Account settings → Delete account (once built in the mobile app).
- **On the web, without the app**: [ACCOUNT_DELETION_URL] - enter the email and password
  for the account you want deleted. This satisfies Google Play's requirement that
  account deletion be requestable from outside the app.

Guest checkout sessions are not persistent accounts and have nothing to delete beyond
their order history, which is retained per §3 below regardless.

## 2. What happens when you delete your account

Once you confirm your password, we immediately:

- Permanently remove your email, name, phone number, and password from our systems
  (the account record is anonymized, not merely hidden).
- Delete any saved push-notification device tokens, so you stop receiving
  notifications.
- Revoke every active login session on every device.
- Delete saved delivery addresses and payment-related references tied to your profile
  (we never stored raw card data in the first place - see `privacy-policy.md`).

This action is **immediate and cannot be undone**. There is currently no "undo" grace
period - [DECIDE: consider whether to add a delay/undo window before this is finalized].

## 3. What is retained, and why

Your **order history records** (items ordered, amounts charged, refunds, and the fact
that an order occurred) are **not deleted**, but are disassociated from your identity -
the order remains linked to an anonymized account rather than your name/email. This is
retained because:

- Tax and financial regulations require businesses to keep transaction records for a
  minimum period (see `data-retention-policy.md`).
- The restaurant(s) you ordered from may have independent record-keeping obligations for
  the same transactions, outside our control.

We do not use retained, anonymized order records for any purpose other than financial
record-keeping, fraud investigation, and aggregated/anonymized analytics.

## 4. Data held by third parties

Deleting your account with us does not automatically delete data held independently by:

- **Clover**, our payment processor, which retains payment records per its own
  retention obligations and your merchant agreement context.
- **Firebase/Google**, for historical, aggregated analytics/crash data that is not
  personally identifying once your device token is removed.

Contact those providers directly if you have concerns about their independent retention
- [CLOVER_PRIVACY_POLICY_URL] / [FIREBASE_PRIVACY_POLICY_URL].

## 5. Restaurant-side records

Restaurants using this platform may keep their own records of past orders (e.g. for
their own accounting) outside of our systems. This policy governs data held by
[COMPANY_LEGAL_NAME] only.

## 6. Contact us

If you have questions about account deletion, or believe your data was not properly
deleted, contact [PRIVACY_CONTACT_EMAIL].
