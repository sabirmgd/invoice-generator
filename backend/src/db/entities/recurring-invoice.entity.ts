import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum RecurringFrequency {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export enum RecurringStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
}

@Entity('recurring_invoices')
export class RecurringInvoice extends BaseEntity {
  @Column()
  @Index()
  ownerId!: string;

  @Column()
  name!: string;

  @Column({ type: 'enum', enum: RecurringStatus, default: RecurringStatus.ACTIVE })
  status!: RecurringStatus;

  @Column({ type: 'enum', enum: RecurringFrequency })
  frequency!: RecurringFrequency;

  @Column()
  senderProfileId!: string;

  @Column()
  clientProfileId!: string;

  @Column({ nullable: true })
  bankProfileId?: string;

  @Column({ length: 3, default: 'SAR' })
  currency!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 15.0 })
  taxRate!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb' })
  items!: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    sortOrder?: number;
  }>;

  @Column({ type: 'date' })
  startDate!: string;

  @Column({ type: 'date', nullable: true })
  endDate?: string;

  @Column({ type: 'date', nullable: true })
  nextRunDate?: string;

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt?: Date;

  @Column({ type: 'int', default: 0 })
  invoicesGenerated!: number;

  @Column({ default: true })
  autoSendEmail!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;
}
