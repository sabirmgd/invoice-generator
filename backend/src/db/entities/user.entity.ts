import { Entity, Column, Index } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from './base.entity';

export enum AuthProvider {
  GOOGLE = 'google',
  PASSWORD = 'password',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  @Index()
  firebaseUid!: string;

  @Column()
  email!: string;

  @Column({ nullable: true })
  displayName?: string;

  @Column({ type: 'enum', enum: AuthProvider })
  provider!: AuthProvider;

  @Column({ nullable: true })
  @Exclude()
  encryptedLlmKey?: string;

  @Column({ nullable: true })
  llmProvider?: string;
}
