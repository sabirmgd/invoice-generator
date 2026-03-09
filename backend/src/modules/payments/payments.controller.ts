import {
  Controller,
  Post,
  Param,
  Headers,
  RawBodyRequest,
  Req,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { InvoicesService } from '../invoices/invoices.service';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { OwnerId } from '../auth/decorators/owner-id.decorator';
import { PortalService } from '../portal/portal.service';

@ApiTags('Payments')
@Controller('api/v1/payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly invoicesService: InvoicesService,
    private readonly portalService: PortalService,
  ) {}

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook handler' })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    await this.paymentsService.handleWebhook(signature, req.rawBody!);
    return { received: true };
  }

  @Post('invoices/:id/checkout')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Create Stripe checkout session for invoice' })
  async createCheckout(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const invoice = await this.invoicesService.findOne(ownerId, id);
    const token = await this.portalService.getOrCreateToken(invoice.id);
    return this.paymentsService.createCheckoutSession(invoice, token);
  }
}
