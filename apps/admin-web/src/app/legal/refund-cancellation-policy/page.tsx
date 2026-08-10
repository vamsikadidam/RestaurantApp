import { LegalPage, LegalSection } from '@/components/LegalPage';

export const metadata = { title: 'Refund & Cancellation Policy' };

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund & Cancellation Policy" lastUpdated="August 10, 2026">
      <LegalSection heading="1. Order cancellation by you">
        <ul>
          <li>
            You may cancel an order for a full refund only while it is still awaiting restaurant acceptance (order
            status <strong>Submitted</strong> or <strong>Paid</strong>, before the restaurant marks it{' '}
            <strong>Accepted</strong>). Once a restaurant accepts and begins preparing your order, it generally
            cannot be cancelled.
          </li>
          <li>
            To cancel an eligible order, use the &ldquo;Cancel order&rdquo; option in-app, or contact
            +1 (661) 200-3055 immediately.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. Order rejection or cancellation by the restaurant">
        <p>
          If a restaurant rejects your order (e.g. closed, item unavailable, unable to fulfill) or cancels it after
          acceptance (e.g. kitchen issue), you receive a <strong>full refund</strong> automatically to your original
          payment method. No action is needed on your part.
        </p>
      </LegalSection>

      <LegalSection heading="3. Issues with a delivered/picked-up order">
        <p>
          If your order arrives incorrect, incomplete, or of unacceptable quality, contact +1 (661) 200-3055 within
          24 hours of receiving it, with details (and photos, if applicable). Depending on the
          issue, we or the restaurant may offer a full or partial refund for the affected item(s), a credit toward a
          future order, or a replacement item on a future order.
        </p>
      </LegalSection>

      <LegalSection heading="4. How refunds are processed">
        <ul>
          <li>
            All refunds are issued by restaurant staff (or platform support, on their behalf) through Clover, back
            to your <strong>original payment method</strong>. We do not issue cash refunds or refunds to a different
            payment method.
          </li>
          <li>Refunds can be full or partial (e.g. refunding just one item&apos;s cost rather than the whole order).</li>
          <li>
            Processing time back to your card/bank is determined by Clover and your card issuer, typically
            5-10 business days.
          </li>
          <li>You&apos;ll see the refund reflected in your order history in-app once it&apos;s issued.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Tips">
        <p>
          Tips are paid to the restaurant/delivery staff. If an order is fully refunded because it was never
          fulfilled, the tip is refunded along with the rest of the order. For partial-order issues, tip adjustments
          are handled case-by-case.
        </p>
      </LegalSection>

      <LegalSection heading="6. Fees">
        <p>
          Service and delivery fees are refunded in full if the entire order is refunded. For partial refunds of
          individual items, service/delivery fees are refunded per [POLICY - decide and document].
        </p>
      </LegalSection>

      <LegalSection heading="7. Disputes / chargebacks">
        <p>
          If you believe a charge was made in error, please contact us at +1 (661) 200-3055 before initiating a
          chargeback with your bank. Chargebacks filed without first contacting us, where found to be without
          merit, may result in account suspension per our Terms & Conditions.
        </p>
      </LegalSection>

      <LegalSection heading="8. Contact us">
        <p>
          India Garden Restaurant
          <br />
          +1 (661) 200-3055
        </p>
      </LegalSection>
    </LegalPage>
  );
}
