import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EmailLog } from '../../db/entities/email-log.entity';
import { EmailService } from './email.service';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [TypeOrmModule.forFeature([EmailLog]), ConfigModule, PdfModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
