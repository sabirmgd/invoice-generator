import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RemindersService } from './reminders.service';
import { InvoicesService } from '../invoices/invoices.service';
import { EmailService } from '../email/email.service';
import { PortalService } from '../portal/portal.service';
import { ReminderType } from '../../db/entities/reminder-log.entity';
import { InvoiceStatus, Invoice } from '../../db/entities/invoice.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RemindersScheduler {
  private readonly logger = new Logger(RemindersScheduler.name);

  constructor(
    private readonly remindersService: RemindersService,
    private readonly invoicesService: InvoicesService,
    private readonly emailService: EmailService,
    private readonly portalService: PortalService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 9 * * *') // 9 AM daily
  async processReminders() {
    this.logger.log('Processing invoice reminders and late fees...');

    const configs = await this.remindersService.getAllConfigs();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const config of configs) {
      try {
        const result = await this.invoicesService.findAll(config.ownerId, {
          status: InvoiceStatus.SENT,
          page: 1,
          limit: 100,
        });

        for (const invoice of result.items) {
          // Apply late fees (runs even without email configured)
          await this.applyLateFeeIfNeeded(invoice, config, today);

          // Send email reminders (only if email is configured)
          if (this.emailService.isConfigured()) {
            await this.checkAndSendReminders(invoice, config, today);
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to process reminders for owner ${config.ownerId}: ${error}`,
        );
      }
    }
  }

  private async applyLateFeeIfNeeded(
    invoice: Invoice,
    config: { ownerId: string; enableLateFees: boolean; lateFeeType: string; lateFeeValue: number; lateFeeGraceDays: number },
    today: Date,
  ) {
    if (!config.enableLateFees) return;
    if (invoice.lateFeeAmount != null) return; // Already applied

    const dueDate = new Date(invoice.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const daysOverdue = Math.ceil(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysOverdue < config.lateFeeGraceDays) return;

    const total = Number(invoice.total);
    const feeAmount =
      config.lateFeeType === 'percentage'
        ? total * (Number(config.lateFeeValue) / 100)
        : Number(config.lateFeeValue);

    const roundedFee = Math.round(feeAmount * 100) / 100;
    if (roundedFee <= 0) return;

    try {
      await this.invoicesService.applyLateFee(config.ownerId, invoice.id, roundedFee);
      this.logger.log(
        `Applied late fee of ${roundedFee} to invoice ${invoice.invoiceNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to apply late fee to ${invoice.invoiceNumber}: ${error}`,
      );
    }
  }

  private async checkAndSendReminders(
    invoice: Invoice,
    config: {
      ownerId: string;
      enableBeforeDue: boolean;
      daysBeforeDue: number;
      enableOnDue: boolean;
      enableOverdue: boolean;
      daysAfterDue: number;
    },
    today: Date,
  ) {
    const dueDate = new Date(invoice.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.ceil(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Before due reminder
    if (
      config.enableBeforeDue &&
      daysUntilDue === config.daysBeforeDue
    ) {
      await this.sendIfNotSent(
        invoice,
        ReminderType.BEFORE_DUE,
        'before_due',
      );
    }

    // On due date
    if (config.enableOnDue && daysUntilDue === 0) {
      await this.sendIfNotSent(invoice, ReminderType.ON_DUE, 'on_due');
    }

    // Overdue
    if (
      config.enableOverdue &&
      daysUntilDue < 0 &&
      Math.abs(daysUntilDue) >= config.daysAfterDue
    ) {
      await this.sendIfNotSent(invoice, ReminderType.OVERDUE, 'overdue');
    }
  }

  private async sendIfNotSent(
    invoice: Invoice,
    type: ReminderType,
    emailType: 'before_due' | 'on_due' | 'overdue',
  ) {
    const alreadySent = await this.remindersService.hasReminderBeenSent(
      invoice.id,
      type,
    );
    if (alreadySent) return;

    try {
      // Generate portal URL for pay button
      let portalUrl: string | undefined;
      try {
        const token = await this.portalService.getOrCreateToken(invoice.id);
        const baseUrl = this.configService.get<string>(
          'STRIPE_SUCCESS_URL',
          'http://localhost:3000/portal/{token}',
        );
        portalUrl = baseUrl
          .replace('{token}', token)
          .replace('?payment=success', '');
      } catch {
        // Portal not critical
      }

      const emailLog = await this.emailService.sendReminderEmail(
        invoice,
        emailType,
        portalUrl,
      );

      await this.remindersService.logReminder(
        invoice.ownerId,
        invoice.id,
        type,
        emailLog.id,
      );

      this.logger.log(
        `Sent ${emailType} reminder for invoice ${invoice.invoiceNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send ${emailType} reminder for ${invoice.invoiceNumber}: ${error}`,
      );
    }
  }
}
