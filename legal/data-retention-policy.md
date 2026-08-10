# Data Retention Policy

> **TEMPLATE - requires legal review before publishing**, especially the retention
> periods marked `[CONFIRM: ...]`, which depend on tax/financial regulations in your
> operating jurisdiction(s). See `legal/README.md`. This is primarily an internal/
> compliance document, referenced from `privacy-policy.md`.

**Last updated:** August 10, 2026

## 1. Purpose

This policy defines how long each category of data collected by India Garden is retained,
and why, so that:

- We keep data only as long as we have a legitimate business or legal reason to.
- Users' deletion requests are honored consistently (see
  `account-deletion-policy.md`).
- We can demonstrate compliance with applicable data-protection and financial
  record-keeping law.

## 2. Retention schedule

| Data category | Retained while | Retained after account deletion | Basis |
|---|---|---|---|
| Account profile (name, email, phone, password hash) | Account is active | **Deleted/anonymized immediately** on deletion request | User consent / contract necessity |
| Saved addresses | Account is active | Deleted immediately on deletion request | User consent / contract necessity |
| Push notification device tokens | Active/enabled | Deleted immediately on deletion request or when a token becomes invalid | Contract necessity (service delivery) |
| Order records (items, totals, status history) | Indefinitely, disassociated from identity after account deletion | Retained, anonymized | `[CONFIRM: financial/tax record-keeping period in your jurisdiction, e.g. 6-7 years]` |
| Payment records (Clover tokens/references, amounts, refund history) | Indefinitely, disassociated from identity after account deletion | Retained, anonymized | `[CONFIRM: financial/tax record-keeping period]` and payment processor agreement terms |
| Refresh tokens / session records | Until expiry (default 30 days) or revocation | Revoked immediately on account deletion | Security (session management) |
| Audit log entries (admin/staff actions: refunds, settings changes, Clover connect/disconnect) | `[CONFIRM: internal security/compliance retention period, e.g. 1-3 years]` | Retained (references restaurant staff, not the deleting customer, in most cases) | Security, fraud investigation, accountability |
| Crash reports / analytics events (Firebase) | Per Firebase's own retention settings (configurable in the Firebase console) | Aggregated/anonymized; not directly tied to a deleted account once the device token is removed | Service improvement, debugging |
| Support communications (emails, tickets) | `[CONFIRM: e.g. 2 years from last contact]` | Retained unless a separate deletion request is made for that correspondence | Customer service quality, dispute resolution |

## 3. Why order/payment records outlive account deletion

Tax authorities and financial regulators in most jurisdictions require businesses to
retain records of transactions (what was sold, for how much, when, and any refunds) for
a minimum number of years, independent of whether the customer who placed the order
still has an account. We satisfy this by **anonymizing** the customer's identity on the
order record rather than deleting the order itself - see
`apps/api/src/auth/auth.service.ts` (`requestAccountDeletion`) for the exact fields
affected.

## 4. Deletion/anonymization mechanics

- Account deletion is immediate and irreversible (no queued/batched deletion job today -
  the user record is anonymized synchronously when the request is confirmed).
- `[FUTURE WORK: if the business later wants a grace/undo period, or a scheduled purge
  job for very old anonymized order records past the mandatory retention window, that
  should be implemented as a scheduled job and documented here.]`

## 5. Review cadence

This policy should be reviewed at least annually, and whenever a new data category is
introduced (e.g. a new integration, a new feature that collects new user data), to keep
the table in §2 accurate.

## 6. Contact us

+1 (661) 200-3055 (confirm privacy contact email before launch)
