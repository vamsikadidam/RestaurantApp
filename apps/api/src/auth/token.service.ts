import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AccessTokenPayload } from '../common/guards/jwt-auth.guard';
import { RequestUser } from '../common/types/authenticated-request';
import { AuthTokens } from './interfaces/auth-result.interface';

export interface RefreshTokenContext {
  createdByIp?: string;
  userAgent?: string;
}

/**
 * Issues JWT access tokens and manages rotating, DB-backed refresh tokens.
 * Refresh tokens are random opaque strings - only their SHA-256 hash is ever
 * stored, so a database leak alone can't be used to mint new sessions.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  rolesToRequestUserRoles(roles: UserRole[]): RequestUser['roles'] {
    return roles.map((role) => ({
      role: role.role,
      restaurantId: role.restaurantId,
      restaurantLocationId: role.restaurantLocationId,
    }));
  }

  async issueTokenPair(
    user: { id: string; email: string | null; isGuest: boolean },
    roles: UserRole[],
    context: RefreshTokenContext = {},
  ): Promise<AuthTokens> {
    const accessToken = this.signAccessToken(user, roles);
    const refreshToken = await this.createRefreshToken(user.id, context);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: this.configService.get<string>('jwt.accessTokenTtl') ?? '15m',
    };
  }

  signAccessToken(
    user: { id: string; email: string | null; isGuest: boolean },
    roles: UserRole[],
  ): string {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      isGuest: user.isGuest,
      roles: this.rolesToRequestUserRoles(roles),
      type: 'access',
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.configService.get<string>('jwt.accessTokenTtl') ?? '15m',
    });
  }

  private async createRefreshToken(userId: string, context: RefreshTokenContext): Promise<string> {
    const plainToken = randomBytes(48).toString('hex');
    const expiresAt = this.computeRefreshExpiry();

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(plainToken),
        expiresAt,
        createdByIp: context.createdByIp,
        userAgent: context.userAgent,
      },
    });

    return plainToken;
  }

  /**
   * Validates and rotates a refresh token: the presented token is revoked
   * and a new access/refresh pair is issued. Reusing an already-rotated
   * (revoked) token is treated as a potential theft signal and rejected.
   */
  async rotateRefreshToken(
    plainToken: string,
    context: RefreshTokenContext = {},
  ): Promise<AuthTokens> {
    const tokenHash = this.hashToken(plainToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { roles: true } } },
    });

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const newPlainToken = randomBytes(48).toString('hex');
    const newTokenHash = this.hashToken(newPlainToken);
    const expiresAt = this.computeRefreshExpiry();

    await this.prisma.$transaction([
      this.prisma.refreshToken.create({
        data: {
          userId: existing.userId,
          tokenHash: newTokenHash,
          expiresAt,
          createdByIp: context.createdByIp,
          userAgent: context.userAgent,
        },
      }),
      this.prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      }),
    ]);

    const accessToken = this.signAccessToken(existing.user, existing.user.roles);

    return {
      accessToken,
      refreshToken: newPlainToken,
      accessTokenExpiresIn: this.configService.get<string>('jwt.accessTokenTtl') ?? '15m',
    };
  }

  async revokeRefreshToken(plainToken: string): Promise<void> {
    const tokenHash = this.hashToken(plainToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllRefreshTokensForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private computeRefreshExpiry(): Date {
    const ttl = this.configService.get<string>('jwt.refreshTokenTtl') ?? '30d';
    return new Date(Date.now() + this.parseTtlToMs(ttl));
  }

  private parseTtlToMs(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl.trim());
    if (!match) {
      // Fall back to 30 days if misconfigured, rather than crashing token issuance.
      return 30 * 24 * 60 * 60 * 1000;
    }
    const value = parseInt(match[1], 10);
    const unitMs: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * unitMs[match[2]];
  }
}
