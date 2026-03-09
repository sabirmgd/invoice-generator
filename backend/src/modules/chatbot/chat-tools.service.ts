import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { SettingsService } from '../settings/settings.service';
import { ProfilesService } from '../profiles/profiles.service';
import { InvoicesService } from '../invoices/invoices.service';
import { EstimatesService } from '../estimates/estimates.service';
import { ProfileType } from '../../db/entities/profile.entity';
import { InvoiceStatus } from '../../db/entities/invoice.entity';
import { EstimateStatus } from '../../db/entities/estimate.entity';

@Injectable()
export class ChatToolsService {
  constructor(
    private readonly settings: SettingsService,
    private readonly profiles: ProfilesService,
    private readonly invoices: InvoicesService,
    private readonly estimates: EstimatesService,
  ) {}

  buildTools(ownerId: string): DynamicStructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'create_invoice',
        description:
          'Create a new invoice with line items and auto-generate PDF',
        schema: z.object({
          senderProfileId: z
            .string()
            .uuid()
            .describe('UUID of the sender profile'),
          clientProfileId: z
            .string()
            .uuid()
            .describe('UUID of the client profile'),
          bankProfileId: z
            .string()
            .uuid()
            .optional()
            .describe('UUID of the bank profile (uses default if omitted)'),
          issueDate: z.string().describe('Issue date in YYYY-MM-DD format'),
          dueDate: z.string().describe('Due date in YYYY-MM-DD format'),
          currency: z
            .string()
            .optional()
            .describe('Currency code (defaults to settings)'),
          taxRate: z
            .number()
            .optional()
            .describe('Tax rate percentage (defaults to settings)'),
          notes: z.string().optional(),
          items: z
            .array(
              z.object({
                description: z.string(),
                quantity: z.number(),
                unitPrice: z.number(),
              }),
            )
            .min(1)
            .describe('Invoice line items'),
        }),
        func: async (input) => {
          const invoice = await this.invoices.create(ownerId, input);
          return JSON.stringify({
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            subtotal: Number(invoice.subtotal).toFixed(2),
            taxAmount: Number(invoice.taxAmount).toFixed(2),
            total: Number(invoice.total).toFixed(2),
            currency: invoice.currency,
            pdfGenerated: !!invoice.pdfPath,
            clientName: invoice.clientProfile?.name,
          });
        },
      }),

      new DynamicStructuredTool({
        name: 'list_invoices',
        description: 'List invoices with optional status filter',
        schema: z.object({
          status: z.enum(['draft', 'sent', 'paid', 'cancelled']).optional(),
          page: z.number().optional().default(1),
          limit: z.number().optional().default(20),
        }),
        func: async (input) => {
          const result = await this.invoices.findAll(ownerId, {
            status: input.status as InvoiceStatus | undefined,
            page: input.page,
            limit: input.limit,
          });
          return JSON.stringify({
            items: result.items.map((inv) => ({
              id: inv.id,
              invoiceNumber: inv.invoiceNumber,
              client: inv.clientProfile?.name,
              total: `${inv.currency} ${Number(inv.total).toFixed(2)}`,
              status: inv.status,
              issueDate: inv.issueDate,
            })),
            pagination: result.pagination,
          });
        },
      }),

      new DynamicStructuredTool({
        name: 'get_invoice',
        description: 'Get full details of a specific invoice by ID',
        schema: z.object({
          id: z.string().uuid().describe('Invoice UUID'),
        }),
        func: async (input) => {
          const inv = await this.invoices.findOne(ownerId, input.id);
          return JSON.stringify({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            status: inv.status,
            sender: inv.senderProfile?.name,
            client: inv.clientProfile?.name,
            bank: inv.bankProfile?.name,
            issueDate: inv.issueDate,
            dueDate: inv.dueDate,
            currency: inv.currency,
            taxRate: inv.taxRate,
            items: inv.items.map((item) => ({
              description: item.description,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              amount: Number(item.amount),
            })),
            subtotal: Number(inv.subtotal).toFixed(2),
            taxAmount: Number(inv.taxAmount).toFixed(2),
            total: Number(inv.total).toFixed(2),
            notes: inv.notes,
            pdfPath: inv.pdfPath,
          });
        },
      }),

      new DynamicStructuredTool({
        name: 'update_invoice_status',
        description:
          'Change the status of an invoice (draft, sent, paid, cancelled)',
        schema: z.object({
          id: z.string().uuid().describe('Invoice UUID'),
          status: z.enum(['draft', 'sent', 'paid', 'cancelled']),
        }),
        func: async (input) => {
          const inv = await this.invoices.updateStatus(ownerId, input.id, {
            status: input.status as InvoiceStatus,
          });
          return JSON.stringify({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            status: inv.status,
          });
        },
      }),

      new DynamicStructuredTool({
        name: 'get_invoice_summary',
        description:
          'Get summary statistics: counts by status and total revenue',
        schema: z.object({}),
        func: async () => {
          const summary = await this.invoices.getSummary(ownerId);
          return JSON.stringify(summary);
        },
      }),

      new DynamicStructuredTool({
        name: 'create_profile',
        description: 'Create a new profile (sender, client, or bank)',
        schema: z.object({
          type: z.enum(['sender', 'client', 'bank']),
          name: z.string(),
          isDefault: z.boolean().optional().default(false),
          companyName: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          taxId: z.string().optional(),
          addressLine1: z.string().optional(),
          addressLine2: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postalCode: z.string().optional(),
          country: z.string().optional(),
          bankName: z.string().optional(),
          iban: z.string().optional(),
          swiftCode: z.string().optional(),
          accountHolder: z.string().optional(),
        }),
        func: async (input) => {
          const profile = await this.profiles.create(ownerId, {
            ...input,
            type: input.type as ProfileType,
          });
          return JSON.stringify({
            id: profile.id,
            type: profile.type,
            name: profile.name,
            isDefault: profile.isDefault,
          });
        },
      }),

      new DynamicStructuredTool({
        name: 'list_profiles',
        description: 'List profiles with optional type filter',
        schema: z.object({
          type: z.enum(['sender', 'client', 'bank']).optional(),
        }),
        func: async (input) => {
          const result = await this.profiles.findAll(ownerId, {
            type: input.type as ProfileType | undefined,
            page: 1,
            limit: 50,
          });
          return JSON.stringify(
            result.items.map((p) => ({
              id: p.id,
              type: p.type,
              name: p.name,
              isDefault: p.isDefault,
              companyName: p.companyName,
              email: p.email,
            })),
          );
        },
      }),

      new DynamicStructuredTool({
        name: 'get_profile',
        description: 'Get full details of a specific profile',
        schema: z.object({
          id: z.string().uuid().describe('Profile UUID'),
        }),
        func: async (input) => {
          const p = await this.profiles.findOne(ownerId, input.id);
          return JSON.stringify(p);
        },
      }),

      new DynamicStructuredTool({
        name: 'update_profile',
        description: 'Update fields on an existing profile',
        schema: z.object({
          id: z.string().uuid().describe('Profile UUID'),
          name: z.string().optional(),
          isDefault: z.boolean().optional(),
          companyName: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          taxId: z.string().optional(),
          addressLine1: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postalCode: z.string().optional(),
          country: z.string().optional(),
          bankName: z.string().optional(),
          iban: z.string().optional(),
          swiftCode: z.string().optional(),
          accountHolder: z.string().optional(),
        }),
        func: async (input) => {
          const { id, ...updates } = input;
          const profile = await this.profiles.update(ownerId, id, updates);
          return JSON.stringify({
            id: profile.id,
            name: profile.name,
            updated: true,
          });
        },
      }),

      new DynamicStructuredTool({
        name: 'delete_profile',
        description: 'Soft-delete a profile',
        schema: z.object({
          id: z.string().uuid().describe('Profile UUID'),
        }),
        func: async (input) => {
          await this.profiles.remove(ownerId, input.id);
          return JSON.stringify({ deleted: true, id: input.id });
        },
      }),

      new DynamicStructuredTool({
        name: 'list_settings',
        description:
          'List all settings (currency, tax_rate, invoice_prefix, etc.)',
        schema: z.object({}),
        func: async () => {
          const all = await this.settings.findAll(ownerId);
          return JSON.stringify(
            all.map((s) => ({
              key: s.key,
              value: s.value,
              description: s.description,
            })),
          );
        },
      }),

      new DynamicStructuredTool({
        name: 'get_setting',
        description: 'Get a specific setting by key',
        schema: z.object({
          key: z
            .string()
            .describe('Setting key (e.g. currency, tax_rate, invoice_prefix)'),
        }),
        func: async (input) => {
          const s = await this.settings.findByKey(ownerId, input.key);
          return JSON.stringify({
            key: s.key,
            value: s.value,
            description: s.description,
          });
        },
      }),

      new DynamicStructuredTool({
        name: 'update_setting',
        description: 'Update a setting value',
        schema: z.object({
          key: z.string().describe('Setting key'),
          value: z.string().describe('New value'),
        }),
        func: async (input) => {
          const s = await this.settings.update(ownerId, input.key, input.value);
          return JSON.stringify({ key: s.key, value: s.value, updated: true });
        },
      }),

      new DynamicStructuredTool({
        name: 'calculate_total',
        description: 'Preview invoice total without creating an invoice',
        schema: z.object({
          items: z
            .array(
              z.object({
                description: z.string(),
                quantity: z.number(),
                unitPrice: z.number(),
              }),
            )
            .min(1),
          taxRate: z
            .number()
            .optional()
            .describe('Tax rate % (defaults to settings)'),
          currency: z
            .string()
            .optional()
            .describe('Currency (defaults to settings)'),
        }),
        func: async (input) => {
          const taxRate =
            input.taxRate ??
            parseFloat(await this.settings.getValue(ownerId, 'tax_rate', '15'));
          const currency =
            input.currency ??
            (await this.settings.getValue(ownerId, 'currency', 'SAR'));

          const itemsCalc = input.items.map((item) => ({
            ...item,
            amount: item.quantity * item.unitPrice,
          }));
          const subtotal = itemsCalc.reduce((sum, i) => sum + i.amount, 0);
          const taxAmount = subtotal * (taxRate / 100);
          const total = subtotal + taxAmount;

          return JSON.stringify({
            currency,
            items: itemsCalc,
            subtotal: subtotal.toFixed(2),
            taxRate,
            taxAmount: taxAmount.toFixed(2),
            total: total.toFixed(2),
          });
        },
      }),

      // ---- Estimate tools ----

      new DynamicStructuredTool({
        name: 'create_estimate',
        description: 'Create a new estimate/quote with line items',
        schema: z.object({
          senderProfileId: z
            .string()
            .uuid()
            .describe('UUID of the sender profile'),
          clientProfileId: z
            .string()
            .uuid()
            .describe('UUID of the client profile'),
          bankProfileId: z
            .string()
            .uuid()
            .optional()
            .describe('UUID of the bank profile'),
          issueDate: z.string().describe('Issue date in YYYY-MM-DD format'),
          validUntil: z
            .string()
            .describe('Validity end date in YYYY-MM-DD format'),
          currency: z
            .string()
            .optional()
            .describe('Currency code (defaults to settings)'),
          taxRate: z
            .number()
            .optional()
            .describe('Tax rate percentage (defaults to settings)'),
          notes: z.string().optional(),
          items: z
            .array(
              z.object({
                description: z.string(),
                quantity: z.number(),
                unitPrice: z.number(),
              }),
            )
            .min(1)
            .describe('Estimate line items'),
        }),
        func: async (input) => {
          const estimate = await this.estimates.create(ownerId, input);
          return JSON.stringify({
            id: estimate.id,
            estimateNumber: estimate.estimateNumber,
            status: estimate.status,
            subtotal: Number(estimate.subtotal).toFixed(2),
            taxAmount: Number(estimate.taxAmount).toFixed(2),
            total: Number(estimate.total).toFixed(2),
            currency: estimate.currency,
            clientName: estimate.clientProfile?.name,
          });
        },
      }),

      new DynamicStructuredTool({
        name: 'list_estimates',
        description: 'List estimates with optional status filter',
        schema: z.object({
          status: z
            .enum([
              'draft',
              'sent',
              'accepted',
              'rejected',
              'expired',
              'converted',
            ])
            .optional(),
          page: z.number().optional().default(1),
          limit: z.number().optional().default(20),
        }),
        func: async (input) => {
          const result = await this.estimates.findAll(ownerId, {
            status: input.status as EstimateStatus | undefined,
            page: input.page,
            limit: input.limit,
          });
          return JSON.stringify({
            items: result.items.map((est) => ({
              id: est.id,
              estimateNumber: est.estimateNumber,
              client: est.clientProfile?.name,
              total: `${est.currency} ${Number(est.total).toFixed(2)}`,
              status: est.status,
              validUntil: est.validUntil,
            })),
            pagination: result.pagination,
          });
        },
      }),

      new DynamicStructuredTool({
        name: 'get_estimate',
        description: 'Get full details of a specific estimate by ID',
        schema: z.object({
          id: z.string().uuid().describe('Estimate UUID'),
        }),
        func: async (input) => {
          const est = await this.estimates.findOne(ownerId, input.id);
          return JSON.stringify({
            id: est.id,
            estimateNumber: est.estimateNumber,
            status: est.status,
            sender: est.senderProfile?.name,
            client: est.clientProfile?.name,
            issueDate: est.issueDate,
            validUntil: est.validUntil,
            currency: est.currency,
            taxRate: est.taxRate,
            items: est.items.map((item) => ({
              description: item.description,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              amount: Number(item.amount),
            })),
            subtotal: Number(est.subtotal).toFixed(2),
            taxAmount: Number(est.taxAmount).toFixed(2),
            total: Number(est.total).toFixed(2),
            notes: est.notes,
            convertedInvoiceId: est.convertedInvoiceId,
          });
        },
      }),

      new DynamicStructuredTool({
        name: 'update_estimate_status',
        description:
          'Change the status of an estimate (draft, sent, accepted, rejected, expired)',
        schema: z.object({
          id: z.string().uuid().describe('Estimate UUID'),
          status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']),
        }),
        func: async (input) => {
          const est = await this.estimates.updateStatus(ownerId, input.id, {
            status: input.status as EstimateStatus,
          });
          return JSON.stringify({
            id: est.id,
            estimateNumber: est.estimateNumber,
            status: est.status,
          });
        },
      }),

      new DynamicStructuredTool({
        name: 'convert_estimate_to_invoice',
        description:
          'Convert an accepted estimate into an invoice. The estimate must be in accepted status.',
        schema: z.object({
          id: z.string().uuid().describe('Estimate UUID'),
        }),
        func: async (input) => {
          const result = await this.estimates.convertToInvoice(
            ownerId,
            input.id,
          );
          return JSON.stringify({
            estimateId: result.estimate.id,
            estimateNumber: result.estimate.estimateNumber,
            estimateStatus: result.estimate.status,
            invoiceId: result.invoice.id,
            invoiceNumber: result.invoice.invoiceNumber,
            invoiceTotal: `${result.invoice.currency} ${Number(result.invoice.total).toFixed(2)}`,
          });
        },
      }),
    ];
  }
}
