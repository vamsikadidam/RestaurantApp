import { LegalPage, LegalSection } from '@/components/LegalPage';

export const metadata = { title: 'Terms & Conditions' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions" lastUpdated="[DATE]">
      <p>
        These Terms & Conditions (&ldquo;Terms&rdquo;) govern your use of the [APP_NAME] app and website (the
        &ldquo;Service&rdquo;), operated by [COMPANY_LEGAL_NAME] (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an
        account or placing an order, you agree to these Terms.
      </p>

      <LegalSection heading="1. The Service">
        <p>
          The Service lets you browse participating restaurants&apos; menus, place orders for pickup or delivery,
          and pay through Clover, our third-party payment processor. We are a technology platform connecting you
          with restaurants; the restaurant is responsible for preparing your food safely and to the standard
          advertised.
        </p>
      </LegalSection>

      <LegalSection heading="2. Accounts">
        <ul>
          <li>You must provide accurate information when creating an account, and keep your credentials confidential.</li>
          <li>You may also check out as a guest for a single order without creating a permanent account.</li>
          <li>
            You are responsible for all activity under your account. Notify us immediately at [SUPPORT_EMAIL] of any
            unauthorized use.
          </li>
          <li>
            We may suspend or terminate accounts that violate these Terms, engage in fraud, or abuse the Service.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Orders and pricing">
        <ul>
          <li>
            Menu items, prices, and availability are set by each restaurant and may change without notice. The price
            shown at checkout is recalculated server-side at the time of order, not client-submitted.
          </li>
          <li>
            Placing an order is an offer to purchase; it is accepted once the restaurant confirms it. We reserve the
            right to refuse or cancel an order, with a full refund of any amount charged.
          </li>
          <li>Fees (service fee, delivery fee) are disclosed before you confirm payment.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Payment">
        <ul>
          <li>
            Payments are processed by Clover. By placing an order you authorize a charge for the full order total
            (including tax, fees, and any tip) to your chosen payment method.
          </li>
          <li>We never see or store your full card number.</li>
          <li>
            If a payment fails or is disputed/charged back without a valid basis, we may suspend your account
            pending resolution.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Cancellations and refunds">
        <p>
          See our <a href="/legal/refund-cancellation-policy">Refund & Cancellation Policy</a> for the full policy,
          including timing windows and how refunds are issued back to your original payment method via Clover.
        </p>
      </LegalSection>

      <LegalSection heading="6. Delivery">
        <p>
          See our <a href="/legal/delivery-policy">Delivery Policy</a> for delivery areas, fees, estimated timing,
          and what happens if a delivery cannot be completed.
        </p>
      </LegalSection>

      <LegalSection heading="7. User conduct">
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful purpose, or to defraud us, a restaurant, or another user.</li>
          <li>Attempt to interfere with, reverse-engineer, or gain unauthorized access to the Service or its API.</li>
          <li>Harass restaurant staff, delivery personnel, or other users.</li>
          <li>Submit false information (e.g. false delivery addresses, fraudulent payment methods).</li>
        </ul>
      </LegalSection>

      <LegalSection heading="8. Intellectual property">
        <p>
          The Service, including its software, design, and content (excluding restaurant-supplied menu content and
          imagery), is owned by [COMPANY_LEGAL_NAME] or its licensors and protected by intellectual property law.
        </p>
      </LegalSection>

      <LegalSection heading="9. Third-party services">
        <p>
          The Service integrates with third-party providers, including Clover (payments/order management) and
          Firebase (push notifications, analytics, crash reporting). Your use of those integrated features is also
          subject to those providers&apos; own terms.
        </p>
      </LegalSection>

      <LegalSection heading="10. Disclaimers">
        <p>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTIES OF ANY KIND, TO THE MAXIMUM EXTENT PERMITTED
          BY LAW. WE DO NOT GUARANTEE THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT ANY PARTICULAR
          RESTAURANT&apos;S FOOD WILL MEET YOUR EXPECTATIONS. FOOD ALLERGEN AND INGREDIENT INFORMATION SHOWN IN-APP
          IS PROVIDED BY THE RESTAURANT; CONFIRM DIRECTLY WITH THE RESTAURANT IF YOU HAVE A SEVERE ALLERGY.
          [ADD JURISDICTION-SPECIFIC CONSUMER PROTECTION CARVE-OUTS THAT CANNOT BE DISCLAIMED.]
        </p>
      </LegalSection>

      <LegalSection heading="11. Limitation of liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, [COMPANY_LEGAL_NAME]&apos;S TOTAL LIABILITY FOR ANY CLAIM ARISING
          FROM YOUR USE OF THE SERVICE IS LIMITED TO THE AMOUNT YOU PAID FOR THE ORDER(S) GIVING RISE TO THE CLAIM.
          [ADD JURISDICTION-SPECIFIC LIMITS/CARVE-OUTS.]
        </p>
      </LegalSection>

      <LegalSection heading="12. Governing law & disputes">
        <p>
          These Terms are governed by the laws of [GOVERNING_LAW_JURISDICTION], without regard to conflict-of-laws
          principles. [ADD DISPUTE RESOLUTION / ARBITRATION / VENUE CLAUSE AS APPROPRIATE.]
        </p>
      </LegalSection>

      <LegalSection heading="13. Changes to these Terms">
        <p>
          We may update these Terms from time to time. Continued use of the Service after changes take effect
          constitutes acceptance of the updated Terms.
        </p>
      </LegalSection>

      <LegalSection heading="14. Contact us">
        <p>
          [COMPANY_LEGAL_NAME]
          <br />
          [COMPANY_ADDRESS]
          <br />
          [SUPPORT_EMAIL]
        </p>
      </LegalSection>
    </LegalPage>
  );
}
