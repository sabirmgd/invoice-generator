import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from '../../db/entities/chat-message.entity';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ChatToolsService } from './chat-tools.service';
import { ContextService } from './services/context.service';
import { PromptService } from './services/prompt.service';
import { SettingsModule } from '../settings/settings.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage]),
    SettingsModule,
    ProfilesModule,
    InvoicesModule,
  ],
  controllers: [ChatbotController],
  providers: [ChatbotService, ChatToolsService, ContextService, PromptService],
})
export class ChatbotModule {}
