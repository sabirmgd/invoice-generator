import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Invoice } from '../../db/entities/invoice.entity';
import { Estimate } from '../../db/entities/estimate.entity';
import { SettingsService } from '../settings/settings.service';
import { getCurrencyInfo } from '../../common/constants/currencies';

/** Shared shape for rendering PDFs — works for both invoices and estimates. */
interface PdfDocumentData {
  ownerId: string;
  documentNumber: string;
  status: string;
  senderProfile: Invoice['senderProfile'];
  clientProfile: Invoice['clientProfile'];
  bankProfile?: Invoice['bankProfile'];
  issueDate: string;
  secondaryDate: string; // dueDate for invoices, validUntil for estimates
  secondaryDateLabel: string; // "Due Date" or "Valid Until"
  currency: string;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes?: string;
  lateFeeAmount?: number | null;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    sortOrder: number;
  }[];
  title: string; // "INVOICE" or "ESTIMATE"
  numberLabel: string; // "Invoice #" or "Estimate #"
}

type Doc = InstanceType<typeof PDFDocument>;

/** Lighten a hex color by mixing it with white. mix=0.9 → 90% white, 10% color. */
function lighten(hex: string, mix: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * mix);
  const lg = Math.round(g + (255 - g) * mix);
  const lb = Math.round(b + (255 - b) * mix);
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

@Injectable()
export class PdfService {
  constructor(private readonly settingsService: SettingsService) {}

  async generateInvoicePdf(invoice: Invoice): Promise<Buffer> {
    const data = this.invoiceToDocumentData(invoice);
    return this.renderDocument(data);
  }

  async generateEstimatePdf(estimate: Estimate): Promise<Buffer> {
    const data = this.estimateToDocumentData(estimate);
    return this.renderDocument(data);
  }

  private invoiceToDocumentData(invoice: Invoice): PdfDocumentData {
    return {
      ownerId: invoice.ownerId,
      documentNumber: invoice.invoiceNumber,
      status: invoice.status,
      senderProfile: invoice.senderProfile,
      clientProfile: invoice.clientProfile,
      bankProfile: invoice.bankProfile,
      issueDate: invoice.issueDate,
      secondaryDate: invoice.dueDate,
      secondaryDateLabel: 'Due Date',
      currency: invoice.currency,
      taxRate: Number(invoice.taxRate),
      subtotal: Number(invoice.subtotal),
      taxAmount: Number(invoice.taxAmount),
      total: Number(invoice.total),
      notes: invoice.notes,
      lateFeeAmount: invoice.lateFeeAmount,
      items: (invoice.items || []).map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        amount: Number(i.amount),
        sortOrder: i.sortOrder,
      })),
      title: 'INVOICE',
      numberLabel: 'Invoice #',
    };
  }

  private estimateToDocumentData(estimate: Estimate): PdfDocumentData {
    return {
      ownerId: estimate.ownerId,
      documentNumber: estimate.estimateNumber,
      status: estimate.status,
      senderProfile: estimate.senderProfile,
      clientProfile: estimate.clientProfile,
      bankProfile: estimate.bankProfile,
      issueDate: estimate.issueDate,
      secondaryDate: estimate.validUntil,
      secondaryDateLabel: 'Valid Until',
      currency: estimate.currency,
      taxRate: Number(estimate.taxRate),
      subtotal: Number(estimate.subtotal),
      taxAmount: Number(estimate.taxAmount),
      total: Number(estimate.total),
      notes: estimate.notes,
      lateFeeAmount: null,
      items: (estimate.items || []).map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        amount: Number(i.amount),
        sortOrder: i.sortOrder,
      })),
      title: 'ESTIMATE',
      numberLabel: 'Estimate #',
    };
  }

  private async renderDocument(data: PdfDocumentData): Promise<Buffer> {
    const [logoDataUrl, template, accentColor] = await Promise.all([
      this.settingsService.getValue(data.ownerId, 'invoice_logo_data_url', ''),
      this.settingsService.getValue(
        data.ownerId,
        'invoice_template',
        'classic',
      ),
      this.settingsService.getValue(
        data.ownerId,
        'invoice_accent_color',
        '#2563eb',
      ),
    ]);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Ensure stable white background across PDF viewers.
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff');

      switch (template) {
        case 'modern':
          this.renderModern(doc, data, logoDataUrl, accentColor);
          break;
        case 'bold':
          this.renderBold(doc, data, logoDataUrl, accentColor);
          break;
        default:
          this.renderClassic(doc, data, logoDataUrl, accentColor);
          break;
      }

      doc.end();
    });
  }

  // ---------------------------------------------------------------------------
  // CLASSIC TEMPLATE — refined version of original layout
  // ---------------------------------------------------------------------------

  private renderClassic(
    doc: Doc,
    data: PdfDocumentData,
    logoDataUrl: string,
    accent: string,
  ) {
    const partiesStartY = this.classicHeader(doc, data, logoDataUrl, accent);
    const partiesBottomY = this.drawParties(doc, data, partiesStartY, 50, 300);
    const tableTop = Math.max(310, partiesBottomY + 24);
    const tableBottomY = this.drawItemsTable(
      doc,
      data,
      tableTop,
      '#f3f4f6',
      '#374151',
    );
    const totalsBottomY = this.drawTotals(
      doc,
      data,
      tableBottomY + 14,
      '#f8fafc',
      '#d1d5db',
    );
    const bankBottomY = this.drawBankDetails(doc, data, totalsBottomY + 16);
    this.drawNotes(doc, data, bankBottomY + 14);
    this.drawFooter(doc, '#999999');
  }

  private classicHeader(
    doc: Doc,
    data: PdfDocumentData,
    logoDataUrl: string,
    accent: string,
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

    doc
      .fillColor('#111827')
      .fontSize(30)
      .font('Helvetica-Bold')
      .text(data.title, 50, titleY);

    const rightX = 350;
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#374151')
      .text(`${data.numberLabel}: ${data.documentNumber}`, rightX, 50, {
        align: 'right',
      })
      .text(`Status: ${data.status.toUpperCase()}`, rightX, 65, {
        align: 'right',
      })
      .text(`Issue Date: ${data.issueDate}`, rightX, 80, { align: 'right' })
      .text(`${data.secondaryDateLabel}: ${data.secondaryDate}`, rightX, 95, {
        align: 'right',
      });

    const dividerY = hasLogo ? 136 : 120;
    doc
      .moveTo(50, dividerY)
      .lineTo(545, dividerY)
      .strokeColor(accent)
      .lineWidth(1.5)
      .stroke();

    return dividerY + 18;
  }

  // ---------------------------------------------------------------------------
  // MODERN TEMPLATE — full-width colored header, clean lines
  // ---------------------------------------------------------------------------

  private renderModern(
    doc: Doc,
    data: PdfDocumentData,
    logoDataUrl: string,
    accent: string,
  ) {
    const headerBottomY = this.modernHeader(doc, data, logoDataUrl, accent);
    const partiesBottomY = this.drawParties(
      doc,
      data,
      headerBottomY + 10,
      50,
      300,
    );
    const tableTop = Math.max(310, partiesBottomY + 24);
    const tableBottomY = this.modernItemsTable(doc, data, tableTop, accent);
    const totalsBottomY = this.drawTotals(
      doc,
      data,
      tableBottomY + 14,
      lighten(accent, 0.9),
      accent,
    );
    const bankBottomY = this.drawBankDetails(doc, data, totalsBottomY + 16);
    this.drawNotes(doc, data, bankBottomY + 14);
    this.drawFooter(doc, '#999999');
  }

  private modernHeader(
    doc: Doc,
    data: PdfDocumentData,
    logoDataUrl: string,
    accent: string,
  ): number {
    // Full-width accent header bar
    doc.rect(0, 0, doc.page.width, 90).fill(accent);

    // Logo in header (white area left)
    let titleX = 50;
    const logoBuffer = this.decodeLogoDataUrl(logoDataUrl);
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 50, 20, { fit: [100, 50], valign: 'center' });
        titleX = 165;
      } catch {
        /* ignore */
      }
    }

    // Title on header bar
    doc
      .fillColor('#ffffff')
      .fontSize(26)
      .font('Helvetica-Bold')
      .text(data.title, titleX, 30);

    // Metadata on right in white
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#ffffff')
      .text(`#${data.documentNumber}`, 350, 22, { align: 'right' })
      .text(`Status: ${data.status.toUpperCase()}`, 350, 36, {
        align: 'right',
      })
      .text(`Issued: ${data.issueDate}`, 350, 50, { align: 'right' })
      .text(`${data.secondaryDateLabel}: ${data.secondaryDate}`, 350, 64, {
        align: 'right',
      });

    return 104;
  }

  private modernItemsTable(
    doc: Doc,
    data: PdfDocumentData,
    tableTop: number,
    accent: string,
  ): number {
    const currency = data.currency;
    const rowHeight = 24;

    // No filled header — just accent-colored underline
    doc.fillColor(accent).fontSize(9).font('Helvetica-Bold');
    doc.text('#', 55, tableTop + 4, { width: 25 });
    doc.text('Description', 80, tableTop + 4, { width: 220 });
    doc.text('Qty', 300, tableTop + 4, { width: 60, align: 'right' });
    doc.text('Unit Price', 365, tableTop + 4, { width: 70, align: 'right' });
    doc.text('Amount', 440, tableTop + 4, { width: 100, align: 'right' });

    doc
      .moveTo(50, tableTop + 20)
      .lineTo(545, tableTop + 20)
      .strokeColor(accent)
      .lineWidth(1)
      .stroke();

    doc.font('Helvetica').fontSize(9).fillColor('#111827');
    let rowY = tableTop + 28;

    const items = [...(data.items || [])].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    items.forEach((item, i) => {
      // Subtle separator between rows
      if (i > 0) {
        doc
          .moveTo(50, rowY - 4)
          .lineTo(545, rowY - 4)
          .strokeColor('#e5e7eb')
          .lineWidth(0.5)
          .stroke();
      }

      doc.fillColor('#111827');
      doc.text(`${i + 1}`, 55, rowY, { width: 25 });
      doc.text(item.description, 80, rowY, { width: 220, ellipsis: true });
      doc.text(item.quantity.toFixed(2), 300, rowY, {
        width: 60,
        align: 'right',
      });
      doc.text(this.formatAmount(item.unitPrice, currency), 365, rowY, {
        width: 70,
        align: 'right',
      });
      doc.text(this.formatAmount(item.amount, currency), 440, rowY, {
        width: 100,
        align: 'right',
      });

      rowY += rowHeight;
    });

    const bottomY = rowY + 6;
    doc
      .moveTo(50, bottomY)
      .lineTo(545, bottomY)
      .strokeColor(accent)
      .lineWidth(0.5)
      .stroke();
    return bottomY;
  }

  // ---------------------------------------------------------------------------
  // BOLD TEMPLATE — left accent sidebar, dramatic layout
  // ---------------------------------------------------------------------------

  private renderBold(
    doc: Doc,
    data: PdfDocumentData,
    logoDataUrl: string,
    accent: string,
  ) {
    // Full-height left sidebar
    const sidebarW = 56;
    doc.rect(0, 0, sidebarW, doc.page.height).fill(accent);

    // Rotated title text in sidebar
    doc.save();
    doc.translate(36, 200);
    doc.rotate(-90);
    doc
      .fillColor('#ffffff')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text(data.title, 0, 0);
    doc.restore();

    const contentX = sidebarW + 20;
    const rightEdge = 545;
    const contentWidth = rightEdge - contentX;

    const headerBottomY = this.boldHeader(
      doc,
      data,
      logoDataUrl,
      accent,
      contentX,
      contentWidth,
    );
    const partiesBottomY = this.drawParties(
      doc,
      data,
      headerBottomY + 10,
      contentX,
      contentX + 240,
    );
    const tableTop = Math.max(310, partiesBottomY + 24);
    const tableBottomY = this.boldItemsTable(
      doc,
      data,
      tableTop,
      accent,
      contentX,
      rightEdge,
    );
    const totalsBottomY = this.drawTotals(
      doc,
      data,
      tableBottomY + 14,
      lighten(accent, 0.92),
      accent,
    );
    const bankBottomY = this.drawBankDetails(
      doc,
      data,
      totalsBottomY + 16,
      contentX,
    );
    this.drawNotes(doc, data, bankBottomY + 14, contentX, contentWidth);
    this.drawFooter(doc, accent, contentX, contentWidth);
  }

  private boldHeader(
    doc: Doc,
    data: PdfDocumentData,
    logoDataUrl: string,
    accent: string,
    contentX: number,
    contentWidth: number,
  ): number {
    const logoBuffer = this.decodeLogoDataUrl(logoDataUrl);
    let y = 42;

    if (logoBuffer) {
      try {
        doc.image(logoBuffer, contentX, y, {
          fit: [120, 48],
          valign: 'center',
        });
        y += 58;
      } catch {
        /* ignore */
      }
    }

    // Document number large
    doc
      .fillColor('#111827')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(data.documentNumber, contentX, y);
    y += 30;

    // Status pill
    doc
      .fillColor(accent)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(data.status.toUpperCase(), contentX, y);
    y += 18;

    // Dates
    doc.fillColor('#374151').fontSize(9).font('Helvetica');
    doc.text(
      `Issued: ${data.issueDate}  |  ${data.secondaryDateLabel}: ${data.secondaryDate}`,
      contentX,
      y,
    );
    y += 16;

    // Bold accent divider
    doc
      .moveTo(contentX, y)
      .lineTo(contentX + contentWidth, y)
      .strokeColor(accent)
      .lineWidth(3)
      .stroke();

    return y + 10;
  }

  private boldItemsTable(
    doc: Doc,
    data: PdfDocumentData,
    tableTop: number,
    accent: string,
    contentX: number,
    rightEdge: number,
  ): number {
    const currency = data.currency;
    const rowHeight = 24;
    const headerHeight = 26;
    const tableWidth = rightEdge - contentX;

    // Accent-colored header
    doc.rect(contentX, tableTop, tableWidth, headerHeight).fill(accent);

    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    doc.text('#', contentX + 8, tableTop + 8, { width: 25 });
    doc.text('Description', contentX + 33, tableTop + 8, { width: 200 });
    doc.text('Qty', contentX + 235, tableTop + 8, {
      width: 55,
      align: 'right',
    });
    doc.text('Unit Price', contentX + 295, tableTop + 8, {
      width: 70,
      align: 'right',
    });
    doc.text('Amount', contentX + 370, tableTop + 8, {
      width: 90,
      align: 'right',
    });

    doc.font('Helvetica').fontSize(9).fillColor('#111827');
    let rowY = tableTop + headerHeight + 6;

    const items = [...(data.items || [])].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    items.forEach((item, i) => {
      if (i % 2 === 1) {
        doc
          .rect(contentX, rowY - 4, tableWidth, rowHeight)
          .fill('#f9fafb')
          .stroke();
        doc.fillColor('#111827');
      }

      doc.text(`${i + 1}`, contentX + 8, rowY, { width: 25 });
      doc.text(item.description, contentX + 33, rowY, {
        width: 200,
        ellipsis: true,
      });
      doc.text(item.quantity.toFixed(2), contentX + 235, rowY, {
        width: 55,
        align: 'right',
      });
      doc.text(
        this.formatAmount(item.unitPrice, currency),
        contentX + 295,
        rowY,
        { width: 70, align: 'right' },
      );
      doc.text(this.formatAmount(item.amount, currency), contentX + 370, rowY, {
        width: 90,
        align: 'right',
      });

      rowY += rowHeight;
    });

    const bottomY = rowY + 6;
    doc
      .moveTo(contentX, bottomY)
      .lineTo(rightEdge, bottomY)
      .strokeColor(accent)
      .lineWidth(1)
      .stroke();
    return bottomY;
  }

  // ---------------------------------------------------------------------------
  // SHARED HELPERS — used across all templates
  // ---------------------------------------------------------------------------

  private drawParties(
    doc: Doc,
    data: PdfDocumentData,
    y: number,
    fromX: number,
    toX: number,
  ): number {
    const sender = data.senderProfile;
    const client = data.clientProfile;

    // From
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('From:', fromX, y);
    doc.fontSize(10).font('Helvetica');
    let fromY = y + 15;
    if (sender.companyName) {
      doc.font('Helvetica-Bold').text(sender.companyName, fromX, fromY);
      fromY += 14;
      doc.font('Helvetica');
    }
    if (sender.name && sender.name !== sender.companyName) {
      doc.text(sender.name, fromX, fromY);
      fromY += 14;
    }
    if (sender.addressLine1) {
      doc.text(sender.addressLine1, fromX, fromY);
      fromY += 14;
    }
    if (sender.addressLine2) {
      doc.text(sender.addressLine2, fromX, fromY);
      fromY += 14;
    }
    const cityLine = [sender.city, sender.state, sender.postalCode]
      .filter(Boolean)
      .join(', ');
    if (cityLine) {
      doc.text(cityLine, fromX, fromY);
      fromY += 14;
    }
    if (sender.country) {
      doc.text(sender.country, fromX, fromY);
      fromY += 14;
    }
    if (sender.email) {
      doc.text(sender.email, fromX, fromY);
      fromY += 14;
    }
    if (sender.phone) {
      doc.text(sender.phone, fromX, fromY);
      fromY += 14;
    }
    if (sender.taxId) {
      doc.text(`Tax ID: ${sender.taxId}`, fromX, fromY);
      fromY += 14;
    }

    // To
    doc.fontSize(10).font('Helvetica-Bold').text('Bill To:', toX, y);
    doc.fontSize(10).font('Helvetica');
    let toY = y + 15;
    if (client.companyName) {
      doc.font('Helvetica-Bold').text(client.companyName, toX, toY);
      toY += 14;
      doc.font('Helvetica');
    }
    if (client.name && client.name !== client.companyName) {
      doc.text(client.name, toX, toY);
      toY += 14;
    }
    if (client.addressLine1) {
      doc.text(client.addressLine1, toX, toY);
      toY += 14;
    }
    if (client.addressLine2) {
      doc.text(client.addressLine2, toX, toY);
      toY += 14;
    }
    const clientCityLine = [client.city, client.state, client.postalCode]
      .filter(Boolean)
      .join(', ');
    if (clientCityLine) {
      doc.text(clientCityLine, toX, toY);
      toY += 14;
    }
    if (client.country) {
      doc.text(client.country, toX, toY);
      toY += 14;
    }
    if (client.email) {
      doc.text(client.email, toX, toY);
      toY += 14;
    }
    if (client.phone) {
      doc.text(client.phone, toX, toY);
      toY += 14;
    }
    if (client.taxId) {
      doc.text(`Tax ID: ${client.taxId}`, toX, toY);
      toY += 14;
    }

    return Math.max(fromY, toY);
  }

  private drawItemsTable(
    doc: Doc,
    data: PdfDocumentData,
    tableTop: number,
    headerBg: string,
    headerText: string,
  ): number {
    const currency = data.currency;
    const rowHeight = 24;
    const headerHeight = 24;

    doc.rect(50, tableTop, 495, headerHeight).fill(headerBg).stroke();

    doc.fillColor(headerText).fontSize(9).font('Helvetica-Bold');
    doc.text('#', 55, tableTop + 7, { width: 25 });
    doc.text('Description', 80, tableTop + 7, { width: 220 });
    doc.text('Qty', 300, tableTop + 7, { width: 60, align: 'right' });
    doc.text('Unit Price', 365, tableTop + 7, { width: 70, align: 'right' });
    doc.text('Amount', 440, tableTop + 7, { width: 100, align: 'right' });

    doc.font('Helvetica').fontSize(9).fillColor('#111827');
    let rowY = tableTop + headerHeight + 6;

    const items = [...(data.items || [])].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    items.forEach((item, i) => {
      if (i % 2 === 1) {
        doc
          .rect(50, rowY - 4, 495, rowHeight)
          .fill('#f9fafb')
          .stroke();
        doc.fillColor('#111827');
      }

      doc.text(`${i + 1}`, 55, rowY, { width: 25 });
      doc.text(item.description, 80, rowY, { width: 220, ellipsis: true });
      doc.text(item.quantity.toFixed(2), 300, rowY, {
        width: 60,
        align: 'right',
      });
      doc.text(this.formatAmount(item.unitPrice, currency), 365, rowY, {
        width: 70,
        align: 'right',
      });
      doc.text(this.formatAmount(item.amount, currency), 440, rowY, {
        width: 100,
        align: 'right',
      });

      rowY += rowHeight;
    });

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
    doc: Doc,
    data: PdfDocumentData,
    totalsY: number,
    panelBg: string,
    panelBorder: string,
  ): number {
    const currency = data.currency;
    const hasLateFee =
      data.lateFeeAmount != null && Number(data.lateFeeAmount) > 0;
    const panelX = 360;
    const panelWidth = 185;
    const panelHeight = hasLateFee ? 120 : 96;
    const labelX = 370;
    const valueX = 440;
    const subtotalY = totalsY + 14;
    const taxY = subtotalY + 24;

    doc
      .roundedRect(panelX, totalsY, panelWidth, panelHeight, 8)
      .fillAndStroke(panelBg, panelBorder);

    doc.fontSize(10).font('Helvetica').fillColor('#374151');
    doc.text('Subtotal:', labelX, subtotalY, { width: 55, align: 'right' });
    doc.text(this.formatAmount(data.subtotal, currency), valueX, subtotalY, {
      width: 100,
      align: 'right',
    });

    doc.text(`Tax (${data.taxRate.toFixed(1)}%):`, labelX, taxY, {
      width: 55,
      align: 'right',
    });
    doc.text(this.formatAmount(data.taxAmount, currency), valueX, taxY, {
      width: 100,
      align: 'right',
    });

    let nextY = taxY + 24;

    if (hasLateFee) {
      doc.fontSize(10).font('Helvetica').fillColor('#dc2626');
      doc.text('Late Fee:', labelX, nextY, { width: 55, align: 'right' });
      doc.text(
        this.formatAmount(Number(data.lateFeeAmount), currency),
        valueX,
        nextY,
        { width: 100, align: 'right' },
      );
      nextY += 20;
    } else {
      nextY -= 4;
    }

    doc
      .moveTo(panelX + 12, nextY)
      .lineTo(panelX + panelWidth - 12, nextY)
      .strokeColor('#333333')
      .lineWidth(1)
      .stroke();

    const totalY = nextY + 10;
    const totalDue = data.total + (hasLateFee ? Number(data.lateFeeAmount) : 0);

    doc.fontSize(13).font('Helvetica-Bold').fillColor('#111827');
    doc.text(hasLateFee ? 'Total Due:' : 'Total:', labelX, totalY, {
      width: 55,
      align: 'right',
    });
    doc.text(this.formatAmount(totalDue, currency), valueX, totalY, {
      width: 100,
      align: 'right',
    });

    return totalsY + panelHeight;
  }

  private drawBankDetails(
    doc: Doc,
    data: PdfDocumentData,
    bankY: number,
    startX = 50,
  ): number {
    const bank = data.bankProfile;
    if (!bank) return bankY;

    doc
      .moveTo(startX, bankY)
      .lineTo(545, bankY)
      .strokeColor('#cccccc')
      .lineWidth(0.5)
      .stroke();

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text('Bank Details', startX, bankY + 10);

    doc.fontSize(9).font('Helvetica').fillColor('#374151');
    let y = bankY + 26;
    if (bank.bankName) {
      doc.text(`Bank: ${bank.bankName}`, startX, y);
      y += 14;
    }
    if (bank.accountHolder) {
      doc.text(`Account Holder: ${bank.accountHolder}`, startX, y);
      y += 14;
    }
    if (bank.iban) {
      doc.text(`IBAN: ${bank.iban}`, startX, y);
      y += 14;
    }
    if (bank.swiftCode) {
      doc.text(`SWIFT/BIC: ${bank.swiftCode}`, startX, y);
      y += 14;
    }

    return y;
  }

  private drawNotes(
    doc: Doc,
    data: PdfDocumentData,
    notesY: number,
    startX = 50,
    width = 495,
  ): number {
    if (!data.notes) return notesY;

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text('Notes', startX, notesY);

    const textY = notesY + 16;
    const textHeight = doc.heightOfString(data.notes, { width });
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#666666')
      .text(data.notes, startX, textY, { width });

    return textY + textHeight;
  }

  private drawFooter(doc: Doc, color: string, startX = 50, width = 495) {
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(color)
      .text('Generated with Invo — Thank you for your business.', startX, 770, {
        align: 'center',
        width,
      });
  }

  private formatAmount(amount: number, currencyCode: string): string {
    const info = getCurrencyInfo(currencyCode);
    // Helvetica can't render non-Latin symbols (Arabic, Thai, etc.) — use currency code instead
    const symbol = /^[\x20-\x7E\u00A0-\u024F\u20A0-\u20CF]+$/.test(info.symbol)
      ? info.symbol
      : currencyCode;
    return `${symbol} ${Number(amount).toFixed(info.decimals)}`;
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
