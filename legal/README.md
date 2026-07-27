# Legal document templates

> **Status: templates, not final legal text.** Every document in this folder is a
> functionally-accurate starting point, generated from what the product actually does
> (see `SECURITY.md`, `apps/api/prisma/schema.prisma`, and the API implementation) - not
> boilerplate copied from an unrelated business. **Each one still requires review and
> sign-off by a qualified lawyer in your jurisdiction before publishing**, especially for:
>
> - Consumer protection / distance-selling law specific to food delivery in your region
> - Data protection law applicable to your users (GDPR, CCPA/CPRA, PIPEDA, etc.)
> - Local health/food-safety disclosure requirements
> - Payment services regulation (Clover is the payment processor of record - confirm your
>   agreement with Clover and how it interacts with these documents)
>
> Every placeholder is wrapped in `[SQUARE_BRACKETS]`. Search the whole folder for `[` to
> find every value a human still needs to fill in (company legal name, registered address,
> support email, governing-law jurisdiction, arbitration/venue clauses, etc.) before this
> goes live.

| Document | Purpose | Published at (once finalized) |
|---|---|---|
| `privacy-policy.md` | What personal data is collected, why, and user rights | Public URL required by Google Play and most data-protection laws |
| `terms-and-conditions.md` | Contract governing use of the app/ordering service | Linked from account creation / checkout |
| `refund-cancellation-policy.md` | When/how refunds and order cancellations are handled | Linked from checkout and order-history screens |
| `delivery-policy.md` | Delivery area, fees, timing, and failed-delivery handling | Linked from checkout when delivery is selected |
| `account-deletion-policy.md` | What happens when a user deletes their account | Linked from the in-app and web account-deletion flows |
| `data-retention-policy.md` | How long each category of data is kept and why | Internal + referenced from the Privacy Policy |

## Where these are actually served

The customer-facing account-deletion request page lives at `apps/admin-web/src/app/account-deletion`
(a public, unauthenticated route despite living in the admin-web app - see the comment in
that file for why). Simple public rendering pages for each document below live at
`apps/admin-web/src/app/legal/*`, so each has a real, stable, public URL once the admin
portal is deployed - required by Google Play's Data Safety section (see
`GOOGLE_PLAY_RELEASE_GUIDE.md`).

Keep the rendered pages and these markdown files in sync when either is edited.
