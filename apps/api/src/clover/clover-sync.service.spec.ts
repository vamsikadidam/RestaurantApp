import { MenuItemSyncStatus, SyncJobStatus, SyncJobType } from '@prisma/client';
import { CloverSyncService } from './clover-sync.service';
import { CloverOAuthService } from './clover-oauth.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloverApiClient } from './interfaces/clover-api-client.interface';

describe('CloverSyncService', () => {
  let service: CloverSyncService;
  let prisma: any;
  let cloverApiClient: jest.Mocked<CloverApiClient>;
  let cloverOAuthService: { getValidAccessToken: jest.Mock };

  beforeEach(() => {
    prisma = {
      syncJob: { create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      menuCategory: { upsert: jest.fn() },
      modifierGroup: { upsert: jest.fn() },
      modifierOption: { upsert: jest.fn() },
      menuItem: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      menuItemModifierGroup: { findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
      cloverConnection: { updateMany: jest.fn() },
    };

    cloverApiClient = {
      exchangeAuthorizationCode: jest.fn(),
      refreshAccessToken: jest.fn(),
      listCategories: jest.fn().mockResolvedValue([]),
      listModifierGroups: jest.fn().mockResolvedValue([]),
      listItems: jest.fn().mockResolvedValue([]),
      createOrder: jest.fn(),
      getEcommerceApiAccessKey: jest.fn(),
      createCharge: jest.fn(),
      createRefund: jest.fn(),
    };

    cloverOAuthService = {
      getValidAccessToken: jest.fn().mockResolvedValue({ accessToken: 'token', merchantId: 'M1' }),
    };

    prisma.syncJob.create.mockResolvedValue({ id: 'job-1' });
    prisma.syncJob.update.mockImplementation((args: any) =>
      Promise.resolve({ id: 'job-1', ...args.data }),
    );
    prisma.menuItem.findMany.mockResolvedValue([]);
    prisma.menuItemModifierGroup.findMany.mockResolvedValue([]);

    service = new CloverSyncService(
      cloverApiClient,
      prisma as unknown as PrismaService,
      cloverOAuthService as unknown as CloverOAuthService,
    );
  });

  it('marks the sync job SUCCEEDED and records counts when everything syncs cleanly', async () => {
    cloverApiClient.listCategories.mockResolvedValue([{ id: 'CAT1', name: 'Burgers' }]);
    prisma.menuCategory.upsert.mockResolvedValue({ id: 'local-cat-1' });

    cloverApiClient.listItems.mockResolvedValue([
      {
        id: 'ITEM1',
        name: 'Cheeseburger',
        price: 999,
        hidden: false,
        categories: [{ id: 'CAT1', name: 'Burgers' }],
        modifierGroups: [],
        taxRates: [],
      },
    ]);
    prisma.menuItem.findUnique.mockResolvedValue(null); // new item -> "created"
    prisma.menuItem.upsert.mockResolvedValue({ id: 'local-item-1' });

    const result = await service.runFullSync('rest-1', 'loc-1', { type: SyncJobType.MANUAL });

    expect(result.status).toBe(SyncJobStatus.SUCCEEDED);
    expect(result.itemsCreated).toBe(1);
    expect(result.itemsSynced).toBe(1);
    expect(result.itemsFailed).toBe(0);
    expect(prisma.menuItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ syncStatus: MenuItemSyncStatus.SYNCED }),
      }),
    );
  });

  it('never overwrites app-owned fields (description/imageUrl/isFeatured) on update', async () => {
    cloverApiClient.listItems.mockResolvedValue([
      { id: 'ITEM1', name: 'Cheeseburger', price: 999, hidden: false },
    ]);
    prisma.menuItem.findUnique.mockResolvedValue({ id: 'local-item-1' });
    prisma.menuItem.upsert.mockResolvedValue({ id: 'local-item-1' });

    await service.runFullSync('rest-1', 'loc-1', { type: SyncJobType.INCREMENTAL });

    const upsertCall = prisma.menuItem.upsert.mock.calls[0][0];
    expect(upsertCall.update).not.toHaveProperty('description');
    expect(upsertCall.update).not.toHaveProperty('imageUrl');
    expect(upsertCall.update).not.toHaveProperty('isFeatured');
    expect(upsertCall.update).not.toHaveProperty('isSoldOutOverride');
  });

  it('soft-deletes previously-synced items that Clover no longer returns', async () => {
    cloverApiClient.listItems.mockResolvedValue([]); // Clover now returns nothing
    prisma.menuItem.findMany.mockResolvedValue([
      { id: 'stale-1', cloverItemId: 'GONE1' },
      { id: 'stale-2', cloverItemId: 'GONE2' },
    ]);

    const result = await service.runFullSync('rest-1', 'loc-1', { type: SyncJobType.FULL });

    expect(prisma.menuItem.update).toHaveBeenCalledTimes(2);
    expect(prisma.menuItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'stale-1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date), isActive: false }),
      }),
    );
    expect(result.itemsSoftDeleted).toBe(2);
  });

  it('continues syncing other items and records a failure when one item throws', async () => {
    cloverApiClient.listItems.mockResolvedValue([
      { id: 'GOOD', name: 'Good Item', price: 100, hidden: false },
      { id: 'BAD', name: 'Bad Item', price: 200, hidden: false },
    ]);
    prisma.menuItem.findUnique.mockResolvedValue(null);
    prisma.menuItem.upsert
      .mockResolvedValueOnce({ id: 'good-local' })
      .mockRejectedValueOnce(new Error('DB constraint violation'));

    const result = await service.runFullSync('rest-1', 'loc-1', { type: SyncJobType.MANUAL });

    expect(result.status).toBe(SyncJobStatus.PARTIAL);
    expect(result.itemsFailed).toBe(1);
    expect(result.itemsCreated).toBe(1);
  });

  it('marks the sync job FAILED when the Clover connection cannot be used', async () => {
    cloverOAuthService.getValidAccessToken.mockRejectedValue(
      new Error('Clover connection expired'),
    );

    const result = await service.runFullSync('rest-1', 'loc-1', { type: SyncJobType.MANUAL });

    expect(result.status).toBe(SyncJobStatus.FAILED);
    expect(result.errorSummary).toContain('Clover connection expired');
  });

  it('returns the most recent sync jobs for a restaurant', async () => {
    prisma.syncJob.findMany.mockResolvedValue([{ id: 'job-1' }]);
    const jobs = await service.getSyncStatus('rest-1');
    expect(jobs).toHaveLength(1);
    expect(prisma.syncJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { restaurantId: 'rest-1' } }),
    );
  });
});
