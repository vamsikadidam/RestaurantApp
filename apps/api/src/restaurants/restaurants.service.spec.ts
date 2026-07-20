import { NotFoundException } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RestaurantsService', () => {
  let service: RestaurantsService;
  let prisma: {
    restaurant: { findFirst: jest.Mock };
    restaurantLocation: { findFirst: jest.Mock };
    restaurantHours: { findMany: jest.Mock };
  };

  const baseLocation = {
    id: 'loc-1',
    restaurantId: 'rest-1',
    timezone: 'UTC',
    isActive: true,
    pickupEnabled: true,
    deliveryEnabled: true,
    deletedAt: null,
  };

  beforeEach(() => {
    prisma = {
      restaurant: { findFirst: jest.fn() },
      restaurantLocation: { findFirst: jest.fn() },
      restaurantHours: { findMany: jest.fn() },
    };
    service = new RestaurantsService(prisma as unknown as PrismaService);
  });

  describe('getRestaurant', () => {
    it('throws NotFoundException when the restaurant does not exist', async () => {
      prisma.restaurant.findFirst.mockResolvedValue(null);
      await expect(service.getRestaurant('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the restaurant with its locations', async () => {
      prisma.restaurant.findFirst.mockResolvedValue({ id: 'rest-1', locations: [baseLocation] });
      const result = await service.getRestaurant('rest-1');
      expect(result.id).toBe('rest-1');
    });
  });

  describe('getAvailability', () => {
    it('reports closed when the location is inactive', async () => {
      prisma.restaurantLocation.findFirst.mockResolvedValue({ ...baseLocation, isActive: false });

      const result = await service.getAvailability('rest-1');
      expect(result.isOpenNow).toBe(false);
      expect(result.pickupAvailable).toBe(false);
    });

    it('reports open with pickup/delivery available inside operating hours (UTC)', async () => {
      prisma.restaurantLocation.findFirst.mockResolvedValue(baseLocation);
      const now = new Date();
      const { dayOfWeek } = jest
        .requireActual('../common/utils/timezone.util')
        .resolveLocalTime(now, 'UTC');
      prisma.restaurantHours.findMany.mockResolvedValue([
        { dayOfWeek, opensAtMinutes: 0, closesAtMinutes: 24 * 60, isClosed: false },
      ]);

      const result = await service.getAvailability('rest-1');
      expect(result.isOpenNow).toBe(true);
      expect(result.pickupAvailable).toBe(true);
      expect(result.deliveryAvailable).toBe(true);
    });

    it('reports closed outside operating hours', async () => {
      prisma.restaurantLocation.findFirst.mockResolvedValue(baseLocation);
      prisma.restaurantHours.findMany.mockResolvedValue([
        { dayOfWeek: 0, opensAtMinutes: 0, closesAtMinutes: 1, isClosed: false },
        { dayOfWeek: 1, opensAtMinutes: 0, closesAtMinutes: 1, isClosed: false },
        { dayOfWeek: 2, opensAtMinutes: 0, closesAtMinutes: 1, isClosed: false },
        { dayOfWeek: 3, opensAtMinutes: 0, closesAtMinutes: 1, isClosed: false },
        { dayOfWeek: 4, opensAtMinutes: 0, closesAtMinutes: 1, isClosed: false },
        { dayOfWeek: 5, opensAtMinutes: 0, closesAtMinutes: 1, isClosed: false },
        { dayOfWeek: 6, opensAtMinutes: 0, closesAtMinutes: 1, isClosed: false },
      ]);

      const result = await service.getAvailability('rest-1');
      expect(result.isOpenNow).toBe(false);
    });

    it('throws NotFoundException when the location cannot be resolved', async () => {
      prisma.restaurantLocation.findFirst.mockResolvedValue(null);
      await expect(service.getAvailability('rest-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
