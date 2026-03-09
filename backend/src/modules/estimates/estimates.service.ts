import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Estimate, EstimateStatus } from '../../db/entities/estimate.entity';
import { EstimateItem } from '../../db/entities/estimate-item.entity';
import { ProfileType } from '../../db/entities/profile.entity';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { UpdateEstimateStatusDto } from './dto/update-estimate-status.dto';
import { QueryEstimateDto } from './dto/query-estimate.dto';
import { SettingsService } from '../settings/settings.service';
import { ProfilesService } from '../profiles/profiles.service';
import { InvoicesService } from '../invoices/invoices.service';
import { CreateInvoiceDto } from '../invoices/dto/create-invoice.dto';
import { findOneOrFail } from '../../common/utils/find-one-or-fail.util';
import { paginate, PaginatedResult } from '../../common/utils/pagination.util';
import { AppException } from '../../common/exceptions/app.exception';

@Injectable()
export class EstimatesService {
  constructor(
    @InjectRepository(Estimate)
    private readonly estimateRepo: Repository<Estimate>,
    @InjectRepository(EstimateItem)
    private readonly itemRepo: Repository<EstimateItem>,
    private readonly settingsService: SettingsService,
    private readonly profilesService: ProfilesService,
    private readonly invoicesService: InvoicesService,
  ) {}

  async create(ownerId: string, dto: CreateEstimateDto): Promise<Estimate> {
    await this.settingsService.ensureDefaults(ownerId);

    // Validate profiles
    await this.profilesService.findOne(ownerId, dto.senderProfileId);
    await this.profilesService.findOne(ownerId, dto.clientProfileId);

    // Resolve bank profile
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

    // Resolve estimate number
    const autoNumberRequested = !dto.estimateNumber;
    let estimateNumber =
      dto.estimateNumber || (await this.generateNextNumber(ownerId));

    // Resolve defaults
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

    let saved: Estimate | null = null;
    for (let attempt = 0; attempt < 3 && !saved; attempt++) {
      const estimate = this.estimateRepo.create({
        ownerId,
        estimateNumber,
        senderProfileId: dto.senderProfileId,
        clientProfileId: dto.clientProfileId,
        bankProfileId,
        issueDate: dto.issueDate,
        validUntil: dto.validUntil,
        currency,
        taxRate,
        subtotal,
        taxAmount,
        total,
        notes: dto.notes,
        items,
      });

      try {
        saved = await this.estimateRepo.save(estimate);
      } catch (error) {
        if (!this.isEstimateNumberUniqueViolation(error)) {
          throw error;
        }

        if (!autoNumberRequested) {
          throw new AppException(
            `Estimate number "${dto.estimateNumber}" already exists for this owner`,
            HttpStatus.CONFLICT,
          );
        }

        estimateNumber = await this.generateCollisionSafeNumber(ownerId);
      }
    }

    if (!saved) {
      throw new AppException(
        'Could not generate a unique estimate number. Please retry.',
        HttpStatus.CONFLICT,
      );
    }

    return this.findOne(ownerId, saved.id);
  }

  async findAll(
    ownerId: string,
    query: QueryEstimateDto,
  ): Promise<PaginatedResult<Estimate>> {
    const qb = this.estimateRepo
      .createQueryBuilder('est')
      .leftJoinAndSelect('est.senderProfile', 'sender')
      .leftJoinAndSelect('est.clientProfile', 'client')
      .leftJoinAndSelect('est.bankProfile', 'bank')
      .leftJoinAndSelect('est.items', 'items')
      .where('est.ownerId = :ownerId', { ownerId })
      .orderBy('est.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('est.status = :status', { status: query.status });
    }

    return paginate(qb, query);
  }

  async findOne(ownerId: string, id: string): Promise<Estimate> {
    const estimate = await findOneOrFail(this.estimateRepo, 'Estimate', id, {
      relations: ['senderProfile', 'clientProfile', 'bankProfile', 'items'],
    });
    if (estimate.ownerId !== ownerId) {
      throw new AppException('Estimate not found', HttpStatus.NOT_FOUND);
    }
    return estimate;
  }

  async findOneById(id: string): Promise<Estimate> {
    return findOneOrFail(this.estimateRepo, 'Estimate', id, {
      relations: ['senderProfile', 'clientProfile', 'bankProfile', 'items'],
    });
  }

  async updateStatus(
    ownerId: string,
    id: string,
    dto: UpdateEstimateStatusDto,
  ): Promise<Estimate> {
    const estimate = await this.findOne(ownerId, id);
    estimate.status = dto.status;
    await this.estimateRepo.save(estimate);
    return this.findOne(ownerId, id);
  }

  async convertToInvoice(ownerId: string, id: string) {
    const estimate = await this.findOne(ownerId, id);

    if (estimate.status !== EstimateStatus.ACCEPTED) {
      throw new AppException(
        'Only accepted estimates can be converted to invoices',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (estimate.convertedInvoiceId) {
      throw new AppException(
        'This estimate has already been converted to an invoice',
        HttpStatus.CONFLICT,
      );
    }

    // Build invoice DTO from estimate data
    const today = new Date().toISOString().slice(0, 10);
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const invoiceDto: CreateInvoiceDto = {
      senderProfileId: estimate.senderProfileId,
      clientProfileId: estimate.clientProfileId,
      bankProfileId: estimate.bankProfileId,
      issueDate: today,
      dueDate,
      currency: estimate.currency,
      taxRate: Number(estimate.taxRate),
      notes: estimate.notes,
      items: estimate.items.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        sortOrder: item.sortOrder,
      })),
    };

    const invoice = await this.invoicesService.create(ownerId, invoiceDto);

    // Mark estimate as converted
    await this.estimateRepo.update(id, {
      status: EstimateStatus.CONVERTED,
      convertedInvoiceId: invoice.id,
    });

    const updatedEstimate = await this.findOne(ownerId, id);
    return { estimate: updatedEstimate, invoice };
  }

  async getSummary(ownerId: string) {
    const total = await this.estimateRepo.count({ where: { ownerId } });

    const statusCounts = await this.estimateRepo
      .createQueryBuilder('est')
      .select('est.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(est.total), 0)', 'totalAmount')
      .where('est.ownerId = :ownerId', { ownerId })
      .groupBy('est.status')
      .getRawMany();

    return { total, statusCounts };
  }

  private async generateNextNumber(ownerId: string): Promise<string> {
    const prefix = await this.settingsService.getValue(
      ownerId,
      'estimate_prefix',
      'EST',
    );
    const currentStr = await this.settingsService.getValue(
      ownerId,
      'estimate_next_number',
      '1',
    );
    const current = parseInt(currentStr, 10);
    const estimateNumber = `${prefix}-${String(current).padStart(4, '0')}`;

    await this.settingsService.update(
      ownerId,
      'estimate_next_number',
      String(current + 1),
    );

    return estimateNumber;
  }

  private async generateCollisionSafeNumber(ownerId: string): Promise<string> {
    const prefix = await this.settingsService.getValue(
      ownerId,
      'estimate_prefix',
      'EST',
    );
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14);
    const suffix = Math.floor(Math.random() * 900 + 100);
    return `${prefix}-${timestamp}-${suffix}`;
  }

  private isEstimateNumberUniqueViolation(error: unknown): boolean {
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
      constraint.includes('estimate') ||
      detail.includes('estimate_number') ||
      message.includes('estimate_number')
    );
  }
}
