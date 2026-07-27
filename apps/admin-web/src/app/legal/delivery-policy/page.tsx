import { LegalPage, LegalSection } from '@/components/LegalPage';

export const metadata = { title: 'Delivery Policy' };

export default function DeliveryPolicyPage() {
  return (
    <LegalPage title="Delivery Policy" lastUpdated="[DATE]">
      <LegalSection heading="1. Delivery area">
        <p>
          Each restaurant location sets its own delivery radius. At checkout, the app tells you whether delivery is
          currently available to your address; addresses outside a restaurant&apos;s configured delivery radius
          cannot be selected for delivery (pickup remains available).
        </p>
      </LegalSection>

      <LegalSection heading="2. Delivery fees and minimum order">
        <ul>
          <li>
            A delivery fee (flat amount and/or a percentage-based service fee) may apply, shown before you confirm
            your order.
          </li>
          <li>
            Some restaurants set a minimum order subtotal for delivery; this is enforced at checkout and shown
            before you add items.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Estimated delivery time">
        <p>
          Estimated delivery/prep times shown in-app are estimates based on the restaurant&apos;s configured default
          prep time and are not guaranteed. Actual times can vary due to order volume, weather, traffic, or
          restaurant-specific delays.
        </p>
      </LegalSection>

      <LegalSection heading="4. Who delivers">
        <p>
          [FILL IN YOUR ACTUAL DELIVERY MODEL - e.g. delivery is fulfilled by the restaurant&apos;s own staff/
          contracted drivers, or by a third-party delivery partner. This materially affects liability and insurance,
          so it must be filled in accurately.]
        </p>
      </LegalSection>

      <LegalSection heading="5. Delivery instructions and contact">
        <p>
          You can add delivery instructions (e.g. gate code, building/unit number, &ldquo;leave at door&rdquo;) when
          placing an order. Provide accurate contact information - the restaurant or delivery driver may need to
          reach you if there&apos;s an issue locating you.
        </p>
      </LegalSection>

      <LegalSection heading="6. Failed or delayed deliveries">
        <ul>
          <li>
            If a delivery cannot be completed because no one is available to receive it, and it isn&apos;t safe/
            appropriate to leave unattended, contact [SUPPORT_EMAIL] as soon as possible. Refund eligibility is
            covered by our <a href="/legal/refund-cancellation-policy">Refund & Cancellation Policy</a>.
          </li>
          <li>
            If your order is significantly delayed beyond the estimated time, check your order status in-app first;
            contact [SUPPORT_EMAIL] if you have concerns.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="7. Order accuracy at delivery">
        <p>
          Please check your order upon receipt. Report any missing or incorrect items per our{' '}
          <a href="/legal/refund-cancellation-policy">Refund & Cancellation Policy</a>.
        </p>
      </LegalSection>

      <LegalSection heading="8. Contact us">
        <p>
          [COMPANY_LEGAL_NAME]
          <br />
          [SUPPORT_EMAIL]
        </p>
      </LegalSection>
    </LegalPage>
  );
}
