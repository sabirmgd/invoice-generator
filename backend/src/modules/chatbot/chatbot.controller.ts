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
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { ChatbotService } from './chatbot.service';
import { SendMessageDto } from './dto/chat-message.dto';
import { FileProcessorService } from './services/file-processor.service';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { OwnerId } from '../auth/decorators/owner-id.decorator';
import { RequestContext } from '../auth/interfaces/request-context';

const UPLOAD_DIR = '/tmp/chat-uploads';
const ALLOWED_MIMES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@ApiTags('Chat')
@Controller('api/v1/chat')
@UseGuards(OptionalAuthGuard)
export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);

  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly fileProcessor: FileProcessorService,
  ) {}

  @Post('stream')
  @ApiOperation({
    summary:
      'Send a message (with optional file attachments) and stream the response via SSE',
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          fs.mkdirSync(UPLOAD_DIR, { recursive: true });
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname);
          cb(null, `${uuidv4()}${ext}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE, files: 5 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIMES.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              `File type ${file.mimetype} not allowed. Allowed: PDF, PNG, JPG, WEBP`,
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async stream(
    @OwnerId() ownerId: string,
    @Req() req: { requestContext: RequestContext },
    @Res() res: Response,
    @Body() dto: SendMessageDto,
    @UploadedFiles() files?: Express.Multer.File[],
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
        files?.length ? files : undefined,
      );

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(
        `Chat stream error: ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
      res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
    } finally {
      if (files?.length) {
        this.fileProcessor.cleanupFiles(files);
      }
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
