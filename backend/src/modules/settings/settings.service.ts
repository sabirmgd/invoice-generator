import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '../../db/entities/setting.entity';
import { AppException } from '../../common/exceptions/app.exception';

const DEFAULT_SETTINGS: { key: string; value: string; description: string }[] =
  [
    {
      key: 'invoice_prefix',
      value: 'INV',
      description: 'Prefix for invoice numbers',
    },
    {
      key: 'invoice_next_number',
      value: '1',
      description: 'Next invoice sequence number',
    },
    { key: 'currency', value: 'SAR', description: 'Default currency code' },
    {
      key: 'tax_rate',
      value: '15',
      description: 'Default tax rate percentage',
    },
    {
      key: 'invoice_logo_data_url',
      value: '',
      description: 'Optional logo data URL for invoice header (PNG/JPG/WEBP)',
    },
    {
      key: 'estimate_prefix',
      value: 'EST',
      description: 'Prefix for estimate numbers',
    },
    {
      key: 'estimate_next_number',
      value: '1',
      description: 'Next estimate sequence number',
    },
  ];

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly repo: Repository<Setting>,
  ) {}

  /** Seed default settings for a new owner if they don't exist yet */
  async ensureDefaults(ownerId: string): Promise<void> {
    const existing = await this.repo.findBy({ ownerId });
    if (existing.length > 0) return;
    try {
      const seeds = DEFAULT_SETTINGS.map((s) =>
        this.repo.create({ ...s, ownerId }),
      );
      await this.repo.save(seeds);
    } catch {
      // Ignore PK violation from concurrent requests — seeds already exist
    }
  }

  findAll(ownerId: string): Promise<Setting[]> {
    return this.repo.find({
      where: { ownerId },
      order: { key: 'ASC' },
    });
  }

  async findByKey(ownerId: string, key: string): Promise<Setting> {
    const setting = await this.repo.findOneBy({ ownerId, key });
    if (!setting) {
      throw new AppException(
        `Setting "${key}" not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    return setting;
  }

  async update(ownerId: string, key: string, value: string): Promise<Setting> {
    let setting = await this.repo.findOneBy({ ownerId, key });
    if (setting) {
      setting.value = value;
    } else {
      setting = this.repo.create({ ownerId, key, value, description: '' });
    }
    return this.repo.save(setting);
  }

  async getValue(
    ownerId: string,
    key: string,
    fallback: string = '',
  ): Promise<string> {
    const setting = await this.repo.findOneBy({ ownerId, key });
    return setting?.value ?? fallback;
  }
}
