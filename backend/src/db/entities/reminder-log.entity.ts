import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum ReminderType {
  BEFORE_DUE = 'before_due',
  ON_DUE = 'on_due',
  OVERDUE = 'overdue',
}

@Entity('reminder_logs')
@Unique(['invoiceId', 'type'])
export class ReminderLog extends BaseEntity {
  @Column()
  @Index()
  ownerId!: string;

  @Column()
  @Index()
  invoiceId!: string;

  @Column({ type: 'enum', enum: ReminderType })
  type!: ReminderType;

  @Column({ nullable: true })
  emailLogId?: string;

  @Column({ type: 'timestamp' })
  sentAt!: Date;
}
