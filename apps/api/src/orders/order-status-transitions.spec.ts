import { OrderStatus } from '@prisma/client';
import { isTerminalStatus, isValidStaffTransition } from './order-status-transitions';

describe('order-status-transitions', () => {
  describe('isValidStaffTransition', () => {
    it('allows PAID -> ACCEPTED', () => {
      expect(isValidStaffTransition(OrderStatus.PAID, OrderStatus.ACCEPTED)).toBe(true);
    });

    it('allows ACCEPTED -> PREPARING -> READY_FOR_PICKUP', () => {
      expect(isValidStaffTransition(OrderStatus.ACCEPTED, OrderStatus.PREPARING)).toBe(true);
      expect(isValidStaffTransition(OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP)).toBe(
        true,
      );
    });

    it('rejects skipping straight from PAID to COMPLETED', () => {
      expect(isValidStaffTransition(OrderStatus.PAID, OrderStatus.COMPLETED)).toBe(false);
    });

    it('rejects staff moving an order into a payment-driven status', () => {
      expect(isValidStaffTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.PAID)).toBe(false);
    });

    it('rejects any transition out of a terminal status', () => {
      expect(isValidStaffTransition(OrderStatus.COMPLETED, OrderStatus.ACCEPTED)).toBe(false);
      expect(isValidStaffTransition(OrderStatus.CANCELLED, OrderStatus.PREPARING)).toBe(false);
    });
  });

  describe('isTerminalStatus', () => {
    it('treats COMPLETED, REJECTED, CANCELLED, and REFUNDED as terminal', () => {
      expect(isTerminalStatus(OrderStatus.COMPLETED)).toBe(true);
      expect(isTerminalStatus(OrderStatus.REJECTED)).toBe(true);
      expect(isTerminalStatus(OrderStatus.CANCELLED)).toBe(true);
      expect(isTerminalStatus(OrderStatus.REFUNDED)).toBe(true);
    });

    it('does not treat in-progress statuses as terminal', () => {
      expect(isTerminalStatus(OrderStatus.PREPARING)).toBe(false);
      expect(isTerminalStatus(OrderStatus.PAID)).toBe(false);
    });
  });
});
