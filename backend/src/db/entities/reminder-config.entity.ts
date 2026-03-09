import { Entity, Column, Index, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('reminder_configs')
export class ReminderConfig {
  @PrimaryColumn()
  @Index()
  ownerId!: string;

  @Column({ default: true })
  enableBeforeDue!: boolean;

  @Column({ type: 'int', default: 3 })
  daysBeforeDue!: number;

  @Column({ default: true })
  enableOnDue!: boolean;

  @Column({ default: true })
  enableOverdue!: boolean;

  @Column({ type: 'int', default: 1 })
  daysAfterDue!: number;

  @Column({ type: 'int', default: 3 })
  maxOverdueReminders!: number;

  // Late fees
  @Column({ default: false })
  enableLateFees!: boolean;

  @Column({ length: 10, default: 'percentage' })
  lateFeeType!: string; // 'percentage' | 'fixed'

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 5.0 })
  lateFeeValue!: number;

  @Column({ type: 'int', default: 0 })
  lateFeeGraceDays!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
