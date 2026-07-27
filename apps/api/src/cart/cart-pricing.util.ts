import { FulfillmentType } from '@prisma/client';
import {
  CartPricingInput,
  CartPricingResult,
  PricedLineItem,
} from './interfaces/cart-pricing.interface';

const BASIS_POINTS_DENOMINATOR = 10_000;

/** Money is always an integer number of minor currency units (cents). Every
 * intermediate calculation below rounds to the nearest cent immediately -
 * never carry fractional cents forward, and never use floating point money
 * anywhere else in the codebase (see SECURITY.md / README.md). */
export function lineItemGrossCents(item: PricedLineItem): number {
  const modifiersUnitCents = item.modifiers.reduce(
    (sum, modifier) => sum + modifier.priceCents * modifier.quantity,
    0,
  );
  return (item.unitPriceCents + modifiersUnitCents) * item.quantity;
}

export function lineItemTaxCents(item: PricedLineItem): number {
  const gross = lineItemGrossCents(item);
  return Math.round((gross * item.taxRateBasisPoints) / BASIS_POINTS_DENOMINATOR);
}

/**
 * Computes the full authoritative price breakdown for a cart or a
 * to-be-created order. This is the single source of truth for money math -
 * both CartService (live preview) and OrdersService (checkout snapshot) call
 * into this function so the number a customer sees never drifts from the
 * number they're charged.
 */
export function priceCart(input: CartPricingInput): CartPricingResult {
  const subtotalCents = input.items.reduce((sum, item) => sum + lineItemGrossCents(item), 0);
  const taxCents = input.items.reduce((sum, item) => sum + lineItemTaxCents(item), 0);

  const discountCents = computeDiscountCents(subtotalCents, input.discount);

  const serviceFeePercentCents = Math.round(
    (subtotalCents * input.serviceFeeBasisPoints) / BASIS_POINTS_DENOMINATOR,
  );
  const serviceFeeCents = input.serviceFeeCents + serviceFeePercentCents;

  const deliveryFeeCents =
    input.fulfillmentType === FulfillmentType.DELIVERY ? input.deliveryFeeCents : 0;

  const tipCents = Math.max(0, input.tipCents);

  const totalCents = Math.max(
    0,
    subtotalCents - discountCents + taxCents + serviceFeeCents + deliveryFeeCents + tipCents,
  );

  return {
    subtotalCents,
    taxCents,
    serviceFeeCents,
    deliveryFeeCents,
    discountCents,
    tipCents,
    totalCents,
    currency: input.currency,
  };
}

function computeDiscountCents(
  subtotalCents: number,
  discount: CartPricingInput['discount'],
): number {
  if (!discount) return 0;

  let discountCents = 0;
  if (discount.percentageBasisPoints) {
    discountCents += Math.round(
      (subtotalCents * discount.percentageBasisPoints) / BASIS_POINTS_DENOMINATOR,
    );
  }
  if (discount.fixedAmountCents) {
    discountCents += discount.fixedAmountCents;
  }

  // Never let a discount make the subtotal negative.
  return Math.min(discountCents, subtotalCents);
}
