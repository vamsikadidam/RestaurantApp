import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloverConnectionStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { EncryptionService } from '../crypto/encryption.service';
import { CLOVER_API_CLIENT, CloverApiClient } from './interfaces/clover-api-client.interface';

const OAUTH_STATE_TTL_SECONDS = 10 * 60; // 10 minutes to complete the merchant consent flow.
const OAUTH_STATE_REDIS_PREFIX = 'clover:oauth:state:';

export interface OAuthStatePayload {
  restaurantLocationId: string;
  connectedByUserId: string;
}

@Injectable()
export class CloverOAuthService {
  private readonly logger = new Logger(CloverOAuthService.name);

  constructor(
    @Inject(CLOVER_API_CLIENT) private readonly cloverApiClient: CloverApiClient,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Builds the URL the restaurant admin's browser should be redirected to in
   * order to log in to Clover and approve access, and stashes the context
   * needed to finish the flow (which restaurant location, which admin) under
   * a random state token - since we cannot assume Clover echoes back any
   * app-specific data other than the standard OAuth `code` (and, per Clover's
   * docs, typically `merchant_id`) on redirect back to CLOVER_REDIRECT_URI.
   */
  async buildAuthorizationUrl(payload: OAuthStatePayload): Promise<string> {
    const clientId = this.configService.get<string>('clover.clientId');
    const redirectUri = this.configService.get<string>('clover.redirectUri');
    const oauthWebBaseUrl = this.configService.get<string>('clover.oauthWebBaseUrl');

    if (!clientId || !redirectUri) {
      throw new BadRequestException(
        'Clover is not configured on this server yet (missing CLOVER_CLIENT_ID/CLOVER_REDIRECT_URI).',
      );
    }

    const state = randomBytes(24).toString('hex');
    await this.redis.setJson(
      `${OAUTH_STATE_REDIS_PREFIX}${state}`,
      payload,
      OAUTH_STATE_TTL_SECONDS,
    );

    const url = new URL('/oauth/v2/authorize', oauthWebBaseUrl);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);

    return url.toString();
  }

  /**
   * Completes the OAuth flow: exchanges the authorization code for tokens,
   * encrypts them, and upserts the CloverConnection for the restaurant
   * location that started the flow (recovered via `state`).
   */
  async handleCallback(params: { code: string; state: string; merchantId?: string }) {
    const stateKey = `${OAUTH_STATE_REDIS_PREFIX}${params.state}`;
    const statePayload = await this.redis.getJson<OAuthStatePayload>(stateKey);

    if (!statePayload) {
      throw new BadRequestException(
        'This Clover connection request has expired or is invalid. Please try connecting again.',
      );
    }
    await this.redis.del(stateKey);

    const tokenResult = await this.cloverApiClient.exchangeAuthorizationCode(params.code);
    const merchantId = tokenResult.merchantId ?? params.merchantId;

    if (!merchantId) {
      throw new BadRequestException(
        'Clover did not return a merchant identifier for this connection.',
      );
    }

    const connection = await this.prisma.cloverConnection.upsert({
      where: { restaurantLocationId: statePayload.restaurantLocationId },
      create: {
        restaurantLocationId: statePayload.restaurantLocationId,
        cloverMerchantId: merchantId,
        accessTokenEncrypted: this.encryptionService.encrypt(tokenResult.accessToken),
        refreshTokenEncrypted: tokenResult.refreshToken
          ? this.encryptionService.encrypt(tokenResult.refreshToken)
          : null,
        accessTokenExpiresAt: tokenResult.accessTokenExpiresAt
          ? new Date(tokenResult.accessTokenExpiresAt)
          : null,
        status: CloverConnectionStatus.ACTIVE,
        connectedByUserId: statePayload.connectedByUserId,
        scopes: [],
      },
      update: {
        cloverMerchantId: merchantId,
        accessTokenEncrypted: this.encryptionService.encrypt(tokenResult.accessToken),
        refreshTokenEncrypted: tokenResult.refreshToken
          ? this.encryptionService.encrypt(tokenResult.refreshToken)
          : undefined,
        accessTokenExpiresAt: tokenResult.accessTokenExpiresAt
          ? new Date(tokenResult.accessTokenExpiresAt)
          : null,
        status: CloverConnectionStatus.ACTIVE,
        connectedByUserId: statePayload.connectedByUserId,
        disconnectedAt: null,
      },
    });

    this.logger.log(
      `Clover connection established for restaurant location ${statePayload.restaurantLocationId} (merchant ${merchantId})`,
    );

    return connection;
  }

  /** Returns a decrypted access token for a location, refreshing it first if expired. */
  async getValidAccessToken(restaurantLocationId: string): Promise<{
    accessToken: string;
    merchantId: string;
  }> {
    const connection = await this.prisma.cloverConnection.findUnique({
      where: { restaurantLocationId },
    });

    if (!connection || connection.status !== CloverConnectionStatus.ACTIVE) {
      throw new NotFoundException('This restaurant location is not connected to Clover.');
    }

    const isExpired =
      connection.accessTokenExpiresAt !== null && connection.accessTokenExpiresAt < new Date();

    if (!isExpired) {
      return {
        accessToken: this.encryptionService.decrypt(connection.accessTokenEncrypted),
        merchantId: connection.cloverMerchantId,
      };
    }

    if (!connection.refreshTokenEncrypted) {
      throw new BadRequestException(
        'The Clover connection for this restaurant has expired and must be reconnected.',
      );
    }

    const refreshToken = this.encryptionService.decrypt(connection.refreshTokenEncrypted);
    const refreshed = await this.cloverApiClient.refreshAccessToken(refreshToken);

    await this.prisma.cloverConnection.update({
      where: { id: connection.id },
      data: {
        accessTokenEncrypted: this.encryptionService.encrypt(refreshed.accessToken),
        refreshTokenEncrypted: refreshed.refreshToken
          ? this.encryptionService.encrypt(refreshed.refreshToken)
          : connection.refreshTokenEncrypted,
        accessTokenExpiresAt: refreshed.accessTokenExpiresAt
          ? new Date(refreshed.accessTokenExpiresAt)
          : null,
      },
    });

    return { accessToken: refreshed.accessToken, merchantId: connection.cloverMerchantId };
  }

  async disconnect(restaurantLocationId: string, actorUserId?: string): Promise<void> {
    await this.prisma.cloverConnection.updateMany({
      where: { restaurantLocationId },
      data: { status: CloverConnectionStatus.DISCONNECTED, disconnectedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        actorRole: 'RESTAURANT_ADMIN',
        action: 'CLOVER_DISCONNECT',
        entityType: 'CloverConnection',
        entityId: restaurantLocationId,
      },
    });
  }

  /** Admin portal (Phase 6) connection badge - never exposes tokens, just presence/state. */
  async getConnectionStatus(restaurantLocationId: string): Promise<{
    connected: boolean;
    merchantId?: string;
    connectedAt?: Date;
    lastSyncAt?: Date | null;
  }> {
    const connection = await this.prisma.cloverConnection.findUnique({
      where: { restaurantLocationId },
    });

    if (!connection || connection.status !== CloverConnectionStatus.ACTIVE) {
      return { connected: false };
    }

    return {
      connected: true,
      merchantId: connection.cloverMerchantId,
      connectedAt: connection.connectedAt,
      lastSyncAt: connection.lastSyncAt,
    };
  }
}
