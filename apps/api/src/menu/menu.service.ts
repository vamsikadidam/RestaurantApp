import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

const MODIFIER_GROUP_INCLUDE = {
  modifierGroups: {
    orderBy: { displayOrder: 'asc' as const },
    include: {
      modifierGroup: {
        include: {
          options: {
            where: { deletedAt: null },
            orderBy: { displayOrder: 'asc' as const },
          },
        },
      },
    },
  },
};

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async getMenu(restaurantId: string) {
    const categories = await this.prisma.menuCategory.findMany({
      where: { restaurantId, isActive: true, deletedAt: null },
      orderBy: { displayOrder: 'asc' },
      include: {
        menuItems: {
          where: { isActive: true, deletedAt: null },
          orderBy: { name: 'asc' },
        },
      },
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      imageUrl: category.imageUrl,
      displayOrder: category.displayOrder,
      items: category.menuItems.map((item) => this.toItemSummary(item)),
    }));
  }

  async getCategories(restaurantId: string) {
    return this.prisma.menuCategory.findMany({
      where: { restaurantId, isActive: true, deletedAt: null },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async getItem(itemId: string) {
    const item = await this.prisma.menuItem.findFirst({
      where: { id: itemId, deletedAt: null },
      include: MODIFIER_GROUP_INCLUDE,
    });

    if (!item || !item.isActive) {
      throw new NotFoundException('Menu item not found');
    }

    return this.toItemDetail(item);
  }

  async search(restaurantId: string, query: string) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const items = await this.prisma.menuItem.findMany({
      where: {
        restaurantId,
        isActive: true,
        deletedAt: null,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: 50,
    });

    return items.map((item) => this.toItemSummary(item));
  }

  /** Admin/employee menu view - includes inactive/sold-out items the public GET /menu hides. */
  async listAdminMenuItems(restaurantId: string) {
    const [categories, items] = await Promise.all([
      this.prisma.menuCategory.findMany({
        where: { restaurantId, deletedAt: null },
        orderBy: { displayOrder: 'asc' },
      }),
      this.prisma.menuItem.findMany({
        where: { restaurantId, deletedAt: null },
        orderBy: { name: 'asc' },
      }),
    ]);

    return { categories, items };
  }

  async updateMenuItem(itemId: string, dto: UpdateMenuItemDto, actorUserId: string) {
    const item = await this.prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId: dto.restaurantId, deletedAt: null },
    });
    if (!item) {
      throw new NotFoundException('Menu item not found for this restaurant');
    }

    const updated = await this.prisma.menuItem.update({
      where: { id: itemId },
      data: {
        priceCents: dto.priceCents,
        description: dto.description,
        isAvailable: dto.isAvailable,
        isSoldOutOverride: dto.isSoldOutOverride,
        isFeatured: dto.isFeatured,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        actorRole: 'RESTAURANT_ADMIN',
        action: 'UPDATE_MENU_ITEM',
        entityType: 'MenuItem',
        entityId: itemId,
        previousValue: JSON.parse(JSON.stringify(item)),
        newValue: JSON.parse(JSON.stringify(updated)),
      },
    });

    return this.toItemSummary(updated);
  }

  private toItemSummary(item: {
    id: string;
    categoryId: string | null;
    name: string;
    description: string | null;
    priceCents: number;
    imageUrl: string | null;
    cloverImageUrl: string | null;
    isAvailable: boolean;
    isSoldOutOverride: boolean;
    isFeatured: boolean;
  }) {
    return {
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description,
      priceCents: item.priceCents,
      imageUrl: item.imageUrl ?? item.cloverImageUrl,
      isAvailable: item.isAvailable && !item.isSoldOutOverride,
      isFeatured: item.isFeatured,
    };
  }

  private toItemDetail(item: {
    id: string;
    categoryId: string | null;
    name: string;
    description: string | null;
    priceCents: number;
    imageUrl: string | null;
    cloverImageUrl: string | null;
    isAvailable: boolean;
    isSoldOutOverride: boolean;
    isFeatured: boolean;
    taxRateBasisPoints: number;
    modifierGroups: Array<{
      displayOrder: number;
      modifierGroup: {
        id: string;
        name: string;
        minSelect: number;
        maxSelect: number | null;
        isRequired: boolean;
        options: Array<{
          id: string;
          name: string;
          priceCents: number;
          maxQuantity: number;
          isAvailable: boolean;
        }>;
      };
    }>;
  }) {
    return {
      ...this.toItemSummary(item),
      taxRateBasisPoints: item.taxRateBasisPoints,
      modifierGroups: item.modifierGroups
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map(({ modifierGroup }) => ({
          id: modifierGroup.id,
          name: modifierGroup.name,
          minSelect: modifierGroup.minSelect,
          maxSelect: modifierGroup.maxSelect,
          isRequired: modifierGroup.isRequired,
          options: modifierGroup.options.map((option) => ({
            id: option.id,
            name: option.name,
            priceCents: option.priceCents,
            maxQuantity: option.maxQuantity,
            isAvailable: option.isAvailable,
          })),
        })),
    };
  }
}
