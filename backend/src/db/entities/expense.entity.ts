import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum ExpenseCategory {
  OFFICE = 'office',
  TRAVEL = 'travel',
  SOFTWARE = 'software',
  MARKETING = 'marketing',
  SALARY = 'salary',
  UTILITIES = 'utilities',
  EQUIPMENT = 'equipment',
  MEALS = 'meals',
  PROFESSIONAL_SERVICES = 'professional_services',
  OTHER = 'other',
}

@Entity('expenses')
export class Expense extends BaseEntity {
  @Column()
  @Index()
  ownerId!: string;

  @Column({ type: 'enum', enum: ExpenseCategory })
  category!: ExpenseCategory;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ length: 3, default: 'SAR' })
  currency!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ nullable: true })
  vendor?: string;

  @Column({ nullable: true })
  receiptUrl?: string;

  @Column({ default: true })
  taxDeductible!: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;
}
