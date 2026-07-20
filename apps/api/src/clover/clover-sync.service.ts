import { Inject, Injectable, Logger } from '@nestjs/common';
import { MenuItemSyncStatus, SyncJobStatus, SyncJobType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CloverOAuthService } from './clover-oauth.service';
import {
  CLOVER_API_CLIENT,
  CloverApiClient,
  CloverItemDto,
} from './interfaces/clover-api-client.interface';

export interface RunSyncOptions {
  type: SyncJobType;
  triggeredByUserId?: string;
}

/**
 * Synchronizes Clover inventory (categories, modifier groups/options, items)
 * into the local Prisma projection. App-specific fields - custom image,
 * marketing description, featured flags, sold-out override - are never
 * touched by sync; only Clover-owned fields are written on update. Items
 * previously synced from Clover but no longer returned by Clover are soft
 * deleted (never hard-deleted, and local-only items are never touched).
 */
@Injectable()
export class CloverSyncService {
  private readonly logger = new Logger(CloverSyncService.name);

  constructor(
    @Inject(CLOVER_API_CLIENT) private readonly cloverApiClient: CloverApiClient,
    private readonly prisma: PrismaService,
    private readonly cloverOAuthService: CloverOAuthService,
  ) {}

  async runFullSync(restaurantId: string, restaurantLocationId: string, options: RunSyncOptions) {
    const syncJob = await this.prisma.syncJob.create({
      data: {
        restaurantId,
        type: options.type,
        status: SyncJobStatus.RUNNING,
        startedAt: new Date(),
        triggeredByUserId: options.triggeredByUserId,
      },
    });

    const logs: string[] = [];
    const counters = { synced: 0, created: 0, updated: 0, softDeleted: 0, failed: 0 };

    try {
      const { accessToken, merchantId } =
        await this.cloverOAuthService.getValidAccessToken(restaurantLocationId);

      const [cloverCategories, cloverModifierGroups, cloverItems] = await Promise.all([
        this.cloverApiClient.listCategories(merchantId, accessToken),
        this.cloverApiClient.listModifierGroups(merchantId, accessToken),
        this.cloverApiClient.listItems(merchantId, accessToken),
      ]);

      const categoryIdMap = await this.syncCategories(
        restaurantId,
        cloverCategories,
        logs,
        counters,
      );
      const modifierGroupIdMap = await this.syncModifierGroups(
        restaurantId,
        cloverModifierGroups,
        logs,
        counters,
      );
      await this.syncItems(
        restaurantId,
        cloverItems,
        categoryIdMap,
        modifierGroupIdMap,
        logs,
        counters,
      );
      await this.softDeleteMissingItems(restaurantId, cloverItems, counters);

      await this.prisma.cloverConnection.updateMany({
        where: { restaurantLocationId },
        data: { lastSyncAt: new Date() },
      });

      const status = counters.failed > 0 ? SyncJobStatus.PARTIAL : SyncJobStatus.SUCCEEDED;

      return this.prisma.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status,
          finishedAt: new Date(),
          itemsSynced: counters.synced,
          itemsCreated: counters.created,
          itemsUpdated: counters.updated,
          itemsSoftDeleted: counters.softDeleted,
          itemsFailed: counters.failed,
          logs,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      this.logger.error(`Sync job ${syncJob.id} aborted: ${message}`);
      logs.push(`Sync aborted: ${message}`);

      return this.prisma.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status: SyncJobStatus.FAILED,
          finishedAt: new Date(),
          errorSummary: message,
          logs,
        },
      });
    }
  }

  async getSyncStatus(restaurantId: string) {
    return this.prisma.syncJob.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  private async syncCategories(
    restaurantId: string,
    categories: { id: string; name: string }[],
    logs: string[],
    counters: { failed: number },
  ): Promise<Map<string, string>> {
    const idMap = new Map<string, string>();

    for (const category of categories) {
      try {
        const local = await this.prisma.menuCategory.upsert({
          where: { restaurantId_cloverCategoryId: { restaurantId, cloverCategoryId: category.id } },
          create: { restaurantId, cloverCategoryId: category.id, name: category.name },
          // Never touch description/imageUrl/displayOrder here - those are app-owned.
          update: { name: category.name, deletedAt: null, isActive: true },
        });
        idMap.set(category.id, local.id);
      } catch (error) {
        counters.failed += 1;
        logs.push(`category ${category.id} failed: ${this.errorMessage(error)}`);
      }
    }

    return idMap;
  }

  private async syncModifierGroups(
    restaurantId: string,
    groups: {
      id: string;
      name: string;
      minRequired?: number;
      maxAllowed?: number;
      modifiers: { id: string; name: string; price: number }[];
    }[],
    logs: string[],
    counters: { failed: number },
  ): Promise<Map<string, string>> {
    const idMap = new Map<string, string>();

    for (const group of groups) {
      try {
        const local = await this.prisma.modifierGroup.upsert({
          where: {
            restaurantId_cloverModifierGroupId: {
              restaurantId,
              cloverModifierGroupId: group.id,
            },
          },
          create: {
            restaurantId,
            cloverModifierGroupId: group.id,
            name: group.name,
            minSelect: group.minRequired ?? 0,
            maxSelect: group.maxAllowed ?? null,
            isRequired: (group.minRequired ?? 0) > 0,
          },
          update: {
            name: group.name,
            minSelect: group.minRequired ?? 0,
            maxSelect: group.maxAllowed ?? null,
            isRequired: (group.minRequired ?? 0) > 0,
            deletedAt: null,
          },
        });
        idMap.set(group.id, local.id);

        for (const modifier of group.modifiers) {
          try {
            await this.prisma.modifierOption.upsert({
              where: {
                modifierGroupId_cloverModifierId: {
                  modifierGroupId: local.id,
                  cloverModifierId: modifier.id,
                },
              },
              create: {
                modifierGroupId: local.id,
                cloverModifierId: modifier.id,
                name: modifier.name,
                priceCents: modifier.price,
              },
              update: { name: modifier.name, priceCents: modifier.price, deletedAt: null },
            });
          } catch (error) {
            counters.failed += 1;
            logs.push(`modifier ${modifier.id} failed: ${this.errorMessage(error)}`);
          }
        }
      } catch (error) {
        counters.failed += 1;
        logs.push(`modifier group ${group.id} failed: ${this.errorMessage(error)}`);
      }
    }

    return idMap;
  }

  private async syncItems(
    restaurantId: string,
    items: CloverItemDto[],
    categoryIdMap: Map<string, string>,
    modifierGroupIdMap: Map<string, string>,
    logs: string[],
    counters: { synced: number; created: number; updated: number; failed: number },
  ): Promise<void> {
    for (const item of items) {
      try {
        const existing = await this.prisma.menuItem.findUnique({
          where: { restaurantId_cloverItemId: { restaurantId, cloverItemId: item.id } },
        });

        const primaryCategoryCloverId = item.categories?.[0]?.id;
        const categoryId = primaryCategoryCloverId
          ? (categoryIdMap.get(primaryCategoryCloverId) ?? null)
          : null;
        const taxRateBasisPoints = item.taxRates?.[0]?.rate ?? 0;

        const local = await this.prisma.menuItem.upsert({
          where: { restaurantId_cloverItemId: { restaurantId, cloverItemId: item.id } },
          create: {
            restaurantId,
            cloverItemId: item.id,
            name: item.name,
            priceCents: item.price,
            sku: item.sku,
            categoryId,
            taxRateBasisPoints,
            isAvailable: !item.hidden,
            syncStatus: MenuItemSyncStatus.SYNCED,
            lastSyncedAt: new Date(),
          },
          // Deliberately NOT touching: description, imageUrl, isFeatured,
          // featuredOrder, isSoldOutOverride, isActive - those are app-owned.
          update: {
            name: item.name,
            priceCents: item.price,
            sku: item.sku,
            categoryId,
            taxRateBasisPoints,
            isAvailable: !item.hidden,
            syncStatus: MenuItemSyncStatus.SYNCED,
            lastSyncedAt: new Date(),
            deletedAt: null,
          },
        });

        existing ? counters.updated++ : counters.created++;
        counters.synced++;

        await this.syncItemModifierGroups(local.id, item, modifierGroupIdMap);
      } catch (error) {
        counters.failed += 1;
        logs.push(`item ${item.id} failed: ${this.errorMessage(error)}`);
      }
    }
  }

  private async syncItemModifierGroups(
    menuItemId: string,
    item: CloverItemDto,
    modifierGroupIdMap: Map<string, string>,
  ): Promise<void> {
    const desiredGroupIds = (item.modifierGroups ?? [])
      .map((g) => modifierGroupIdMap.get(g.id))
      .filter((id): id is string => Boolean(id));

    const existingAssociations = await this.prisma.menuItemModifierGroup.findMany({
      where: { menuItemId },
    });
    const existingGroupIds = new Set(existingAssociations.map((a) => a.modifierGroupId));

    for (const [index, groupId] of desiredGroupIds.entries()) {
      if (!existingGroupIds.has(groupId)) {
        await this.prisma.menuItemModifierGroup.create({
          data: { menuItemId, modifierGroupId: groupId, displayOrder: index },
        });
      }
    }

    for (const association of existingAssociations) {
      if (!desiredGroupIds.includes(association.modifierGroupId)) {
        await this.prisma.menuItemModifierGroup.delete({ where: { id: association.id } });
      }
    }
  }

  private async softDeleteMissingItems(
    restaurantId: string,
    cloverItems: CloverItemDto[],
    counters: { softDeleted: number },
  ): Promise<void> {
    const seenIds = new Set(cloverItems.map((i) => i.id));

    const previouslySynced = await this.prisma.menuItem.findMany({
      where: { restaurantId, cloverItemId: { not: null }, deletedAt: null },
    });

    for (const item of previouslySynced) {
      if (item.cloverItemId && !seenIds.has(item.cloverItemId)) {
        await this.prisma.menuItem.update({
          where: { id: item.id },
          data: { deletedAt: new Date(), isActive: false },
        });
        counters.softDeleted += 1;
      }
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
