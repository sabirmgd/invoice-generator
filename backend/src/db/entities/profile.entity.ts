import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum ProfileType {
  SENDER = 'sender',
  CLIENT = 'client',
  BANK = 'bank',
}

@Entity('profiles')
export class Profile extends BaseEntity {
  @Column()
  @Index()
  ownerId!: string;

  @Column({ type: 'enum', enum: ProfileType })
  type!: ProfileType;

  @Column()
  name!: string;

  @Column({ default: false })
  isDefault!: boolean;

  // Contact info (sender/client)
  @Column({ nullable: true })
  companyName?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  taxId?: string;

  // Address (sender/client)
  @Column({ nullable: true })
  addressLine1?: string;

  @Column({ nullable: true })
  addressLine2?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  state?: string;

  @Column({ nullable: true })
  postalCode?: string;

  @Column({ nullable: true })
  country?: string;

  // Bank info
  @Column({ nullable: true })
  bankName?: string;

  @Column({ nullable: true })
  iban?: string;

  @Column({ nullable: true })
  swiftCode?: string;

  @Column({ nullable: true })
  accountHolder?: string;

  // Flexible extra data
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;
}
