import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import type { Estimate } from './estimate.entity';
import { Exclude } from 'class-transformer';

@Entity('estimate_items')
export class EstimateItem extends BaseEntity {
  @Column()
  @Exclude()
  estimateId!: string;

  @ManyToOne('Estimate', 'items', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'estimate_id' })
  @Exclude()
  estimate!: Estimate;

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
