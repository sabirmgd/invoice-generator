import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import {
  HumanMessage,
  AIMessage,
  ToolMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ConfigService } from '@nestjs/config';
import { ChatMessage, ChatRole } from '../../db/entities/chat-message.entity';
import { SettingsService } from '../settings/settings.service';
import { AuthService } from '../auth/auth.service';
import { ChatToolsService } from './chat-tools.service';
import { PromptService } from './services/prompt.service';
import { FileProcessorService } from './services/file-processor.service';
import { StreamChunk } from './interfaces/stream-chunk.interface';

const MAX_TOOL_ROUNDS = 8;
const HISTORY_LIMIT = 20;

type LangChainMessage = SystemMessage | HumanMessage | AIMessage | ToolMessage;

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  private readonly serverAnthropicKey: string;

  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    private readonly configService: ConfigService,
    private readonly settingsService: SettingsService,
    private readonly authService: AuthService,
    private readonly chatTools: ChatToolsService,
    private readonly promptService: PromptService,
    private readonly fileProcessor: FileProcessorService,
  ) {
    this.serverAnthropicKey = this.configService.get<string>(
      'app.anthropicApiKey',
      '',
    );
  }

  async resolveApiKey(
    provider: string,
    bodyApiKey?: string,
    ownerId?: string,
    isAuthenticated?: boolean,
  ): Promise<{ apiKey: string; provider: string }> {
    // 1. BYOK: user-provided key takes priority
    if (bodyApiKey) {
      return { apiKey: bodyApiKey, provider };
    }
    // 2. Authenticated user with saved key
    if (isAuthenticated && ownerId) {
      const saved = await this.authService.getDecryptedLlmKey(ownerId);
      if (saved) return saved;
    }
    // 3. Server-side Anthropic key (no BYOK needed)
    if (this.serverAnthropicKey) {
      return { apiKey: this.serverAnthropicKey, provider: 'anthropic' };
    }
    throw new Error(
      'API key required — provide apiKey in body or save one via PATCH /auth/llm-key',
    );
  }

  private createModel(provider: string, apiKey: string): BaseChatModel {
    if (provider === 'anthropic') {
      return new ChatAnthropic({
        apiKey,
        model: 'claude-sonnet-4-5-20250929',
        maxTokens: 4096,
      });
    }
    return new ChatOpenAI({
      apiKey,
      model: 'gpt-4o',
      maxTokens: 4096,
    });
  }

  async *streamChat(
    ownerId: string,
    isAuthenticated: boolean,
    message: string,
    conversationId: string | undefined,
    provider: string,
    apiKey?: string,
    files?: Express.Multer.File[],
  ): AsyncGenerator<StreamChunk> {
    const convId = conversationId || uuid();

    await this.settingsService.ensureDefaults(ownerId);

    let resolved: { apiKey: string; provider: string };
    try {
      resolved = await this.resolveApiKey(
        provider,
        apiKey,
        ownerId,
        isAuthenticated,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      yield { type: 'error', message: msg };
      return;
    }

    // Save user message with file metadata if present
    const fileMetadata = files?.length
      ? {
          files: files.map((f) => ({
            filename: f.originalname,
            mimeType: f.mimetype,
            size: f.size,
          })),
        }
      : undefined;
    await this.saveMessage(
      ownerId,
      convId,
      ChatRole.USER,
      message,
      undefined,
      undefined,
      undefined,
      fileMetadata,
    );

    // Process uploaded files into LangChain content blocks
    let fileBlocks: { type: string; [key: string]: unknown }[] = [];
    if (files?.length) {
      for (const file of files) {
        yield {
          type: 'file_processing',
          filename: file.originalname,
          status: 'processing',
        };
      }
      fileBlocks = this.fileProcessor.processFiles(files);
      for (const file of files) {
        yield {
          type: 'file_processing',
          filename: file.originalname,
          status: 'done',
        };
      }
    }

    const history = await this.loadHistory(ownerId, convId);
    const systemPrompt = await this.promptService.buildSystemPrompt(ownerId);
    const messages: LangChainMessage[] = [
      new SystemMessage(systemPrompt),
      ...history.slice(0, -1).map((msg) => this.toLanguageMessage(msg)),
    ];

    // Build the current user message — multimodal if files were uploaded
    if (fileBlocks.length > 0) {
      messages.push(
        new HumanMessage({
          content: [{ type: 'text', text: message }, ...fileBlocks] as any,
        }),
      );
    } else {
      messages.push(new HumanMessage(message));
    }

    const tools = this.chatTools.buildTools(ownerId);
    const model = this.createModel(resolved.provider, resolved.apiKey);
    const modelWithTools = model.bindTools!(tools);

    let rounds = 0;
    while (rounds < MAX_TOOL_ROUNDS) {
      rounds++;

      let response: AIMessage;
      try {
        response = (await modelWithTools.invoke(messages)) as AIMessage;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(`LLM invoke error: ${msg}`);
        yield { type: 'error', message: `LLM error: ${msg}` };
        return;
      }

      const toolCalls = response.tool_calls ?? [];

      if (toolCalls.length === 0) {
        const text = this.extractTextContent(response);
        await this.saveMessage(ownerId, convId, ChatRole.ASSISTANT, text);
        yield { type: 'text', content: text };
        break;
      }

      await this.saveMessage(
        ownerId,
        convId,
        ChatRole.ASSISTANT,
        '',
        toolCalls as Record<string, unknown>[],
      );
      messages.push(response);

      for (const tc of toolCalls) {
        yield { type: 'tool_start', toolName: tc.name, toolCallId: tc.id! };

        let result: string;
        try {
          const tool = tools.find((t) => t.name === tc.name);
          if (!tool) throw new Error(`Unknown tool: ${tc.name}`);
          result = await tool.invoke(tc.args);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          result = JSON.stringify({ error: msg });
        }

        let parsedResult: unknown;
        try {
          parsedResult = JSON.parse(result);
        } catch {
          parsedResult = result;
        }
        yield {
          type: 'tool_result',
          toolName: tc.name,
          toolCallId: tc.id!,
          result: parsedResult,
        };

        await this.saveMessage(
          ownerId,
          convId,
          ChatRole.TOOL,
          result,
          undefined,
          tc.name,
          tc.id,
        );

        messages.push(
          new ToolMessage({
            content: result,
            tool_call_id: tc.id!,
          }),
        );
      }
    }

    yield { type: 'done', conversationId: convId };
  }

  async listConversations(ownerId: string) {
    const raw = await this.messageRepo
      .createQueryBuilder('m')
      .select('m.conversationId', 'conversationId')
      .addSelect('MIN(m.createdAt)', 'firstMessage')
      .addSelect('MAX(m.createdAt)', 'lastMessage')
      .addSelect('COUNT(*)', 'messageCount')
      .where('m.ownerId = :ownerId', { ownerId })
      .groupBy('m.conversationId')
      .orderBy('"lastMessage"', 'DESC')
      .getRawMany();

    return raw.map((r) => ({
      conversationId: r.conversationId,
      firstMessage: r.firstMessage,
      lastMessage: r.lastMessage,
      messageCount: parseInt(r.messageCount, 10),
    }));
  }

  async getConversation(ownerId: string, conversationId: string) {
    return this.messageRepo.find({
      where: { ownerId, conversationId },
      order: { createdAt: 'ASC' },
    });
  }

  async deleteConversation(ownerId: string, conversationId: string) {
    await this.messageRepo.delete({ ownerId, conversationId });
  }

  private extractTextContent(response: AIMessage): string {
    if (typeof response.content === 'string') return response.content;
    return (response.content as { type: string; text: string }[])
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('');
  }

  private toLanguageMessage(msg: ChatMessage): LangChainMessage {
    if (msg.role === ChatRole.USER) {
      const meta = msg.metadata as { files?: { filename: string }[] } | null;
      if (meta?.files?.length) {
        const refs = meta.files
          .map((f) => `[Attached: ${f.filename}]`)
          .join(', ');
        return new HumanMessage(`${msg.content}\n${refs}`);
      }
      return new HumanMessage(msg.content);
    }
    if (msg.role === ChatRole.TOOL) {
      return new ToolMessage({
        content: msg.content,
        tool_call_id: msg.toolCallId || '',
      });
    }
    // ChatRole.ASSISTANT
    if (msg.toolCalls && msg.toolCalls.length > 0) {
      return new AIMessage({
        content: msg.content || '',
        tool_calls: msg.toolCalls as any,
      });
    }
    return new AIMessage(msg.content);
  }

  private async saveMessage(
    ownerId: string,
    conversationId: string,
    role: ChatRole,
    content: string,
    toolCalls?: Record<string, unknown>[],
    toolName?: string,
    toolCallId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<ChatMessage> {
    const msg = this.messageRepo.create({
      ownerId,
      conversationId,
      role,
      content,
      toolCalls,
      toolName,
      toolCallId,
      metadata,
    });
    return this.messageRepo.save(msg);
  }

  private async loadHistory(
    ownerId: string,
    conversationId: string,
  ): Promise<ChatMessage[]> {
    const recent = await this.messageRepo.find({
      where: { ownerId, conversationId },
      order: { createdAt: 'DESC' },
      take: HISTORY_LIMIT,
    });
    return recent.reverse();
  }
}
