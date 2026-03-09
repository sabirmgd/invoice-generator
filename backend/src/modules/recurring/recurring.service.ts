import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RecurringInvoice,
  RecurringFrequency,
  RecurringStatus,
} from '../../db/entities/recurring-invoice.entity';
import { findOneOrFail } from '../../common/utils/find-one-or-fail.util';
import { paginate, PaginatedResult } from '../../common/utils/pagination.util';
import { AppException } from '../../common/exceptions/app.exception';

@Injectable()
export class RecurringService {
  constructor(
    @InjectRepository(RecurringInvoice)
    private readonly recurringRepo: Repository<RecurringInvoice>,
  ) {}

  async create(
    ownerId: string,
    dto: {
      name: string;
      frequency: RecurringFrequency;
      senderProfileId: string;
      clientProfileId: string;
      bankProfileId?: string;
      currency?: string;
      taxRate?: number;
      notes?: string;
      items: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        sortOrder?: number;
      }>;
      startDate: string;
      endDate?: string;
      autoSendEmail?: boolean;
    },
  ): Promise<RecurringInvoice> {
    const nextRunDate = dto.startDate;

    const recurring = this.recurringRepo.create({
      ownerId,
      ...dto,
      nextRunDate,
      status: RecurringStatus.ACTIVE,
    });

    return this.recurringRepo.save(recurring);
  }

  async findAll(
    ownerId: string,
    query: { page?: number; limit?: number },
  ): Promise<PaginatedResult<RecurringInvoice>> {
    const qb = this.recurringRepo
      .createQueryBuilder('rec')
      .where('rec.ownerId = :ownerId', { ownerId })
      .orderBy('rec.createdAt', 'DESC');

    return paginate(qb, { page: query.page || 1, limit: query.limit || 20 });
  }

  async findOne(ownerId: string, id: string): Promise<RecurringInvoice> {
    const record = await findOneOrFail(
      this.recurringRepo,
      'RecurringInvoice',
      id,
    );
    if (record.ownerId !== ownerId) {
      throw new AppException('Recurring invoice not found', HttpStatus.NOT_FOUND);
    }
    return record;
  }

  async pause(ownerId: string, id: string): Promise<RecurringInvoice> {
    const record = await this.findOne(ownerId, id);
    record.status = RecurringStatus.PAUSED;
    return this.recurringRepo.save(record);
  }

  async resume(ownerId: string, id: string): Promise<RecurringInvoice> {
    const record = await this.findOne(ownerId, id);
    record.status = RecurringStatus.ACTIVE;
    if (!record.nextRunDate) {
      record.nextRunDate = new Date().toISOString().split('T')[0];
    }
    return this.recurringRepo.save(record);
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const record = await this.findOne(ownerId, id);
    await this.recurringRepo.softRemove(record);
  }

  async findDueRecurring(): Promise<RecurringInvoice[]> {
    const today = new Date().toISOString().split('T')[0];

    return this.recurringRepo
      .createQueryBuilder('rec')
      .where('rec.status = :status', { status: RecurringStatus.ACTIVE })
      .andWhere('rec.nextRunDate <= :today', { today })
      .andWhere(
        '(rec.endDate IS NULL OR rec.endDate >= :today)',
        { today },
      )
      .getMany();
  }

  async updateAfterGeneration(
    id: string,
    frequency: RecurringFrequency,
    currentRunDate: string,
  ): Promise<void> {
    const nextRunDate = this.calculateNextRunDate(frequency, currentRunDate);
    await this.recurringRepo.update(id, {
      lastRunAt: new Date(),
      nextRunDate,
      invoicesGenerated: () => 'invoices_generated + 1',
    });
  }

  calculateNextRunDate(
    frequency: RecurringFrequency,
    currentDate: string,
  ): string {
    const date = new Date(currentDate);
    switch (frequency) {
      case RecurringFrequency.WEEKLY:
        date.setDate(date.getDate() + 7);
        break;
      case RecurringFrequency.MONTHLY:
        date.setMonth(date.getMonth() + 1);
        break;
      case RecurringFrequency.QUARTERLY:
        date.setMonth(date.getMonth() + 3);
        break;
      case RecurringFrequency.YEARLY:
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    return date.toISOString().split('T')[0];
  }
}
