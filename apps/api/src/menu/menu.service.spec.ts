import { NotFoundException } from '@nestjs/common';
import { MenuService } from './menu.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MenuService', () => {
  let service: MenuService;
  let prisma: {
    menuCategory: { findMany: jest.Mock };
    menuItem: { findFirst: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      menuCategory: { findMany: jest.fn() },
      menuItem: { findFirst: jest.fn(), findMany: jest.fn() },
    };
    service = new MenuService(prisma as unknown as PrismaService);
  });

  describe('getMenu', () => {
    it('marks an item unavailable when sold out, even if the base flag is available', async () => {
      prisma.menuCategory.findMany.mockResolvedValue([
        {
          id: 'cat-1',
          name: 'Burgers',
          description: null,
          imageUrl: null,
          displayOrder: 1,
          menuItems: [
            {
              id: 'item-1',
              categoryId: 'cat-1',
              name: 'Cheeseburger',
              description: null,
              priceCents: 999,
              imageUrl: null,
              cloverImageUrl: null,
              isAvailable: true,
              isSoldOutOverride: true,
              isFeatured: false,
            },
          ],
        },
      ]);

      const menu = await service.getMenu('rest-1');
      expect(menu[0].items[0].isAvailable).toBe(false);
    });
  });

  describe('getItem', () => {
    it('throws NotFoundException when the item does not exist', async () => {
      prisma.menuItem.findFirst.mockResolvedValue(null);
      await expect(service.getItem('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when the item is inactive', async () => {
      prisma.menuItem.findFirst.mockResolvedValue({ id: 'item-1', isActive: false });
      await expect(service.getItem('item-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns nested modifier groups sorted by display order with options', async () => {
      prisma.menuItem.findFirst.mockResolvedValue({
        id: 'item-1',
        categoryId: 'cat-1',
        name: 'Cheeseburger',
        description: null,
        priceCents: 999,
        imageUrl: null,
        cloverImageUrl: null,
        isAvailable: true,
        isSoldOutOverride: false,
        isFeatured: false,
        isActive: true,
        taxRateBasisPoints: 875,
        modifierGroups: [
          {
            displayOrder: 2,
            modifierGroup: {
              id: 'mg-2',
              name: 'Sauces',
              minSelect: 0,
              maxSelect: 1,
              isRequired: false,
              options: [],
            },
          },
          {
            displayOrder: 1,
            modifierGroup: {
              id: 'mg-1',
              name: 'Toppings',
              minSelect: 0,
              maxSelect: 5,
              isRequired: false,
              options: [
                { id: 'opt-1', name: 'Cheese', priceCents: 100, maxQuantity: 1, isAvailable: true },
              ],
            },
          },
        ],
      });

      const detail = await service.getItem('item-1');
      expect(detail.modifierGroups.map((g) => g.id)).toEqual(['mg-1', 'mg-2']);
      expect(detail.modifierGroups[0].options).toHaveLength(1);
    });
  });

  describe('search', () => {
    it('returns an empty array for a blank query without hitting the database', async () => {
      const results = await service.search('rest-1', '   ');
      expect(results).toEqual([]);
      expect(prisma.menuItem.findMany).not.toHaveBeenCalled();
    });
  });
});
