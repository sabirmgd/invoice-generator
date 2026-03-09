import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReminderConfig } from '../../db/entities/reminder-config.entity';
import { ReminderLog } from '../../db/entities/reminder-log.entity';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';
import { RemindersScheduler } from './reminders.scheduler';
import { InvoicesModule } from '../invoices/invoices.module';
import { EmailModule } from '../email/email.module';
import { PortalModule } from '../portal/portal.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReminderConfig, ReminderLog]),
    InvoicesModule,
    EmailModule,
    PortalModule,
  ],
  controllers: [RemindersController],
  providers: [RemindersService, RemindersScheduler],
  exports: [RemindersService],
})
export class RemindersModule {}
