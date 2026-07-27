import { CloverApiClientMock } from './clover-api-client.mock';

describe('CloverApiClientMock', () => {
  let client: CloverApiClientMock;

  beforeEach(() => {
    client = new CloverApiClientMock();
  });

  it('returns deterministic categories, modifier groups, and items without any network call', async () => {
    const categories = await client.listCategories('any-merchant', 'any-token');
    const modifierGroups = await client.listModifierGroups('any-merchant', 'any-token');
    const items = await client.listItems('any-merchant', 'any-token');

    expect(categories.length).toBeGreaterThan(0);
    expect(modifierGroups.length).toBeGreaterThan(0);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty('id');
    expect(items[0]).toHaveProperty('price');
  });

  it('returns fake OAuth tokens derived from the provided code', async () => {
    const result = await client.exchangeAuthorizationCode('test-code');
    expect(result.accessToken).toContain('test-code');
    expect(result.merchantId).toBe('MOCK_MERCHANT_ID');
  });

  it('returns a refreshed fake access token', async () => {
    const result = await client.refreshAccessToken('old-refresh-token');
    expect(result.accessToken).toBeTruthy();
    expect(result.merchantId).toBe('MOCK_MERCHANT_ID');
  });

  it('creates a deterministic mock order with the summed total', async () => {
    const order = await client.createOrder('M1', 'token', {
      lineItems: [
        { name: 'Burger', priceCents: 999, quantity: 2 },
        { name: 'Soda', priceCents: 299, quantity: 1 },
      ],
    });

    expect(order.id).toContain('MOCK_ORDER_');
    expect(order.total).toBe(999 * 2 + 299);
  });

  it('returns a static, non-secret mock Ecommerce API access key', async () => {
    const key = await client.getEcommerceApiAccessKey('M1', 'token');
    expect(key).toBe('MOCK_ECOMMERCE_API_ACCESS_KEY');
  });

  it('succeeds a charge for a normal source token', async () => {
    const result = await client.createCharge('token', {
      amountCents: 1000,
      currency: 'usd',
      source: 'clv_1ABC',
    });
    expect(result.status).toBe('succeeded');
    expect(result.amountCents).toBe(1000);
  });

  it('simulates a declined charge when the source token contains "decline"', async () => {
    const result = await client.createCharge('token', {
      amountCents: 1000,
      currency: 'usd',
      source: 'clv_decline_card',
    });
    expect(result.status).toBe('failed');
  });

  it('always succeeds a mock refund', async () => {
    const result = await client.createRefund('token', 'MOCK_CHARGE_1', 500);
    expect(result.status).toBe('succeeded');
    expect(result.amountCents).toBe(500);
  });
});
