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
import { InvoiceItem } from './invoice-item.entity';

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('invoices')
@Index(
  'idx_invoices_owner_invoice_number_unique',
  ['ownerId', 'invoiceNumber'],
  {
    unique: true,
  },
)
export class Invoice extends BaseEntity {
  @Column()
  @Index()
  ownerId!: string;

  @Column()
  invoiceNumber!: string;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status!: InvoiceStatus;

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
  dueDate!: string;

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

  // Stripe payment
  @Column({ nullable: true })
  stripeCheckoutSessionId?: string;

  @Column({ nullable: true })
  stripePaymentIntentId?: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  // Late fees
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  lateFeeAmount?: number;

  @Column({ type: 'timestamp', nullable: true })
  lateFeeAppliedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  // Items
  @OneToMany(() => InvoiceItem, (item) => item.invoice, {
    cascade: true,
    eager: true,
  })
  items!: InvoiceItem[];
}
