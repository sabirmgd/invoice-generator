import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { PortalToken } from '../../db/entities/portal-token.entity';

@Injectable()
export class PortalService {
  constructor(
    @InjectRepository(PortalToken)
    private readonly tokenRepo: Repository<PortalToken>,
  ) {}

  async generateToken(
    invoiceId: string,
    expiresInDays?: number,
  ): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    await this.tokenRepo.save({ token, invoiceId, expiresAt });
    return token;
  }

  async validateToken(
    token: string,
  ): Promise<{ valid: boolean; invoiceId?: string }> {
    const record = await this.tokenRepo.findOne({
      where: { token, isActive: true },
    });

    if (!record) {
      return { valid: false };
    }

    if (record.expiresAt && new Date() > record.expiresAt) {
      return { valid: false };
    }

    return { valid: true, invoiceId: record.invoiceId };
  }

  async getOrCreateToken(invoiceId: string): Promise<string> {
    const existing = await this.tokenRepo.findOne({
      where: { invoiceId, isActive: true },
    });

    if (existing) {
      if (!existing.expiresAt || new Date() < existing.expiresAt) {
        return existing.token;
      }
    }

    return this.generateToken(invoiceId);
  }
}
