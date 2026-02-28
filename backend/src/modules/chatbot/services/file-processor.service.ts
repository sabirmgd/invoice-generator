import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

@Injectable()
export class FileProcessorService {
  private readonly logger = new Logger(FileProcessorService.name);

  processFiles(files: Express.Multer.File[]): ContentBlock[] {
    const blocks: ContentBlock[] = [];

    for (const file of files) {
      try {
        const buffer = fs.readFileSync(file.path);
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${file.mimetype};base64,${base64}`;

        if (file.mimetype === 'application/pdf') {
          // PDFs sent as file data — the LLM reads them natively
          blocks.push({ type: 'image_url', image_url: { url: dataUrl } });
        } else if (file.mimetype.startsWith('image/')) {
          blocks.push({ type: 'image_url', image_url: { url: dataUrl } });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(`Error reading file ${file.originalname}: ${msg}`);
        blocks.push({
          type: 'text',
          text: `[Error reading file: ${file.originalname} — ${msg}]`,
        });
      }
    }

    return blocks;
  }

  cleanupFiles(files: Express.Multer.File[]): void {
    for (const file of files) {
      fs.unlink(file.path, (err) => {
        if (err) this.logger.warn(`Failed to delete temp file: ${file.path}`);
      });
    }
  }
}
