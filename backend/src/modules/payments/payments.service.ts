import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Invoice, InvoiceStatus } from '../../db/entities/invoice.entity';
import { InvoicesService } from '../invoices/invoices.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly invoicesService: InvoicesService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      this.stripe = new Stripe(secretKey);
    }
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }

  async createCheckoutSession(
    invoice: Invoice,
    portalToken: string,
  ): Promise<{ url: string; sessionId: string }> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.');
    }

    const successUrl = this.configService
      .get<string>(
        'STRIPE_SUCCESS_URL',
        'http://localhost:3000/portal/{token}?payment=success',
      )
      .replace('{token}', portalToken);

    const cancelUrl = this.configService
      .get<string>(
        'STRIPE_CANCEL_URL',
        'http://localhost:3000/portal/{token}?payment=cancelled',
      )
      .replace('{token}', portalToken);

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: invoice.currency.toLowerCase(),
            product_data: {
              name: `Invoice ${invoice.invoiceNumber}`,
              description: invoice.notes || undefined,
            },
            unit_amount: Math.round(Number(invoice.total) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoiceId: invoice.id,
        ownerId: invoice.ownerId,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // Store session ID on invoice
    await this.invoicesService.updateStripeSession(
      invoice.id,
      session.id,
    );

    return {
      url: session.url!,
      sessionId: session.id,
    };
  }

  async handleWebhook(signature: string, rawBody: Buffer): Promise<void> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const invoiceId = session.metadata?.invoiceId;

      if (invoiceId) {
        this.logger.log(`Payment completed for invoice ${invoiceId}`);
        await this.invoicesService.markAsPaid(
          invoiceId,
          session.payment_intent as string,
        );
      }
    }
  }
}
