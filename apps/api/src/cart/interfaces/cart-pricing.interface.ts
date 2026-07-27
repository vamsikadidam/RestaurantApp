import { FulfillmentType } from '@prisma/client';

export interface PricedModifier {
  priceCents: number;
  quantity: number;
}

/** A single line item as seen by the pricing engine - always built from
 * *live* MenuItem/ModifierOption rows at the moment of pricing, never from
 * client-supplied prices, so the client can never influence the total. */
export interface PricedLineItem {
  unitPriceCents: number;
  quantity: number;
  taxRateBasisPoints: number;
  modifiers: PricedModifier[];
}

export interface DiscountInput {
  /** Basis points (1/100th of a percent) off the subtotal, e.g. 1000 = 10%. */
  percentageBasisPoints?: number | null;
  fixedAmountCents?: number | null;
}

export interface CartPricingInput {
  items: PricedLineItem[];
  fulfillmentType: FulfillmentType | null;
  deliveryFeeCents: number;
  serviceFeeCents: number;
  serviceFeeBasisPoints: number;
  discount?: DiscountInput | null;
  tipCents: number;
  currency: string;
}

export interface CartPricingResult {
  subtotalCents: number;
  taxCents: number;
  serviceFeeCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  tipCents: number;
  totalCents: number;
  currency: string;
}
