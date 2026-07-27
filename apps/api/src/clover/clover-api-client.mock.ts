import { Injectable, Logger } from '@nestjs/common';
import {
  CloverApiClient,
  CloverCategoryDto,
  CloverChargeInput,
  CloverChargeResultDto,
  CloverCreateOrderInput,
  CloverItemDto,
  CloverModifierGroupDto,
  CloverOAuthTokenResult,
  CloverOrderDto,
  CloverRefundResultDto,
} from './interfaces/clover-api-client.interface';

/**
 * Deterministic, in-memory Clover adapter used whenever CLOVER_CLIENT_ID/
 * SECRET aren't configured (local dev, CI, automated tests) - see
 * "Mocked Clover adapters" requirement in the project spec / CLOVER_SETUP_GUIDE.md.
 * Never makes a network call and never requires real credentials.
 */
@Injectable()
export class CloverApiClientMock implements CloverApiClient {
  private readonly logger = new Logger(CloverApiClientMock.name);

  private readonly categories: CloverCategoryDto[] = [
    { id: 'MOCK_CAT_BURGERS', name: 'Burgers' },
    { id: 'MOCK_CAT_DRINKS', name: 'Drinks' },
  ];

  private readonly modifierGroups: CloverModifierGroupDto[] = [
    {
      id: 'MOCK_MODGROUP_TOPPINGS',
      name: 'Extra Toppings',
      minRequired: 0,
      maxAllowed: 5,
      modifiers: [
        { id: 'MOCK_MOD_CHEESE', name: 'Extra Cheese', price: 100 },
        { id: 'MOCK_MOD_BACON', name: 'Bacon', price: 200 },
      ],
    },
  ];

  private readonly items: CloverItemDto[] = [
    {
      id: 'MOCK_ITEM_CHEESEBURGER',
      name: 'Mock Cheeseburger',
      price: 1099,
      hidden: false,
      sku: 'MOCK-SKU-001',
      categories: [this.categories[0]],
      modifierGroups: [this.modifierGroups[0]],
      taxRates: [{ id: 'MOCK_TAX_STANDARD', name: 'Standard Tax', rate: 875 }],
    },
    {
      id: 'MOCK_ITEM_SODA',
      name: 'Mock Soda',
      price: 299,
      hidden: false,
      sku: 'MOCK-SKU-002',
      categories: [this.categories[1]],
      modifierGroups: [],
      taxRates: [{ id: 'MOCK_TAX_STANDARD', name: 'Standard Tax', rate: 875 }],
    },
  ];

  async exchangeAuthorizationCode(code: string): Promise<CloverOAuthTokenResult> {
    this.logger.debug(`[mock] exchanging authorization code "${code}" for tokens`);
    return {
      accessToken: `mock-access-token-${code}`,
      refreshToken: `mock-refresh-token-${code}`,
      accessTokenExpiresAt: Date.now() + 60 * 60 * 1000,
      merchantId: 'MOCK_MERCHANT_ID',
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<CloverOAuthTokenResult> {
    this.logger.debug(`[mock] refreshing access token from "${refreshToken}"`);
    return {
      accessToken: `mock-access-token-refreshed-${Date.now()}`,
      refreshToken,
      accessTokenExpiresAt: Date.now() + 60 * 60 * 1000,
      merchantId: 'MOCK_MERCHANT_ID',
    };
  }

  async listCategories(_merchantId: string, _accessToken: string): Promise<CloverCategoryDto[]> {
    return this.categories;
  }

  async listModifierGroups(
    _merchantId: string,
    _accessToken: string,
  ): Promise<CloverModifierGroupDto[]> {
    return this.modifierGroups;
  }

  async listItems(_merchantId: string, _accessToken: string): Promise<CloverItemDto[]> {
    return this.items;
  }

  async createOrder(
    _merchantId: string,
    _accessToken: string,
    input: CloverCreateOrderInput,
  ): Promise<CloverOrderDto> {
    const total = input.lineItems.reduce((sum, li) => sum + li.priceCents * li.quantity, 0);
    const id = `MOCK_ORDER_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
    this.logger.debug(`[mock] created Clover order ${id} for ${total} cents`);
    return { id, total, state: 'open' };
  }

  async getEcommerceApiAccessKey(_merchantId: string, _accessToken: string): Promise<string> {
    return 'MOCK_ECOMMERCE_API_ACCESS_KEY';
  }

  /**
   * Deterministic outcomes for automated tests / local dev: a source token
   * containing "decline" simulates a declined card so error-handling paths
   * (payment failed screens, order status) can be exercised without a real
   * sandbox merchant.
   */
  async createCharge(
    _accessToken: string,
    input: CloverChargeInput,
  ): Promise<CloverChargeResultDto> {
    const id = `MOCK_CHARGE_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
    if (input.source.toLowerCase().includes('decline')) {
      this.logger.debug(`[mock] simulating declined charge ${id}`);
      return { id, status: 'failed', amountCents: input.amountCents };
    }
    this.logger.debug(`[mock] charged ${input.amountCents} cents -> ${id}`);
    return { id, status: 'succeeded', amountCents: input.amountCents };
  }

  async createRefund(
    _accessToken: string,
    chargeId: string,
    amountCents?: number,
  ): Promise<CloverRefundResultDto> {
    const id = `MOCK_REFUND_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
    this.logger.debug(`[mock] refunded charge ${chargeId} (${amountCents ?? 'full'}) -> ${id}`);
    return { id, status: 'succeeded', amountCents: amountCents ?? 0 };
  }
}
