import { Controller, Get, Post, Param, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PortalService } from './portal.service';
import { InvoicesService } from '../invoices/invoices.service';
import { EstimatesService } from '../estimates/estimates.service';
import { PdfService } from '../pdf/pdf.service';
import { PaymentsService } from '../payments/payments.service';
import { AppException } from '../../common/exceptions/app.exception';

@ApiTags('Portal')
@Controller('api/v1/portal')
export class PortalController {
  constructor(
    private readonly portalService: PortalService,
    private readonly invoicesService: InvoicesService,
    private readonly estimatesService: EstimatesService,
    private readonly pdfService: PdfService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get(':token')
  @ApiOperation({ summary: 'Get invoice details via portal token' })
  async getInvoice(@Param('token') token: string) {
    const validation = await this.portalService.validateToken(token);
    if (!validation.valid || !validation.invoiceId) {
      throw new AppException('Invalid or expired link', HttpStatus.NOT_FOUND);
    }

    return this.invoicesService.findOneById(validation.invoiceId);
  }

  @Get(':token/pdf')
  @ApiOperation({ summary: 'Download invoice PDF via portal token' })
  async downloadPdf(@Param('token') token: string, @Res() res: Response) {
    const validation = await this.portalService.validateToken(token);
    if (!validation.valid || !validation.invoiceId) {
      throw new AppException('Invalid or expired link', HttpStatus.NOT_FOUND);
    }

    const invoice = await this.invoicesService.findOneById(
      validation.invoiceId,
    );
    const pdfBuffer = await this.pdfService.generateInvoicePdf(invoice);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    });
    res.end(pdfBuffer);
  }

  @Post(':token/pay')
  @ApiOperation({ summary: 'Create Stripe checkout session via portal' })
  async createPayment(@Param('token') token: string) {
    const validation = await this.portalService.validateToken(token);
    if (!validation.valid || !validation.invoiceId) {
      throw new AppException('Invalid or expired link', HttpStatus.NOT_FOUND);
    }

    const invoice = await this.invoicesService.findOneById(
      validation.invoiceId,
    );
    return this.paymentsService.createCheckoutSession(invoice, token);
  }

  @Get('estimate/:token')
  @ApiOperation({ summary: 'Get estimate details via portal token' })
  async getEstimate(@Param('token') token: string) {
    const validation = await this.portalService.validateToken(token);
    if (!validation.valid || !validation.estimateId) {
      throw new AppException('Invalid or expired link', HttpStatus.NOT_FOUND);
    }

    return this.estimatesService.findOneById(validation.estimateId);
  }

  @Get('estimate/:token/pdf')
  @ApiOperation({ summary: 'Download estimate PDF via portal token' })
  async downloadEstimatePdf(
    @Param('token') token: string,
    @Res() res: Response,
  ) {
    const validation = await this.portalService.validateToken(token);
    if (!validation.valid || !validation.estimateId) {
      throw new AppException('Invalid or expired link', HttpStatus.NOT_FOUND);
    }

    const estimate = await this.estimatesService.findOneById(
      validation.estimateId,
    );
    const pdfBuffer = await this.pdfService.generateEstimatePdf(estimate);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${estimate.estimateNumber}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    });
    res.end(pdfBuffer);
  }
}
