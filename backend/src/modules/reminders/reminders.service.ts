import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReminderConfig } from '../../db/entities/reminder-config.entity';
import { ReminderLog, ReminderType } from '../../db/entities/reminder-log.entity';

@Injectable()
export class RemindersService {
  constructor(
    @InjectRepository(ReminderConfig)
    private readonly configRepo: Repository<ReminderConfig>,
    @InjectRepository(ReminderLog)
    private readonly logRepo: Repository<ReminderLog>,
  ) {}

  async getConfig(ownerId: string): Promise<ReminderConfig> {
    let config = await this.configRepo.findOne({ where: { ownerId } });
    if (!config) {
      config = this.configRepo.create({ ownerId });
      config = await this.configRepo.save(config);
    }
    return config;
  }

  async updateConfig(
    ownerId: string,
    dto: Partial<Omit<ReminderConfig, 'ownerId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<ReminderConfig> {
    let config = await this.configRepo.findOne({ where: { ownerId } });
    if (!config) {
      config = this.configRepo.create({ ownerId, ...dto });
    } else {
      Object.assign(config, dto);
    }
    return this.configRepo.save(config);
  }

  async getAllConfigs(): Promise<ReminderConfig[]> {
    return this.configRepo.find();
  }

  async hasReminderBeenSent(
    invoiceId: string,
    type: ReminderType,
  ): Promise<boolean> {
    const count = await this.logRepo.count({
      where: { invoiceId, type },
    });
    return count > 0;
  }

  async logReminder(
    ownerId: string,
    invoiceId: string,
    type: ReminderType,
    emailLogId?: string,
  ): Promise<ReminderLog> {
    const log = this.logRepo.create({
      ownerId,
      invoiceId,
      type,
      emailLogId,
      sentAt: new Date(),
    });
    return this.logRepo.save(log);
  }
}
