import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { Invoice } from '../../db/entities/invoice.entity';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class PdfService {
  private readonly outputDir: string;

  constructor(
    private readonly config: ConfigService,
    private readonly settingsService: SettingsService,
  ) {
    this.outputDir = this.config.get<string>(
      'app.pdfOutputDir',
      './generated/invoices',
    );
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  async generateInvoicePdf(invoice: Invoice): Promise<string> {
    const filename = `${invoice.invoiceNumber}.pdf`;
    const filePath = path.resolve(this.outputDir, filename);
    const logoDataUrl = await this.settingsService.getValue(
      invoice.ownerId,
      'invoice_logo_data_url',
      '',
    );

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Ensure stable white background across PDF viewers.
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff');

      const partiesStartY = this.drawHeader(doc, invoice, logoDataUrl);
      const partiesBottomY = this.drawParties(doc, invoice, partiesStartY);
      const tableTop = Math.max(310, partiesBottomY + 24);
      const tableBottomY = this.drawItemsTable(doc, invoice, tableTop);
      const totalsBottomY = this.drawTotals(doc, invoice, tableBottomY + 14);
      const bankBottomY = this.drawBankDetails(
        doc,
        invoice,
        totalsBottomY + 16,
      );
      this.drawNotes(doc, invoice, bankBottomY + 14);
      this.drawFooter(doc);

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  private drawHeader(
    doc: InstanceType<typeof PDFDocument>,
    invoice: Invoice,
    logoDataUrl?: string,
  ): number {
    let hasLogo = false;
    const logoBuffer = this.decodeLogoDataUrl(logoDataUrl);
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 50, 42, { fit: [140, 52], valign: 'center' });
        hasLogo = true;
      } catch {
        hasLogo = false;
      }
    }

    const titleY = hasLogo ? 102 : 50;

    // Invoice title
    doc
      .fillColor('#111827')
      .fontSize(30)
      .font('Helvetica-Bold')
      .text('INVOICE', 50, titleY);

    // Invoice details on the right
    const rightX = 350;
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#374151')
      .text(`Invoice #: ${invoice.invoiceNumber}`, rightX, 50, {
        align: 'right',
      })
      .text(`Status: ${invoice.status.toUpperCase()}`, rightX, 65, {
        align: 'right',
      })
      .text(`Issue Date: ${invoice.issueDate}`, rightX, 80, {
        align: 'right',
      })
      .text(`Due Date: ${invoice.dueDate}`, rightX, 95, { align: 'right' });

    // Divider line
    const dividerY = hasLogo ? 136 : 120;
    doc
      .moveTo(50, dividerY)
      .lineTo(545, dividerY)
      .strokeColor('#d1d5db')
      .lineWidth(1)
      .stroke();

    return dividerY + 18;
  }

  private drawParties(
    doc: InstanceType<typeof PDFDocument>,
    invoice: Invoice,
    y: number,
  ): number {
    const sender = invoice.senderProfile;
    const client = invoice.clientProfile;

    // From
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('From:', 50, y);
    doc.fontSize(10).font('Helvetica');
    let fromY = y + 15;
    if (sender.companyName) {
      doc.font('Helvetica-Bold').text(sender.companyName, 50, fromY);
      fromY += 14;
      doc.font('Helvetica');
    }
    if (sender.name && sender.name !== sender.companyName) {
      doc.text(sender.name, 50, fromY);
      fromY += 14;
    }
    if (sender.addressLine1) {
      doc.text(sender.addressLine1, 50, fromY);
      fromY += 14;
    }
    if (sender.addressLine2) {
      doc.text(sender.addressLine2, 50, fromY);
      fromY += 14;
    }
    const cityLine = [sender.city, sender.state, sender.postalCode]
      .filter(Boolean)
      .join(', ');
    if (cityLine) {
      doc.text(cityLine, 50, fromY);
      fromY += 14;
    }
    if (sender.country) {
      doc.text(sender.country, 50, fromY);
      fromY += 14;
    }
    if (sender.email) {
      doc.text(sender.email, 50, fromY);
      fromY += 14;
    }
    if (sender.phone) {
      doc.text(sender.phone, 50, fromY);
      fromY += 14;
    }
    if (sender.taxId) {
      doc.text(`Tax ID: ${sender.taxId}`, 50, fromY);
      fromY += 14;
    }

    // To
    doc.fontSize(10).font('Helvetica-Bold').text('Bill To:', 300, y);
    doc.fontSize(10).font('Helvetica');
    let toY = y + 15;
    if (client.companyName) {
      doc.font('Helvetica-Bold').text(client.companyName, 300, toY);
      toY += 14;
      doc.font('Helvetica');
    }
    if (client.name && client.name !== client.companyName) {
      doc.text(client.name, 300, toY);
      toY += 14;
    }
    if (client.addressLine1) {
      doc.text(client.addressLine1, 300, toY);
      toY += 14;
    }
    if (client.addressLine2) {
      doc.text(client.addressLine2, 300, toY);
      toY += 14;
    }
    const clientCityLine = [client.city, client.state, client.postalCode]
      .filter(Boolean)
      .join(', ');
    if (clientCityLine) {
      doc.text(clientCityLine, 300, toY);
      toY += 14;
    }
    if (client.country) {
      doc.text(client.country, 300, toY);
      toY += 14;
    }
    if (client.email) {
      doc.text(client.email, 300, toY);
      toY += 14;
    }
    if (client.phone) {
      doc.text(client.phone, 300, toY);
      toY += 14;
    }
    if (client.taxId) {
      doc.text(`Tax ID: ${client.taxId}`, 300, toY);
      toY += 14;
    }

    return Math.max(fromY, toY);
  }

  private drawItemsTable(
    doc: InstanceType<typeof PDFDocument>,
    invoice: Invoice,
    tableTop: number,
  ): number {
    const currency = invoice.currency;
    const rowHeight = 24;
    const headerHeight = 24;

    // Table header
    doc.rect(50, tableTop, 495, headerHeight).fill('#f3f4f6').stroke();

    doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold');
    doc.text('#', 55, tableTop + 7, { width: 25 });
    doc.text('Description', 80, tableTop + 7, { width: 220 });
    doc.text('Qty', 300, tableTop + 7, { width: 60, align: 'right' });
    doc.text('Unit Price', 365, tableTop + 7, { width: 70, align: 'right' });
    doc.text('Amount', 440, tableTop + 7, { width: 100, align: 'right' });

    // Table rows
    doc.font('Helvetica').fontSize(9).fillColor('#111827');
    let rowY = tableTop + headerHeight + 6;

    const items =
      invoice.items?.sort((a, b) => a.sortOrder - b.sortOrder) || [];
    items.forEach((item, i) => {
      const isAlternate = i % 2 === 1;
      if (isAlternate) {
        doc
          .rect(50, rowY - 4, 495, rowHeight)
          .fill('#f9fafb')
          .stroke();
        doc.fillColor('#111827');
      }

      doc.text(`${i + 1}`, 55, rowY, { width: 25 });
      doc.text(item.description, 80, rowY, { width: 220, ellipsis: true });
      doc.text(Number(item.quantity).toFixed(2), 300, rowY, {
        width: 60,
        align: 'right',
      });
      doc.text(`${currency} ${Number(item.unitPrice).toFixed(2)}`, 365, rowY, {
        width: 70,
        align: 'right',
      });
      doc.text(`${currency} ${Number(item.amount).toFixed(2)}`, 440, rowY, {
        width: 100,
        align: 'right',
      });

      rowY += rowHeight;
    });

    // Bottom line
    const bottomY = rowY + 6;
    doc
      .moveTo(50, bottomY)
      .lineTo(545, bottomY)
      .strokeColor('#cccccc')
      .lineWidth(0.5)
      .stroke();

    return bottomY;
  }

  private drawTotals(
    doc: InstanceType<typeof PDFDocument>,
    invoice: Invoice,
    totalsY: number,
  ): number {
    const currency = invoice.currency;
    const panelX = 360;
    const panelWidth = 185;
    const panelHeight = 96;
    const labelX = 370;
    const valueX = 440;
    const subtotalY = totalsY + 14;
    const taxY = subtotalY + 24;
    const dividerY = taxY + 20;
    const totalY = dividerY + 10;

    doc
      .roundedRect(panelX, totalsY, panelWidth, panelHeight, 8)
      .fillAndStroke('#f8fafc', '#d1d5db');

    doc.fontSize(10).font('Helvetica').fillColor('#374151');
    doc.text('Subtotal:', labelX, subtotalY, { width: 55, align: 'right' });
    doc.text(
      `${currency} ${Number(invoice.subtotal).toFixed(2)}`,
      valueX,
      subtotalY,
      { width: 100, align: 'right' },
    );

    doc.text(`Tax (${Number(invoice.taxRate).toFixed(1)}%):`, labelX, taxY, {
      width: 55,
      align: 'right',
    });
    doc.text(
      `${currency} ${Number(invoice.taxAmount).toFixed(2)}`,
      valueX,
      taxY,
      { width: 100, align: 'right' },
    );

    // Total with bold
    doc
      .moveTo(panelX + 12, dividerY)
      .lineTo(panelX + panelWidth - 12, dividerY)
      .strokeColor('#333333')
      .lineWidth(1)
      .stroke();

    doc.fontSize(13).font('Helvetica-Bold').fillColor('#111827');
    doc.text('Total:', labelX, totalY, { width: 55, align: 'right' });
    doc.text(
      `${currency} ${Number(invoice.total).toFixed(2)}`,
      valueX,
      totalY,
      { width: 100, align: 'right' },
    );

    return totalsY + panelHeight;
  }

  private drawBankDetails(
    doc: InstanceType<typeof PDFDocument>,
    invoice: Invoice,
    bankY: number,
  ): number {
    const bank = invoice.bankProfile;
    if (!bank) return bankY;

    doc
      .moveTo(50, bankY)
      .lineTo(545, bankY)
      .strokeColor('#cccccc')
      .lineWidth(0.5)
      .stroke();

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text('Bank Details', 50, bankY + 10);

    doc.fontSize(9).font('Helvetica').fillColor('#374151');
    let y = bankY + 26;
    if (bank.bankName) {
      doc.text(`Bank: ${bank.bankName}`, 50, y);
      y += 14;
    }
    if (bank.accountHolder) {
      doc.text(`Account Holder: ${bank.accountHolder}`, 50, y);
      y += 14;
    }
    if (bank.iban) {
      doc.text(`IBAN: ${bank.iban}`, 50, y);
      y += 14;
    }
    if (bank.swiftCode) {
      doc.text(`SWIFT/BIC: ${bank.swiftCode}`, 50, y);
      y += 14;
    }

    return y;
  }

  private drawNotes(
    doc: InstanceType<typeof PDFDocument>,
    invoice: Invoice,
    notesY: number,
  ): number {
    if (!invoice.notes) return notesY;

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text('Notes', 50, notesY);

    const textY = notesY + 16;
    const textHeight = doc.heightOfString(invoice.notes, { width: 495 });
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#666666')
      .text(invoice.notes, 50, textY, { width: 495 });

    return textY + textHeight;
  }

  private drawFooter(doc: InstanceType<typeof PDFDocument>) {
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#999999')
      .text('Generated with Invo — Thank you for your business.', 50, 770, {
        align: 'center',
        width: 495,
      });
  }

  private decodeLogoDataUrl(dataUrl?: string): Buffer | null {
    if (!dataUrl) return null;

    const match = dataUrl.match(
      /^data:image\/(?:png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/i,
    );
    if (!match) return null;

    try {
      return Buffer.from(match[1], 'base64');
    } catch {
      return null;
    }
  }
}
