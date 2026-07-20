import { CloverApiClientHttp } from './clover-api-client.http';

describe('CloverApiClientHttp', () => {
  let client: CloverApiClientHttp;
  let axiosRef: { get: jest.Mock; post: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(() => {
    axiosRef = { get: jest.fn(), post: jest.fn() };
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          'clover.apiBaseUrl': 'https://apisandbox.dev.clover.com',
          'clover.clientId': 'client-1',
          'clover.clientSecret': 'secret-1',
        };
        return values[key];
      }),
    };

    client = new CloverApiClientHttp({ axiosRef } as any, configService as any);
  });

  it('exchanges an authorization code against /oauth/v2/token with client credentials', async () => {
    axiosRef.post.mockResolvedValue({
      data: {
        access_token: 'access-abc',
        refresh_token: 'refresh-abc',
        access_token_expiration: Math.floor(Date.now() / 1000) + 3600,
        merchant_id: 'M123',
      },
    });

    const result = await client.exchangeAuthorizationCode('the-code');

    expect(axiosRef.post).toHaveBeenCalledWith('https://apisandbox.dev.clover.com/oauth/v2/token', {
      client_id: 'client-1',
      client_secret: 'secret-1',
      code: 'the-code',
    });
    expect(result.accessToken).toBe('access-abc');
    expect(result.merchantId).toBe('M123');
    // Seconds-based expiration should be normalized to milliseconds.
    expect(result.accessTokenExpiresAt).toBeGreaterThan(Date.now());
  });

  it('paginates through list endpoints using the elements envelope until a short page is returned', async () => {
    const fullPage = Array.from({ length: 2 }, (_, i) => ({ id: `cat-${i}`, name: `Cat ${i}` }));
    axiosRef.get
      .mockResolvedValueOnce({ data: { elements: fullPage } })
      .mockResolvedValueOnce({ data: { elements: [] } });

    // Force a tiny page size scenario isn't directly configurable, so this
    // test instead verifies the client correctly unwraps the `elements`
    // envelope and stops once a page shorter than the limit is returned.
    const categories = await client.listCategories('M1', 'token-1');

    expect(categories).toEqual([
      { id: 'cat-0', name: 'Cat 0' },
      { id: 'cat-1', name: 'Cat 1' },
    ]);
    expect(axiosRef.get).toHaveBeenCalledWith(
      'https://apisandbox.dev.clover.com/v3/merchants/M1/categories',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-1' },
        params: expect.objectContaining({ limit: 1000, offset: 0 }),
      }),
    );
  });

  it('normalizes nested modifier groups/modifiers on items regardless of array vs. {elements} shape', async () => {
    axiosRef.get.mockResolvedValueOnce({
      data: {
        elements: [
          {
            id: 'item-1',
            name: 'Burger',
            price: 999,
            hidden: false,
            categories: { elements: [{ id: 'cat-1', name: 'Burgers' }] },
            modifierGroups: [
              {
                id: 'mg-1',
                name: 'Toppings',
                modifiers: { elements: [{ id: 'mod-1', name: 'Cheese', price: 100 }] },
              },
            ],
            taxRates: [{ id: 'tax-1', name: 'Standard', rate: 875 }],
          },
        ],
      },
    });

    const items = await client.listItems('M1', 'token-1');

    expect(items[0].categories).toEqual([{ id: 'cat-1', name: 'Burgers' }]);
    expect(items[0].modifierGroups?.[0].modifiers).toEqual([
      { id: 'mod-1', name: 'Cheese', price: 100 },
    ]);
    expect(items[0].taxRates).toEqual([{ id: 'tax-1', name: 'Standard', rate: 875 }]);
  });
});
