import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;

/**
 * Encrypts/decrypts values at rest (currently: Clover OAuth access/refresh
 * tokens on CloverConnection - see SECURITY.md §3). Uses AES-256-GCM with a
 * random IV per value; ciphertext, IV, and auth tag are packed into a single
 * base64 string so it fits in a plain text database column.
 */
@Injectable()
export class EncryptionService implements OnModuleInit {
  private key!: Buffer;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const rawKey = this.configService.get<string>('security.tokenEncryptionKey');
    if (!rawKey) {
      throw new Error(
        'TOKEN_ENCRYPTION_KEY is not set. It is required to encrypt Clover OAuth tokens at rest.',
      );
    }
    // Accept any-length passphrase and derive a 32-byte key, so operators
    // aren't forced to generate an exact-length secret by hand.
    this.key = createHash('sha256').update(rawKey).digest();
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(IV_LENGTH_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(cipherText: string): string {
    const buffer = Buffer.from(cipherText, 'base64');
    const iv = buffer.subarray(0, IV_LENGTH_BYTES);
    const authTag = buffer.subarray(IV_LENGTH_BYTES, IV_LENGTH_BYTES + 16);
    const encrypted = buffer.subarray(IV_LENGTH_BYTES + 16);

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }
}
