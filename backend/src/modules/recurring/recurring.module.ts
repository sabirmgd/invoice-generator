import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecurringInvoice } from '../../db/entities/recurring-invoice.entity';
import { RecurringController } from './recurring.controller';
import { RecurringService } from './recurring.service';
import { RecurringScheduler } from './recurring.scheduler';
import { InvoicesModule } from '../invoices/invoices.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecurringInvoice]),
    InvoicesModule,
    EmailModule,
  ],
  controllers: [RecurringController],
  providers: [RecurringService, RecurringScheduler],
  exports: [RecurringService],
})
export class RecurringModule {}
