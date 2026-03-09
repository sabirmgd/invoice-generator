import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Profile } from './profile.entity';
import { EstimateItem } from './estimate-item.entity';

export enum EstimateStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CONVERTED = 'converted',
}

@Entity('estimates')
@Index(
  'idx_estimates_owner_estimate_number_unique',
  ['ownerId', 'estimateNumber'],
  {
    unique: true,
  },
)
export class Estimate extends BaseEntity {
  @Column()
  @Index()
  ownerId!: string;

  @Column()
  estimateNumber!: string;

  @Column({
    type: 'enum',
    enum: EstimateStatus,
    default: EstimateStatus.DRAFT,
  })
  status!: EstimateStatus;

  // Profile references
  @Column()
  senderProfileId!: string;

  @ManyToOne(() => Profile, { eager: true })
  @JoinColumn({ name: 'sender_profile_id' })
  senderProfile!: Profile;

  @Column()
  clientProfileId!: string;

  @ManyToOne(() => Profile, { eager: true })
  @JoinColumn({ name: 'client_profile_id' })
  clientProfile!: Profile;

  @Column({ nullable: true })
  bankProfileId?: string;

  @ManyToOne(() => Profile, { eager: true, nullable: true })
  @JoinColumn({ name: 'bank_profile_id' })
  bankProfile?: Profile;

  // Dates
  @Column({ type: 'date' })
  issueDate!: string;

  @Column({ type: 'date' })
  validUntil!: string;

  // Money
  @Column({ length: 3, default: 'SAR' })
  currency!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 15.0 })
  taxRate!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total!: number;

  // Optional
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ nullable: true })
  pdfPath?: string;

  // Conversion tracking
  @Column({ nullable: true })
  convertedInvoiceId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  // Items
  @OneToMany(() => EstimateItem, (item) => item.estimate, {
    cascade: true,
    eager: true,
  })
  items!: EstimateItem[];
}
