import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import {
  EmailLog,
  EmailStatus,
  EmailType,
} from '../../db/entities/email-log.entity';
import { Invoice } from '../../db/entities/invoice.entity';
import { PdfService } from '../pdf/pdf.service';
import { getCurrencyInfo } from '../../common/constants/currencies';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private configured = false;

  constructor(
    @InjectRepository(EmailLog)
    private readonly emailLogRepo: Repository<EmailLog>,
    private readonly configService: ConfigService,
    private readonly pdfService: PdfService,
  ) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.configured = true;
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async sendInvoiceEmail(
    invoice: Invoice,
    recipientOverride?: string,
  ): Promise<EmailLog> {
    const recipient = recipientOverride || invoice.clientProfile?.email;

    if (!recipient) {
      throw new Error('No recipient email available');
    }

    if (!this.configured) {
      throw new Error(
        'SendGrid is not configured. Set SENDGRID_API_KEY in environment.',
      );
    }

    const pdfBuffer = await this.pdfService.generateInvoicePdf(invoice);

    const senderName =
      invoice.senderProfile?.companyName || invoice.senderProfile?.name || '';
    const fromEmail = this.configService.get<string>(
      'SENDGRID_FROM_EMAIL',
      'invoices@example.com',
    );
    const subject = `Invoice ${invoice.invoiceNumber} from ${senderName}`;

    const log = this.emailLogRepo.create({
      ownerId: invoice.ownerId,
      invoiceId: invoice.id,
      recipient,
      subject,
      type: EmailType.INVOICE,
      status: EmailStatus.PENDING,
    });

    try {
      const [response] = await sgMail.send({
        to: recipient,
        from: { email: fromEmail, name: senderName || 'Invo' },
        subject,
        html: this.buildInvoiceEmailHtml(invoice),
        attachments: [
          {
            content: pdfBuffer.toString('base64'),
            filename: `${invoice.invoiceNumber}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment',
          },
        ],
      });

      log.status = EmailStatus.SENT;
      log.resendMessageId = response?.headers?.['x-message-id'] as string;
    } catch (error) {
      log.status = EmailStatus.FAILED;
      log.errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send invoice email: ${log.errorMessage}`);
    }

    return this.emailLogRepo.save(log);
  }

  async sendReminderEmail(
    invoice: Invoice,
    reminderType: 'before_due' | 'on_due' | 'overdue',
    portalUrl?: string,
  ): Promise<EmailLog> {
    const recipient = invoice.clientProfile?.email;

    if (!recipient) {
      throw new Error('No recipient email available');
    }

    if (!this.configured) {
      throw new Error('SendGrid is not configured');
    }

    const senderName =
      invoice.senderProfile?.companyName || invoice.senderProfile?.name || '';
    const fromEmail = this.configService.get<string>(
      'SENDGRID_FROM_EMAIL',
      'invoices@example.com',
    );
    const subjectMap = {
      before_due: `Reminder: Invoice ${invoice.invoiceNumber} is due soon`,
      on_due: `Invoice ${invoice.invoiceNumber} is due today`,
      overdue: `Overdue: Invoice ${invoice.invoiceNumber} requires attention`,
    };

    const log = this.emailLogRepo.create({
      ownerId: invoice.ownerId,
      invoiceId: invoice.id,
      recipient,
      subject: subjectMap[reminderType],
      type: EmailType.REMINDER,
      status: EmailStatus.PENDING,
    });

    try {
      const [response] = await sgMail.send({
        to: recipient,
        from: { email: fromEmail, name: senderName || 'Invo' },
        subject: log.subject,
        html: this.buildReminderEmailHtml(
          invoice,
          reminderType,
          senderName,
          portalUrl,
        ),
      });

      log.status = EmailStatus.SENT;
      log.resendMessageId = response?.headers?.['x-message-id'] as string;
    } catch (error) {
      log.status = EmailStatus.FAILED;
      log.errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send reminder email: ${log.errorMessage}`);
    }

    return this.emailLogRepo.save(log);
  }

  private buildInvoiceEmailHtml(invoice: Invoice): string {
    const senderName =
      invoice.senderProfile?.companyName || invoice.senderProfile?.name || '';
    const clientName =
      invoice.clientProfile?.companyName || invoice.clientProfile?.name || '';
    const info = getCurrencyInfo(invoice.currency);
    const totalFormatted = `${info.symbol} ${Number(invoice.total).toFixed(info.decimals)}`;

    return `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background: #f5f5f0; }
  .container { max-width: 600px; margin: 0 auto; padding: 32px 20px; }
  .card { background: #ffffff; border-radius: 12px; padding: 32px; }
  .header { margin-bottom: 24px; }
  .header h1 { font-size: 24px; margin: 0 0 4px; color: #1a1a1a; }
  .header p { color: #6b6b66; margin: 0; font-size: 14px; }
  .details { background: #f5f5f0; border-radius: 8px; padding: 16px; margin: 20px 0; }
  .details-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
  .details-label { color: #6b6b66; }
  .details-value { font-weight: 600; }
  .total-row { border-top: 1px solid #e5e5e0; margin-top: 8px; padding-top: 12px; font-size: 18px; }
  .footer { text-align: center; color: #6b6b66; font-size: 12px; padding-top: 24px; }
</style>
</head>
<body>
<div class="container">
  <div class="card">
    <div class="header">
      <h1>Invoice from ${senderName}</h1>
      <p>Invoice ${invoice.invoiceNumber}</p>
    </div>
    <p>Dear ${clientName},</p>
    <p>Please find attached invoice <strong>${invoice.invoiceNumber}</strong> for your review.</p>
    <div class="details">
      <div class="details-row">
        <span class="details-label">Invoice Number</span>
        <span class="details-value">${invoice.invoiceNumber}</span>
      </div>
      <div class="details-row">
        <span class="details-label">Issue Date</span>
        <span class="details-value">${invoice.issueDate}</span>
      </div>
      <div class="details-row">
        <span class="details-label">Due Date</span>
        <span class="details-value">${invoice.dueDate}</span>
      </div>
      <div class="details-row total-row">
        <span class="details-label">Total Amount</span>
        <span class="details-value">${totalFormatted}</span>
      </div>
    </div>
    <p>The complete invoice is attached as a PDF.</p>
    <p>Thank you for your business!</p>
  </div>
  <div class="footer">
    <p>Generated with Invo</p>
  </div>
</div>
</body>
</html>`;
  }

  private buildReminderEmailHtml(
    invoice: Invoice,
    type: string,
    senderName: string,
    portalUrl?: string,
  ): string {
    const clientName =
      invoice.clientProfile?.companyName || invoice.clientProfile?.name || '';
    const info = getCurrencyInfo(invoice.currency);
    const totalFormatted = `${info.symbol} ${Number(invoice.total).toFixed(info.decimals)}`;
    const hasLateFee = invoice.lateFeeAmount != null && Number(invoice.lateFeeAmount) > 0;
    const lateFeeFormatted = hasLateFee
      ? `${info.symbol} ${Number(invoice.lateFeeAmount).toFixed(info.decimals)}`
      : '';
    const totalDueFormatted = hasLateFee
      ? `${info.symbol} ${(Number(invoice.total) + Number(invoice.lateFeeAmount)).toFixed(info.decimals)}`
      : totalFormatted;
    const lateFeeNote = hasLateFee
      ? ` A late fee of <strong>${lateFeeFormatted}</strong> has been applied, bringing the total due to <strong>${totalDueFormatted}</strong>.`
      : '';

    const messageMap: Record<string, string> = {
      before_due: `This is a friendly reminder that invoice <strong>${invoice.invoiceNumber}</strong> for <strong>${totalFormatted}</strong> is due on <strong>${invoice.dueDate}</strong>.`,
      on_due: `Invoice <strong>${invoice.invoiceNumber}</strong> for <strong>${totalFormatted}</strong> is due today.`,
      overdue: `Invoice <strong>${invoice.invoiceNumber}</strong> for <strong>${totalFormatted}</strong> was due on <strong>${invoice.dueDate}</strong> and is now overdue. Please arrange payment at your earliest convenience.${lateFeeNote}`,
    };

    const payButton = portalUrl
      ? `<p style="text-align: center; margin: 24px 0;"><a href="${portalUrl}" style="background: #2D5BFF; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View & Pay Invoice</a></p>`
      : '';

    return `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background: #f5f5f0; }
  .container { max-width: 600px; margin: 0 auto; padding: 32px 20px; }
  .card { background: #ffffff; border-radius: 12px; padding: 32px; }
  .footer { text-align: center; color: #6b6b66; font-size: 12px; padding-top: 24px; }
</style>
</head>
<body>
<div class="container">
  <div class="card">
    <h1 style="font-size: 20px; margin: 0 0 16px;">Payment Reminder</h1>
    <p>Dear ${clientName},</p>
    <p>${messageMap[type] || messageMap['before_due']}</p>
    ${payButton}
    <p>If you have already made payment, please disregard this notice.</p>
    <p>Best regards,<br>${senderName}</p>
  </div>
  <div class="footer">
    <p>Generated with Invo</p>
  </div>
</div>
</body>
</html>`;
  }
}
