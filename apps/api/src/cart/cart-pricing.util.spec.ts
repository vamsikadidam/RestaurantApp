import { FulfillmentType } from '@prisma/client';
import { lineItemGrossCents, lineItemTaxCents, priceCart } from './cart-pricing.util';
import { PricedLineItem } from './interfaces/cart-pricing.interface';

function item(overrides: Partial<PricedLineItem> = {}): PricedLineItem {
  return {
    unitPriceCents: 1000,
    quantity: 1,
    taxRateBasisPoints: 875, // 8.75%
    modifiers: [],
    ...overrides,
  };
}

describe('cart-pricing.util', () => {
  describe('lineItemGrossCents', () => {
    it('multiplies unit price by quantity', () => {
      expect(lineItemGrossCents(item({ unitPriceCents: 500, quantity: 3 }))).toBe(1500);
    });

    it('adds modifier prices per unit before multiplying by quantity', () => {
      const withModifiers = item({
        unitPriceCents: 1000,
        quantity: 2,
        modifiers: [
          { priceCents: 100, quantity: 1 },
          { priceCents: 50, quantity: 2 },
        ],
      });
      // (1000 + 100*1 + 50*2) * 2 = 1200 * 2 = 2400
      expect(lineItemGrossCents(withModifiers)).toBe(2400);
    });
  });

  describe('lineItemTaxCents', () => {
    it('rounds to the nearest cent', () => {
      // gross = 1099, rate = 875bp -> 96.1625 -> rounds to 96
      expect(lineItemTaxCents(item({ unitPriceCents: 1099 }))).toBe(96);
    });
  });

  describe('priceCart', () => {
    it('computes a full breakdown for a simple pickup order', () => {
      const result = priceCart({
        items: [item({ unitPriceCents: 1000, quantity: 2 })], // subtotal 2000
        fulfillmentType: FulfillmentType.PICKUP,
        deliveryFeeCents: 300,
        serviceFeeCents: 0,
        serviceFeeBasisPoints: 0,
        discount: null,
        tipCents: 0,
        currency: 'USD',
      });

      expect(result.subtotalCents).toBe(2000);
      expect(result.taxCents).toBe(175); // 2000 * 875bp = 175
      expect(result.deliveryFeeCents).toBe(0); // pickup never charges delivery fee
      expect(result.totalCents).toBe(2175);
    });

    it('charges delivery fee only for delivery orders', () => {
      const result = priceCart({
        items: [item({ unitPriceCents: 1000, quantity: 1, taxRateBasisPoints: 0 })],
        fulfillmentType: FulfillmentType.DELIVERY,
        deliveryFeeCents: 399,
        serviceFeeCents: 0,
        serviceFeeBasisPoints: 0,
        discount: null,
        tipCents: 0,
        currency: 'USD',
      });

      expect(result.deliveryFeeCents).toBe(399);
      expect(result.totalCents).toBe(1399);
    });

    it('applies flat + percentage service fees', () => {
      const result = priceCart({
        items: [item({ unitPriceCents: 2000, quantity: 1, taxRateBasisPoints: 0 })],
        fulfillmentType: FulfillmentType.PICKUP,
        deliveryFeeCents: 0,
        serviceFeeCents: 50,
        serviceFeeBasisPoints: 500, // 5%
        discount: null,
        tipCents: 0,
        currency: 'USD',
      });

      // service fee = 50 + round(2000 * 0.05) = 50 + 100 = 150
      expect(result.serviceFeeCents).toBe(150);
      expect(result.totalCents).toBe(2150);
    });

    it('applies a percentage discount capped at the subtotal', () => {
      const result = priceCart({
        items: [item({ unitPriceCents: 1000, quantity: 1, taxRateBasisPoints: 0 })],
        fulfillmentType: FulfillmentType.PICKUP,
        deliveryFeeCents: 0,
        serviceFeeCents: 0,
        serviceFeeBasisPoints: 0,
        discount: { percentageBasisPoints: 10_000 }, // 100% off
        tipCents: 0,
        currency: 'USD',
      });

      expect(result.discountCents).toBe(1000);
      expect(result.totalCents).toBe(0);
    });

    it('never lets total go negative when a fixed discount exceeds the subtotal', () => {
      const result = priceCart({
        items: [item({ unitPriceCents: 500, quantity: 1, taxRateBasisPoints: 0 })],
        fulfillmentType: FulfillmentType.PICKUP,
        deliveryFeeCents: 0,
        serviceFeeCents: 0,
        serviceFeeBasisPoints: 0,
        discount: { fixedAmountCents: 5000 },
        tipCents: 0,
        currency: 'USD',
      });

      expect(result.discountCents).toBe(500);
      expect(result.totalCents).toBe(0);
    });

    it('includes the customer-selected tip in the total', () => {
      const result = priceCart({
        items: [item({ unitPriceCents: 1000, quantity: 1, taxRateBasisPoints: 0 })],
        fulfillmentType: FulfillmentType.PICKUP,
        deliveryFeeCents: 0,
        serviceFeeCents: 0,
        serviceFeeBasisPoints: 0,
        discount: null,
        tipCents: 250,
        currency: 'USD',
      });

      expect(result.tipCents).toBe(250);
      expect(result.totalCents).toBe(1250);
    });
  });
});
