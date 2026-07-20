describe('cloverConfig', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('resolves the sandbox base URL when CLOVER_ENVIRONMENT=sandbox', async () => {
    process.env.CLOVER_ENVIRONMENT = 'sandbox';
    delete process.env.CLOVER_API_BASE_URL;
    const { default: cloverConfig } = await import('./clover.config');
    const config = cloverConfig();
    expect(config.environment).toBe('sandbox');
    expect(config.apiBaseUrl).toContain('sandbox');
  });

  it('resolves the production base URL when CLOVER_ENVIRONMENT=production', async () => {
    process.env.CLOVER_ENVIRONMENT = 'production';
    delete process.env.CLOVER_API_BASE_URL;
    const { default: cloverConfig } = await import('./clover.config');
    const config = cloverConfig();
    expect(config.environment).toBe('production');
    expect(config.apiBaseUrl).not.toContain('sandbox');
  });

  it('allows CLOVER_API_BASE_URL to override the resolved host', async () => {
    process.env.CLOVER_ENVIRONMENT = 'sandbox';
    process.env.CLOVER_API_BASE_URL = 'https://custom.example.com';
    const { default: cloverConfig } = await import('./clover.config');
    const config = cloverConfig();
    expect(config.apiBaseUrl).toBe('https://custom.example.com');
  });

  it('resolves a distinct OAuth web host from the API host', async () => {
    process.env.CLOVER_ENVIRONMENT = 'sandbox';
    delete process.env.CLOVER_API_BASE_URL;
    delete process.env.CLOVER_OAUTH_WEB_BASE_URL;
    const { default: cloverConfig } = await import('./clover.config');
    const config = cloverConfig();
    expect(config.oauthWebBaseUrl).toBe('https://sandbox.dev.clover.com');
    expect(config.apiBaseUrl).toBe('https://apisandbox.dev.clover.com');
  });

  it('defaults to the mock client when no Clover credentials are configured', async () => {
    delete process.env.CLOVER_CLIENT_ID;
    delete process.env.CLOVER_CLIENT_SECRET;
    delete process.env.CLOVER_USE_MOCK_CLIENT;
    const { default: cloverConfig } = await import('./clover.config');
    const config = cloverConfig();
    expect(config.useMockClient).toBe(true);
  });

  it('uses the real client when credentials are configured and mock is not forced', async () => {
    process.env.CLOVER_CLIENT_ID = 'test-client-id';
    process.env.CLOVER_CLIENT_SECRET = 'test-client-secret';
    delete process.env.CLOVER_USE_MOCK_CLIENT;
    const { default: cloverConfig } = await import('./clover.config');
    const config = cloverConfig();
    expect(config.useMockClient).toBe(false);
  });
});
