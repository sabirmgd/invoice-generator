import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecurringService } from './recurring.service';
import { InvoicesService } from '../invoices/invoices.service';
import { EmailService } from '../email/email.service';
import { InvoiceStatus } from '../../db/entities/invoice.entity';

@Injectable()
export class RecurringScheduler {
  private readonly logger = new Logger(RecurringScheduler.name);

  constructor(
    private readonly recurringService: RecurringService,
    private readonly invoicesService: InvoicesService,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processRecurringInvoices() {
    this.logger.log('Processing recurring invoices...');

    const dueRecurring = await this.recurringService.findDueRecurring();
    this.logger.log(`Found ${dueRecurring.length} recurring invoices to process`);

    for (const recurring of dueRecurring) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const dueDate = this.recurringService.calculateNextRunDate(
          recurring.frequency,
          today,
        );

        const invoice = await this.invoicesService.create(recurring.ownerId, {
          senderProfileId: recurring.senderProfileId,
          clientProfileId: recurring.clientProfileId,
          bankProfileId: recurring.bankProfileId,
          issueDate: today,
          dueDate,
          currency: recurring.currency,
          taxRate: recurring.taxRate,
          notes: recurring.notes,
          items: recurring.items,
        });

        if (recurring.autoSendEmail && this.emailService.isConfigured()) {
          try {
            await this.emailService.sendInvoiceEmail(invoice);
            await this.invoicesService.updateStatus(
              recurring.ownerId,
              invoice.id,
              { status: InvoiceStatus.SENT },
            );
          } catch (emailError) {
            this.logger.warn(
              `Failed to send email for recurring ${recurring.id}: ${emailError}`,
            );
          }
        }

        await this.recurringService.updateAfterGeneration(
          recurring.id,
          recurring.frequency,
          recurring.nextRunDate!,
        );

        this.logger.log(
          `Generated invoice ${invoice.invoiceNumber} from recurring ${recurring.id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process recurring ${recurring.id}: ${error}`,
        );
      }
    }
  }
}
