import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  function buildService(key = 'a-test-encryption-key-value'): EncryptionService {
    const configService = {
      get: jest.fn().mockReturnValue(key),
    } as unknown as ConfigService;
    const service = new EncryptionService(configService);
    service.onModuleInit();
    return service;
  }

  it('round-trips plaintext through encrypt/decrypt', () => {
    const service = buildService();
    const plainText = 'clover-access-token-value-12345';

    const cipherText = service.encrypt(plainText);
    expect(cipherText).not.toContain(plainText);

    const decrypted = service.decrypt(cipherText);
    expect(decrypted).toBe(plainText);
  });

  it('produces different ciphertext for the same plaintext (random IV)', () => {
    const service = buildService();
    const a = service.encrypt('same-value');
    const b = service.encrypt('same-value');
    expect(a).not.toBe(b);
  });

  it('throws during init if TOKEN_ENCRYPTION_KEY is missing', () => {
    const configService = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
    const service = new EncryptionService(configService);
    expect(() => service.onModuleInit()).toThrow(/TOKEN_ENCRYPTION_KEY/);
  });

  it('fails to decrypt with a different key', () => {
    const serviceA = buildService('key-one');
    const serviceB = buildService('key-two');
    const cipherText = serviceA.encrypt('secret-value');
    expect(() => serviceB.decrypt(cipherText)).toThrow();
  });
});
