import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CloverConnectionStatus } from '@prisma/client';
import { CloverOAuthService } from './clover-oauth.service';
import { CloverApiClient } from './interfaces/clover-api-client.interface';

describe('CloverOAuthService', () => {
  let service: CloverOAuthService;
  let cloverApiClient: jest.Mocked<CloverApiClient>;
  let configService: { get: jest.Mock };
  let prisma: any;
  let redis: { setJson: jest.Mock; getJson: jest.Mock; del: jest.Mock };
  let encryptionService: { encrypt: jest.Mock; decrypt: jest.Mock };

  beforeEach(() => {
    cloverApiClient = {
      exchangeAuthorizationCode: jest.fn(),
      refreshAccessToken: jest.fn(),
      listCategories: jest.fn(),
      listModifierGroups: jest.fn(),
      listItems: jest.fn(),
    };
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          'clover.clientId': 'client-123',
          'clover.redirectUri': 'https://api.example.com/integrations/clover/oauth/callback',
          'clover.oauthWebBaseUrl': 'https://sandbox.dev.clover.com',
        };
        return values[key];
      }),
    };
    prisma = {
      cloverConnection: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    redis = { setJson: jest.fn(), getJson: jest.fn(), del: jest.fn() };
    encryptionService = {
      encrypt: jest.fn((v: string) => `enc(${v})`),
      decrypt: jest.fn((v: string) => v.replace(/^enc\(|\)$/g, '')),
    };

    service = new CloverOAuthService(
      cloverApiClient,
      configService as any,
      prisma,
      redis as any,
      encryptionService as any,
    );
  });

  describe('buildAuthorizationUrl', () => {
    it('builds a v2/authorize URL against the sandbox web host with a state token', async () => {
      const url = await service.buildAuthorizationUrl({
        restaurantLocationId: 'loc-1',
        connectedByUserId: 'user-1',
      });

      expect(url).toContain('https://sandbox.dev.clover.com/oauth/v2/authorize');
      expect(url).toContain('client_id=client-123');
      expect(redis.setJson).toHaveBeenCalledWith(
        expect.stringContaining('clover:oauth:state:'),
        { restaurantLocationId: 'loc-1', connectedByUserId: 'user-1' },
        600,
      );
    });

    it('throws when Clover client id / redirect URI are not configured', async () => {
      configService.get.mockReturnValue(undefined);
      await expect(
        service.buildAuthorizationUrl({ restaurantLocationId: 'loc-1', connectedByUserId: 'u1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('handleCallback', () => {
    it('rejects when the state token is unknown or expired', async () => {
      redis.getJson.mockResolvedValue(null);
      await expect(
        service.handleCallback({ code: 'abc', state: 'unknown-state' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('exchanges the code, encrypts tokens, and upserts the connection', async () => {
      redis.getJson.mockResolvedValue({
        restaurantLocationId: 'loc-1',
        connectedByUserId: 'user-1',
      });
      cloverApiClient.exchangeAuthorizationCode.mockResolvedValue({
        accessToken: 'access-token-value',
        refreshToken: 'refresh-token-value',
        accessTokenExpiresAt: Date.now() + 3600_000,
        merchantId: 'MERCHANT_1',
      });
      prisma.cloverConnection.upsert.mockResolvedValue({
        cloverMerchantId: 'MERCHANT_1',
        restaurantLocationId: 'loc-1',
      });

      const result = await service.handleCallback({ code: 'auth-code', state: 'state-1' });

      expect(redis.del).toHaveBeenCalled();
      expect(encryptionService.encrypt).toHaveBeenCalledWith('access-token-value');
      expect(prisma.cloverConnection.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { restaurantLocationId: 'loc-1' },
        }),
      );
      expect(result.cloverMerchantId).toBe('MERCHANT_1');
    });

    it('rejects when no merchant id is available from Clover or the callback', async () => {
      redis.getJson.mockResolvedValue({ restaurantLocationId: 'loc-1', connectedByUserId: 'u1' });
      cloverApiClient.exchangeAuthorizationCode.mockResolvedValue({
        accessToken: 'token',
      });

      await expect(
        service.handleCallback({ code: 'auth-code', state: 'state-1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getValidAccessToken', () => {
    it('throws NotFoundException when there is no active connection', async () => {
      prisma.cloverConnection.findUnique.mockResolvedValue(null);
      await expect(service.getValidAccessToken('loc-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the decrypted token directly when not expired', async () => {
      prisma.cloverConnection.findUnique.mockResolvedValue({
        id: 'conn-1',
        status: CloverConnectionStatus.ACTIVE,
        accessTokenEncrypted: 'enc(live-token)',
        accessTokenExpiresAt: new Date(Date.now() + 3600_000),
        cloverMerchantId: 'M1',
      });

      const result = await service.getValidAccessToken('loc-1');
      expect(result.accessToken).toBe('live-token');
      expect(cloverApiClient.refreshAccessToken).not.toHaveBeenCalled();
    });

    it('refreshes the token when expired and a refresh token is available', async () => {
      prisma.cloverConnection.findUnique.mockResolvedValue({
        id: 'conn-1',
        status: CloverConnectionStatus.ACTIVE,
        accessTokenEncrypted: 'enc(old-token)',
        refreshTokenEncrypted: 'enc(refresh-token)',
        accessTokenExpiresAt: new Date(Date.now() - 1000),
        cloverMerchantId: 'M1',
      });
      cloverApiClient.refreshAccessToken.mockResolvedValue({
        accessToken: 'new-token',
        refreshToken: 'new-refresh-token',
        accessTokenExpiresAt: Date.now() + 3600_000,
      });

      const result = await service.getValidAccessToken('loc-1');
      expect(result.accessToken).toBe('new-token');
      expect(prisma.cloverConnection.update).toHaveBeenCalled();
    });

    it('throws when expired and there is no refresh token', async () => {
      prisma.cloverConnection.findUnique.mockResolvedValue({
        id: 'conn-1',
        status: CloverConnectionStatus.ACTIVE,
        accessTokenEncrypted: 'enc(old-token)',
        refreshTokenEncrypted: null,
        accessTokenExpiresAt: new Date(Date.now() - 1000),
        cloverMerchantId: 'M1',
      });

      await expect(service.getValidAccessToken('loc-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
