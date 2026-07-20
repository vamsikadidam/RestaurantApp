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
});
