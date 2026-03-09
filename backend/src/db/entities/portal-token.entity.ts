import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('portal_tokens')
export class PortalToken extends BaseEntity {
  @Column({ unique: true })
  @Index()
  token!: string;

  @Column({ nullable: true })
  @Index()
  invoiceId?: string;

  @Column({ nullable: true })
  @Index()
  estimateId?: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ default: true })
  isActive!: boolean;
}
