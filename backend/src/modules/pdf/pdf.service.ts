import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { Invoice } from '../../db/entities/invoice.entity';

@Injectable()
export class PdfService {
  private readonly outputDir: string;

  constructor(private readonly config: ConfigService) {
    this.outputDir = this.config.get<string>(
      'app.pdfOutputDir',
      './generated/invoices',
    );
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  async generateInvoicePdf(invoice: Invoice): Promise<string> {
    const filename = `${invoice.invoiceNumber}.pdf`;
    const filePath = path.resolve(this.outputDir, filename);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      this.drawHeader(doc, invoice);
      this.drawParties(doc, invoice);
      this.drawItemsTable(doc, invoice);
      this.drawTotals(doc, invoice);
      this.drawBankDetails(doc, invoice);
      this.drawNotes(doc, invoice);
      this.drawFooter(doc);

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  private drawHeader(doc: InstanceType<typeof PDFDocument>, invoice: Invoice) {
    // Invoice title
    doc.fontSize(28).font('Helvetica-Bold').text('INVOICE', 50, 50);

    // Invoice details on the right
    const rightX = 350;
    doc
      .fontSize(10)
      .font('Helvetica')
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
    doc
      .moveTo(50, 120)
      .lineTo(545, 120)
      .strokeColor('#333333')
      .lineWidth(2)
      .stroke();
  }

  private drawParties(doc: InstanceType<typeof PDFDocument>, invoice: Invoice) {
    const y = 140;
    const sender = invoice.senderProfile;
    const client = invoice.clientProfile;

    // From
    doc.fontSize(10).font('Helvetica-Bold').text('From:', 50, y);
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
    if (sender.taxId) {
      doc.text(`Tax ID: ${sender.taxId}`, 50, fromY);
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
    if (client.taxId) {
      doc.text(`Tax ID: ${client.taxId}`, 300, toY);
    }
  }

  private drawItemsTable(doc: InstanceType<typeof PDFDocument>, invoice: Invoice) {
    const tableTop = 310;
    const currency = invoice.currency;

    // Table header
    doc
      .rect(50, tableTop, 495, 22)
      .fill('#f0f0f0')
      .stroke();

    doc.fillColor('#333333').fontSize(9).font('Helvetica-Bold');
    doc.text('#', 55, tableTop + 6, { width: 25 });
    doc.text('Description', 80, tableTop + 6, { width: 230 });
    doc.text('Qty', 310, tableTop + 6, { width: 50, align: 'right' });
    doc.text('Unit Price', 365, tableTop + 6, { width: 70, align: 'right' });
    doc.text('Amount', 440, tableTop + 6, { width: 100, align: 'right' });

    // Table rows
    doc.font('Helvetica').fontSize(9);
    let rowY = tableTop + 28;

    const items = invoice.items?.sort((a, b) => a.sortOrder - b.sortOrder) || [];
    items.forEach((item, i) => {
      const isAlternate = i % 2 === 1;
      if (isAlternate) {
        doc.rect(50, rowY - 4, 495, 20).fill('#fafafa').stroke();
        doc.fillColor('#333333');
      }

      doc.text(`${i + 1}`, 55, rowY, { width: 25 });
      doc.text(item.description, 80, rowY, { width: 230 });
      doc.text(Number(item.quantity).toFixed(2), 310, rowY, {
        width: 50,
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

      rowY += 20;
    });

    // Bottom line
    doc
      .moveTo(50, rowY + 5)
      .lineTo(545, rowY + 5)
      .strokeColor('#cccccc')
      .lineWidth(0.5)
      .stroke();
  }

  private drawTotals(doc: InstanceType<typeof PDFDocument>, invoice: Invoice) {
    const items = invoice.items || [];
    const rowCount = items.length;
    const totalsY = 310 + 28 + rowCount * 20 + 20;
    const currency = invoice.currency;

    const labelX = 380;
    const valueX = 440;

    doc.fontSize(10).font('Helvetica');
    doc.text('Subtotal:', labelX, totalsY, { width: 55, align: 'right' });
    doc.text(
      `${currency} ${Number(invoice.subtotal).toFixed(2)}`,
      valueX,
      totalsY,
      { width: 100, align: 'right' },
    );

    doc.text(
      `Tax (${Number(invoice.taxRate).toFixed(1)}%):`,
      labelX,
      totalsY + 18,
      { width: 55, align: 'right' },
    );
    doc.text(
      `${currency} ${Number(invoice.taxAmount).toFixed(2)}`,
      valueX,
      totalsY + 18,
      { width: 100, align: 'right' },
    );

    // Total with bold
    doc
      .moveTo(380, totalsY + 38)
      .lineTo(545, totalsY + 38)
      .strokeColor('#333333')
      .lineWidth(1)
      .stroke();

    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Total:', labelX, totalsY + 44, { width: 55, align: 'right' });
    doc.text(
      `${currency} ${Number(invoice.total).toFixed(2)}`,
      valueX,
      totalsY + 44,
      { width: 100, align: 'right' },
    );
  }

  private drawBankDetails(doc: InstanceType<typeof PDFDocument>, invoice: Invoice) {
    const bank = invoice.bankProfile;
    if (!bank) return;

    const items = invoice.items || [];
    const rowCount = items.length;
    const bankY = 310 + 28 + rowCount * 20 + 90;

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

    doc.fontSize(9).font('Helvetica');
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
    }
  }

  private drawNotes(doc: InstanceType<typeof PDFDocument>, invoice: Invoice) {
    if (!invoice.notes) return;

    const items = invoice.items || [];
    const rowCount = items.length;
    const hasBankDetails = !!invoice.bankProfile;
    const notesY = 310 + 28 + rowCount * 20 + (hasBankDetails ? 170 : 90);

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text('Notes', 50, notesY);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#666666')
      .text(invoice.notes, 50, notesY + 16, { width: 495 });
  }

  private drawFooter(doc: InstanceType<typeof PDFDocument>) {
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#999999')
      .text('Thank you for your business.', 50, 750, {
        align: 'center',
        width: 495,
      });
  }
}
