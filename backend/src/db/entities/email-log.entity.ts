import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum EmailStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

export enum EmailType {
  INVOICE = 'invoice',
  REMINDER = 'reminder',
  RECEIPT = 'receipt',
  ESTIMATE = 'estimate',
}

@Entity('email_logs')
export class EmailLog extends BaseEntity {
  @Column()
  @Index()
  ownerId!: string;

  @Column({ nullable: true })
  invoiceId?: string;

  @Column({ nullable: true })
  estimateId?: string;

  @Column()
  recipient!: string;

  @Column()
  subject!: string;

  @Column({ type: 'enum', enum: EmailType })
  type!: EmailType;

  @Column({ type: 'enum', enum: EmailStatus, default: EmailStatus.PENDING })
  status!: EmailStatus;

  @Column({ nullable: true })
  resendMessageId?: string;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;
}
