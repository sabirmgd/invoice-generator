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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
