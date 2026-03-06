import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHmac,
} from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly masterKey: Buffer;

  constructor(private readonly config: ConfigService) {
    const hex = this.config.get<string>('ENCRYPTION_MASTER_KEY', '');
    this.masterKey = hex ? Buffer.from(hex, 'hex') : randomBytes(32); // fallback for dev without key configured
  }

  /** Derive a unique 256-bit key per user via HMAC-based KDF */
  private deriveKey(userId: string): Buffer {
    return createHmac('sha256', this.masterKey).update(userId).digest();
  }

  /** Encrypt plaintext → "iv:tag:ciphertext" (all base64) */
  encrypt(plaintext: string, userId: string): string {
    const key = this.deriveKey(userId);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
      iv.toString('base64'),
      tag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  /** Decrypt "iv:tag:ciphertext" back to plaintext */
  decrypt(encrypted: string, userId: string): string {
    const key = this.deriveKey(userId);
    const [ivB64, tagB64, dataB64] = encrypted.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      'utf8',
    );
  }
}
