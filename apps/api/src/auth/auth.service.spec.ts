import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UserRoleType } from '@prisma/client';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    passwordResetToken: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    emailVerificationToken: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let passwordService: { hash: jest.Mock; verify: jest.Mock };
  let tokenService: {
    issueTokenPair: jest.Mock;
    rotateRefreshToken: jest.Mock;
    revokeRefreshToken: jest.Mock;
    revokeAllRefreshTokensForUser: jest.Mock;
  };

  const fakeTokens = {
    accessToken: 'access.jwt.token',
    refreshToken: 'refresh-token-value',
    accessTokenExpiresIn: '15m',
  };

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      passwordResetToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      emailVerificationToken: { create: jest.fn() },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };
    passwordService = { hash: jest.fn(), verify: jest.fn() };
    tokenService = {
      issueTokenPair: jest.fn().mockResolvedValue(fakeTokens),
      rotateRefreshToken: jest.fn().mockResolvedValue(fakeTokens),
      revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
      revokeAllRefreshTokensForUser: jest.fn().mockResolvedValue(undefined),
    };

    authService = new AuthService(
      prisma as unknown as PrismaService,
      passwordService as unknown as PasswordService,
      tokenService as unknown as TokenService,
    );
  });

  describe('register', () => {
    it('rejects when the email is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(
        authService.register({ email: 'taken@example.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates a customer user, hashes the password, and issues tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      passwordService.hash.mockResolvedValue('hashed-password');
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        isGuest: false,
        roles: [{ role: UserRoleType.CUSTOMER, restaurantId: null, restaurantLocationId: null }],
      });
      prisma.emailVerificationToken.create.mockResolvedValue({});

      const result = await authService.register({
        email: 'new@example.com',
        password: 'password123',
      });

      expect(passwordService.hash).toHaveBeenCalledWith('password123');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'new@example.com' }),
        }),
      );
      expect(result.user.email).toBe('new@example.com');
      expect(result.accessToken).toBe(fakeTokens.accessToken);
    });
  });

  describe('login', () => {
    it('rejects when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nobody@example.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects when the password does not match', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: 'hashed',
        deletedAt: null,
        roles: [],
      });
      passwordService.verify.mockResolvedValue(false);

      await expect(
        authService.login({ email: 'user@example.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('issues tokens when credentials are valid', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        firstName: null,
        lastName: null,
        passwordHash: 'hashed',
        deletedAt: null,
        isGuest: false,
        roles: [],
      });
      passwordService.verify.mockResolvedValue(true);

      const result = await authService.login({ email: 'user@example.com', password: 'correct' });

      expect(result.accessToken).toBe(fakeTokens.accessToken);
      expect(tokenService.issueTokenPair).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('does nothing (silently) when the user does not exist, to avoid enumeration', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.forgotPassword({ email: 'nobody@example.com' }),
      ).resolves.toBeUndefined();
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('creates a reset token for an existing, non-guest user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        isGuest: false,
      });

      await authService.forgotPassword({ email: 'user@example.com' });

      expect(prisma.passwordResetToken.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'user-1' }) }),
      );
    });
  });

  describe('resetPassword', () => {
    it('rejects an unknown or expired token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(
        authService.resetPassword({ token: 'bad-token', newPassword: 'newpassword123' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an already-used token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'reset-1',
        userId: 'user-1',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(
        authService.resetPassword({ token: 'used-token', newPassword: 'newpassword123' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates the password and revokes all sessions on success', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'reset-1',
        userId: 'user-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      passwordService.hash.mockResolvedValue('new-hashed-password');

      await authService.resetPassword({ token: 'good-token', newPassword: 'newpassword123' });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(tokenService.revokeAllRefreshTokensForUser).toHaveBeenCalledWith('user-1');
    });
  });
});
