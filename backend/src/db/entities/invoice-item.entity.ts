import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import type { Invoice } from './invoice.entity';
import { Exclude } from 'class-transformer';

@Entity('invoice_items')
export class InvoiceItem extends BaseEntity {
  @Column()
  @Exclude()
  invoiceId!: string;

  @ManyToOne('Invoice', 'items', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invoice_id' })
  @Exclude()
  invoice!: Invoice;

  @Column()
  description!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unitPrice!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;
}
