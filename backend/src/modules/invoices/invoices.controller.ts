import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  Res,
  ParseUUIDPipe,
  UseGuards,
  BadGatewayException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';
import { SendInvoiceDto } from './dto/send-invoice.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { OwnerId } from '../auth/decorators/owner-id.decorator';
import { PdfService } from '../pdf/pdf.service';
import { EmailService } from '../email/email.service';
import { PortalService } from '../portal/portal.service';
import { ApplyLateFeeDto } from './dto/apply-late-fee.dto';
import { InvoiceStatus } from '../../db/entities/invoice.entity';
import { EmailStatus } from '../../db/entities/email-log.entity';

@ApiTags('Invoices')
@Controller('api/v1/invoices')
@UseGuards(OptionalAuthGuard)
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly pdfService: PdfService,
    private readonly emailService: EmailService,
    private readonly portalService: PortalService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create an invoice and auto-generate PDF' })
  create(@OwnerId() ownerId: string, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(ownerId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List invoices (paginated)' })
  findAll(@OwnerId() ownerId: string, @Query() query: QueryInvoiceDto) {
    return this.invoicesService.findAll(ownerId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an invoice with items and profiles' })
  findOne(@OwnerId() ownerId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.findOne(ownerId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update invoice status' })
  updateStatus(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceStatusDto,
  ) {
    return this.invoicesService.updateStatus(ownerId, id, dto);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download invoice PDF (generated on-demand)' })
  async downloadPdf(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const invoice = await this.invoicesService.findOne(ownerId, id);
    const pdfBuffer = await this.pdfService.generateInvoicePdf(invoice);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    });
    res.end(pdfBuffer);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send invoice via email' })
  async sendInvoice(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendInvoiceDto,
  ) {
    const invoice = await this.invoicesService.findOne(ownerId, id);
    const emailLog = await this.emailService.sendInvoiceEmail(
      invoice,
      dto.recipientOverride,
    );

    if (emailLog.status === EmailStatus.FAILED) {
      throw new BadGatewayException(
        emailLog.errorMessage || 'Email delivery failed',
      );
    }

    if (invoice.status === InvoiceStatus.DRAFT) {
      await this.invoicesService.updateStatus(ownerId, id, {
        status: InvoiceStatus.SENT,
      });
    }

    return emailLog;
  }

  @Post(':id/portal-link')
  @ApiOperation({ summary: 'Generate shareable portal link for invoice' })
  async generatePortalLink(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.invoicesService.findOne(ownerId, id);
    const token = await this.portalService.getOrCreateToken(id);
    return { token, url: `/portal/${token}` };
  }

  @Post(':id/late-fee')
  @ApiOperation({ summary: 'Manually apply a late fee to an invoice' })
  async applyLateFee(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplyLateFeeDto,
  ) {
    return this.invoicesService.applyLateFee(ownerId, id, dto.amount);
  }

  @Delete(':id/late-fee')
  @ApiOperation({ summary: 'Remove late fee from an invoice' })
  async removeLateFee(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoicesService.removeLateFee(ownerId, id);
  }
}
