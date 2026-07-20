import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * Thin wrapper around argon2 so the rest of the codebase never imports the
 * hashing library directly (makes it easy to audit / swap later). Uses
 * argon2id, the variant recommended by OWASP for password hashing.
 */
@Injectable()
export class PasswordService {
  hash(plainTextPassword: string): Promise<string> {
    return argon2.hash(plainTextPassword, { type: argon2.argon2id });
  }

  verify(hash: string, plainTextPassword: string): Promise<boolean> {
    return argon2.verify(hash, plainTextPassword);
  }
}
