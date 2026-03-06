import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Invoice } from '../../db/entities/invoice.entity';
import { InvoiceItem } from '../../db/entities/invoice-item.entity';
import { ProfileType } from '../../db/entities/profile.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
import { SettingsService } from '../settings/settings.service';
import { ProfilesService } from '../profiles/profiles.service';
import { PdfService } from '../pdf/pdf.service';
import { findOneOrFail } from '../../common/utils/find-one-or-fail.util';
import { paginate, PaginatedResult } from '../../common/utils/pagination.util';
import { AppException } from '../../common/exceptions/app.exception';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly itemRepo: Repository<InvoiceItem>,
    private readonly settingsService: SettingsService,
    private readonly profilesService: ProfilesService,
    private readonly pdfService: PdfService,
  ) {}

  async create(ownerId: string, dto: CreateInvoiceDto): Promise<Invoice> {
    // Ensure default settings exist for this owner
    await this.settingsService.ensureDefaults(ownerId);

    // Validate profiles exist and belong to owner
    await this.profilesService.findOne(ownerId, dto.senderProfileId);
    await this.profilesService.findOne(ownerId, dto.clientProfileId);

    // Resolve bank profile: use provided or default
    let bankProfileId = dto.bankProfileId;
    if (!bankProfileId) {
      const defaultBank = await this.profilesService.findDefaultByType(
        ownerId,
        ProfileType.BANK,
      );
      bankProfileId = defaultBank?.id;
    }
    if (bankProfileId) {
      await this.profilesService.findOne(ownerId, bankProfileId);
    }

    // Resolve invoice number
    const autoNumberRequested = !dto.invoiceNumber;
    let invoiceNumber =
      dto.invoiceNumber || (await this.generateNextNumber(ownerId));

    // Resolve defaults from settings
    const currency =
      dto.currency ||
      (await this.settingsService.getValue(ownerId, 'currency', 'SAR'));
    const taxRate =
      dto.taxRate ??
      parseFloat(
        await this.settingsService.getValue(ownerId, 'tax_rate', '15'),
      );

    // Calculate totals
    const items = dto.items.map((item, i) => {
      const amount = item.quantity * item.unitPrice;
      return this.itemRepo.create({
        ...item,
        amount,
        sortOrder: item.sortOrder ?? i,
      });
    });

    const subtotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    let saved: Invoice | null = null;
    for (let attempt = 0; attempt < 3 && !saved; attempt++) {
      const invoice = this.invoiceRepo.create({
        ownerId,
        invoiceNumber,
        senderProfileId: dto.senderProfileId,
        clientProfileId: dto.clientProfileId,
        bankProfileId,
        issueDate: dto.issueDate,
        dueDate: dto.dueDate,
        currency,
        taxRate,
        subtotal,
        taxAmount,
        total,
        notes: dto.notes,
        items,
      });

      try {
        saved = await this.invoiceRepo.save(invoice);
      } catch (error) {
        if (!this.isInvoiceNumberUniqueViolation(error)) {
          throw error;
        }

        if (!autoNumberRequested) {
          throw new AppException(
            `Invoice number "${dto.invoiceNumber}" already exists for this owner`,
            HttpStatus.CONFLICT,
          );
        }

        invoiceNumber = await this.generateCollisionSafeNumber(ownerId);
      }
    }

    if (!saved) {
      throw new AppException(
        'Could not generate a unique invoice number. Please retry.',
        HttpStatus.CONFLICT,
      );
    }

    // Reload to get eager relations
    const full = await this.findOne(ownerId, saved.id);

    // Mark PDF as available (generated on-demand at download time)
    full.pdfPath = 'on-demand';
    await this.invoiceRepo.update(full.id, { pdfPath: 'on-demand' });

    return full;
  }

  async findAll(
    ownerId: string,
    query: QueryInvoiceDto,
  ): Promise<PaginatedResult<Invoice>> {
    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.senderProfile', 'sender')
      .leftJoinAndSelect('inv.clientProfile', 'client')
      .leftJoinAndSelect('inv.bankProfile', 'bank')
      .leftJoinAndSelect('inv.items', 'items')
      .where('inv.ownerId = :ownerId', { ownerId })
      .orderBy('inv.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('inv.status = :status', { status: query.status });
    }

    return paginate(qb, query);
  }

  async findOne(ownerId: string, id: string): Promise<Invoice> {
    const invoice = await findOneOrFail(this.invoiceRepo, 'Invoice', id, {
      relations: ['senderProfile', 'clientProfile', 'bankProfile', 'items'],
    });
    if (invoice.ownerId !== ownerId) {
      throw new AppException('Invoice not found', HttpStatus.NOT_FOUND);
    }
    return invoice;
  }

  async updateStatus(
    ownerId: string,
    id: string,
    dto: UpdateInvoiceStatusDto,
  ): Promise<Invoice> {
    const invoice = await this.findOne(ownerId, id);
    invoice.status = dto.status;
    await this.invoiceRepo.save(invoice);
    return this.findOne(ownerId, id);
  }

  async getSummary(ownerId: string): Promise<{
    total: number;
    statusCounts: { status: string; count: string; totalAmount: string }[];
    revenue: number;
  }> {
    const total = await this.invoiceRepo.count({ where: { ownerId } });

    const statusCounts = await this.invoiceRepo
      .createQueryBuilder('inv')
      .select('inv.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(inv.total), 0)', 'totalAmount')
      .where('inv.ownerId = :ownerId', { ownerId })
      .groupBy('inv.status')
      .getRawMany();

    const revenue = statusCounts.reduce(
      (sum, s) => sum + parseFloat(s.totalAmount || '0'),
      0,
    );

    return { total, statusCounts, revenue };
  }

  private async generateNextNumber(ownerId: string): Promise<string> {
    const prefix = await this.settingsService.getValue(
      ownerId,
      'invoice_prefix',
      'INV',
    );
    const currentStr = await this.settingsService.getValue(
      ownerId,
      'invoice_next_number',
      '1',
    );
    const current = parseInt(currentStr, 10);
    const invoiceNumber = `${prefix}-${String(current).padStart(4, '0')}`;

    // Increment for next
    await this.settingsService.update(
      ownerId,
      'invoice_next_number',
      String(current + 1),
    );

    return invoiceNumber;
  }

  private async generateCollisionSafeNumber(ownerId: string): Promise<string> {
    const prefix = await this.settingsService.getValue(
      ownerId,
      'invoice_prefix',
      'INV',
    );
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14);
    const suffix = Math.floor(Math.random() * 900 + 100);
    return `${prefix}-${timestamp}-${suffix}`;
  }

  private isInvoiceNumberUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = (
      error as QueryFailedError & {
        driverError?: {
          code?: string;
          constraint?: string;
          detail?: string;
          message?: string;
        };
      }
    ).driverError;

    if (driverError?.code !== '23505') {
      return false;
    }

    const constraint = (driverError.constraint ?? '').toLowerCase();
    const detail = (driverError.detail ?? '').toLowerCase();
    const message = (driverError.message ?? '').toLowerCase();

    return (
      constraint.includes('invoice') ||
      detail.includes('invoice_number') ||
      message.includes('invoice_number')
    );
  }
}
