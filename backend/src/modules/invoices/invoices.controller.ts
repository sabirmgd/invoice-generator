import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Res,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { OwnerId } from '../auth/decorators/owner-id.decorator';
import { PdfService } from '../pdf/pdf.service';

@ApiTags('Invoices')
@Controller('api/v1/invoices')
@UseGuards(OptionalAuthGuard)
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly pdfService: PdfService,
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
}
