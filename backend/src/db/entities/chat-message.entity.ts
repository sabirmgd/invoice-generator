import { Entity, Column, Index, CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

export enum ChatRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool',
}

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  ownerId!: string;

  @Column()
  @Index()
  conversationId!: string;

  @Column({ type: 'enum', enum: ChatRole })
  role!: ChatRole;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'jsonb', nullable: true })
  toolCalls?: Record<string, unknown>[];

  @Column({ nullable: true })
  toolName?: string;

  @Column({ nullable: true })
  toolCallId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;
}
