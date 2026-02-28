import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ChatbotService } from './chatbot.service';
import { SendMessageDto } from './dto/chat-message.dto';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { OwnerId } from '../auth/decorators/owner-id.decorator';
import { RequestContext } from '../auth/interfaces/request-context';

@ApiTags('Chat')
@Controller('api/v1/chat')
@UseGuards(OptionalAuthGuard)
export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);

  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('stream')
  @ApiOperation({ summary: 'Send a message and stream the response via SSE' })
  async stream(
    @OwnerId() ownerId: string,
    @Req() req: { requestContext: RequestContext },
    @Res() res: Response,
    @Body() dto: SendMessageDto,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      const stream = this.chatbotService.streamChat(
        ownerId,
        req.requestContext.isAuthenticated,
        dto.message,
        dto.conversationId,
        dto.provider,
        dto.apiKey,
      );

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Chat stream error: ${message}`, err instanceof Error ? err.stack : undefined);
      res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
    }

    res.end();
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List conversations for the current owner' })
  listConversations(@OwnerId() ownerId: string) {
    return this.chatbotService.listConversations(ownerId);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  getConversation(
    @OwnerId() ownerId: string,
    @Param('id') conversationId: string,
  ) {
    return this.chatbotService.getConversation(ownerId, conversationId);
  }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a conversation' })
  deleteConversation(
    @OwnerId() ownerId: string,
    @Param('id') conversationId: string,
  ) {
    return this.chatbotService.deleteConversation(ownerId, conversationId);
  }
}
