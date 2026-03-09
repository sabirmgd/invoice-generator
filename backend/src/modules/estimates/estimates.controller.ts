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
  BadGatewayException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { EstimatesService } from './estimates.service';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { UpdateEstimateStatusDto } from './dto/update-estimate-status.dto';
import { QueryEstimateDto } from './dto/query-estimate.dto';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { OwnerId } from '../auth/decorators/owner-id.decorator';
import { PdfService } from '../pdf/pdf.service';
import { EmailService } from '../email/email.service';
import { PortalService } from '../portal/portal.service';
import { EstimateStatus } from '../../db/entities/estimate.entity';
import { EmailStatus } from '../../db/entities/email-log.entity';

@ApiTags('Estimates')
@Controller('api/v1/estimates')
@UseGuards(OptionalAuthGuard)
export class EstimatesController {
  constructor(
    private readonly estimatesService: EstimatesService,
    private readonly pdfService: PdfService,
    private readonly emailService: EmailService,
    private readonly portalService: PortalService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create an estimate' })
  create(@OwnerId() ownerId: string, @Body() dto: CreateEstimateDto) {
    return this.estimatesService.create(ownerId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List estimates (paginated)' })
  findAll(@OwnerId() ownerId: string, @Query() query: QueryEstimateDto) {
    return this.estimatesService.findAll(ownerId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an estimate with items and profiles' })
  findOne(@OwnerId() ownerId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.estimatesService.findOne(ownerId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update estimate status' })
  updateStatus(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEstimateStatusDto,
  ) {
    return this.estimatesService.updateStatus(ownerId, id, dto);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download estimate PDF (generated on-demand)' })
  async downloadPdf(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const estimate = await this.estimatesService.findOne(ownerId, id);
    const pdfBuffer = await this.pdfService.generateEstimatePdf(estimate);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${estimate.estimateNumber}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    });
    res.end(pdfBuffer);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send estimate via email' })
  async sendEstimate(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const estimate = await this.estimatesService.findOne(ownerId, id);
    const emailLog = await this.emailService.sendEstimateEmail(estimate);

    if (emailLog.status === EmailStatus.FAILED) {
      throw new BadGatewayException(
        emailLog.errorMessage || 'Email delivery failed',
      );
    }

    if (estimate.status === EstimateStatus.DRAFT) {
      await this.estimatesService.updateStatus(ownerId, id, {
        status: EstimateStatus.SENT,
      });
    }

    return emailLog;
  }

  @Post(':id/portal-link')
  @ApiOperation({ summary: 'Generate shareable portal link for estimate' })
  async generatePortalLink(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.estimatesService.findOne(ownerId, id);
    const token = await this.portalService.getOrCreateEstimateToken(id);
    return { token, url: `/portal/estimate/${token}` };
  }

  @Post(':id/convert')
  @ApiOperation({ summary: 'Convert accepted estimate to invoice' })
  async convertToInvoice(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.estimatesService.convertToInvoice(ownerId, id);
  }
}
