import { UnauthorizedException } from '@nestjs/common';
import { UserRoleType } from '@prisma/client';
import { TokenService } from './token.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TokenService', () => {
  let tokenService: TokenService;
  let jwtService: { sign: jest.Mock };
  let configService: { get: jest.Mock };
  let prisma: {
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      updateMany: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') };
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          'jwt.accessSecret': 'test-secret',
          'jwt.accessTokenTtl': '15m',
          'jwt.refreshTokenTtl': '30d',
        };
        return values[key];
      }),
    };
    prisma = {
      refreshToken: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };

    tokenService = new TokenService(
      jwtService as any,
      configService as any,
      prisma as unknown as PrismaService,
    );
  });

  it('signs an access token embedding user id, guest flag, and roles', () => {
    const token = tokenService.signAccessToken(
      { id: 'user-1', email: 'user@example.com', isGuest: false },
      [{ role: UserRoleType.CUSTOMER, restaurantId: null, restaurantLocationId: null } as any],
    );

    expect(token).toBe('signed.jwt.token');
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'user-1', type: 'access' }),
      expect.objectContaining({ secret: 'test-secret' }),
    );
  });

  it('issues a token pair and persists a hashed refresh token', async () => {
    const result = await tokenService.issueTokenPair(
      { id: 'user-1', email: 'user@example.com', isGuest: false },
      [],
    );

    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.refreshToken).toHaveLength(96); // 48 bytes hex-encoded
    expect(prisma.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-1' }),
      }),
    );
    // The plaintext refresh token must never be persisted directly.
    const persistedHash = prisma.refreshToken.create.mock.calls[0][0].data.tokenHash;
    expect(persistedHash).not.toBe(result.refreshToken);
  });

  it('rejects rotation of an unknown refresh token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(null);

    await expect(tokenService.rotateRefreshToken('does-not-exist')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects rotation of a revoked refresh token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: 'user-1', email: 'user@example.com', isGuest: false, roles: [] },
    });

    await expect(tokenService.rotateRefreshToken('revoked-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects rotation of an expired refresh token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      user: { id: 'user-1', email: 'user@example.com', isGuest: false, roles: [] },
    });

    await expect(tokenService.rotateRefreshToken('expired-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rotates a valid refresh token: revokes the old one and issues a new pair', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: 'user-1', email: 'user@example.com', isGuest: false, roles: [] },
    });

    const result = await tokenService.rotateRefreshToken('valid-token');

    expect(result.accessToken).toBe('signed.jwt.token');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('revokes a refresh token by its hash', async () => {
    await tokenService.revokeRefreshToken('some-token');

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ revokedAt: null }),
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      }),
    );
  });
});
