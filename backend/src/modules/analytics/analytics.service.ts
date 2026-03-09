import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../../db/entities/invoice.entity';
import { Estimate, EstimateStatus } from '../../db/entities/estimate.entity';
import {
  DashboardAnalytics,
  SummaryCards,
  RevenueByMonth,
  InvoicesByStatus,
  EstimateConversion,
  RecentActivityItem,
  TopClient,
} from './interfaces/dashboard-analytics.interface';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Estimate)
    private readonly estimateRepo: Repository<Estimate>,
  ) {}

  async getDashboard(ownerId: string): Promise<DashboardAnalytics> {
    const [
      summary,
      revenueByMonth,
      invoicesByStatus,
      estimateConversion,
      recentActivity,
      topClients,
    ] = await Promise.all([
      this.getSummaryCards(ownerId),
      this.getRevenueByMonth(ownerId),
      this.getInvoicesByStatus(ownerId),
      this.getEstimateConversion(ownerId),
      this.getRecentActivity(ownerId),
      this.getTopClients(ownerId),
    ]);

    return {
      summary,
      revenueByMonth,
      invoicesByStatus,
      estimateConversion,
      recentActivity,
      topClients,
    };
  }

  private async getSummaryCards(ownerId: string): Promise<SummaryCards> {
    const [revenueResult, outstandingResult, estimatesPending] =
      await Promise.all([
        this.invoiceRepo
          .createQueryBuilder('inv')
          .select('COALESCE(SUM(inv.total), 0)', 'totalRevenue')
          .where('inv.ownerId = :ownerId', { ownerId })
          .andWhere('inv.status = :status', { status: 'paid' })
          .andWhere('inv.deletedAt IS NULL')
          .getRawOne<{ totalRevenue: string }>(),

        this.invoiceRepo
          .createQueryBuilder('inv')
          .select('COALESCE(SUM(inv.total), 0)', 'outstanding')
          .addSelect(
            `COUNT(*) FILTER (WHERE inv.due_date < CURRENT_DATE)`,
            'overdueCount',
          )
          .where('inv.ownerId = :ownerId', { ownerId })
          .andWhere('inv.status = :status', { status: 'sent' })
          .andWhere('inv.deletedAt IS NULL')
          .getRawOne<{ outstanding: string; overdueCount: string }>(),

        this.estimateRepo.count({
          where: { ownerId, status: EstimateStatus.SENT },
        }),
      ]);

    return {
      totalRevenue: parseFloat(revenueResult?.totalRevenue || '0'),
      outstandingAmount: parseFloat(outstandingResult?.outstanding || '0'),
      overdueCount: parseInt(outstandingResult?.overdueCount || '0', 10),
      estimatesPending,
    };
  }

  private async getRevenueByMonth(ownerId: string): Promise<RevenueByMonth[]> {
    const raw = await this.invoiceRepo
      .createQueryBuilder('inv')
      .select(`TO_CHAR(DATE_TRUNC('month', inv.paid_at), 'YYYY-MM')`, 'month')
      .addSelect(`TO_CHAR(DATE_TRUNC('month', inv.paid_at), 'Mon')`, 'label')
      .addSelect('COALESCE(SUM(inv.total), 0)', 'revenue')
      .where('inv.ownerId = :ownerId', { ownerId })
      .andWhere('inv.status = :status', { status: 'paid' })
      .andWhere(
        `inv.paid_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')`,
      )
      .andWhere('inv.deletedAt IS NULL')
      .groupBy(`DATE_TRUNC('month', inv.paid_at)`)
      .orderBy('month', 'ASC')
      .getRawMany<{ month: string; label: string; revenue: string }>();

    // Build a full 6-month window, filling gaps with 0
    const months: RevenueByMonth[] = [];
    const now = new Date();
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const found = raw.find((r) => r.month === key);
      months.push({
        month: key,
        label: monthNames[d.getMonth()],
        revenue: found ? parseFloat(found.revenue) : 0,
      });
    }

    return months;
  }

  private async getInvoicesByStatus(
    ownerId: string,
  ): Promise<InvoicesByStatus[]> {
    const raw = await this.invoiceRepo
      .createQueryBuilder('inv')
      .select('inv.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(inv.total), 0)', 'amount')
      .where('inv.ownerId = :ownerId', { ownerId })
      .andWhere('inv.deletedAt IS NULL')
      .groupBy('inv.status')
      .getRawMany<{ status: string; count: string; amount: string }>();

    return raw.map((r) => ({
      status: r.status,
      count: parseInt(r.count, 10),
      amount: parseFloat(r.amount),
    }));
  }

  private async getEstimateConversion(
    ownerId: string,
  ): Promise<EstimateConversion> {
    const raw = await this.estimateRepo
      .createQueryBuilder('est')
      .select(`COUNT(*) FILTER (WHERE est.status != 'draft')`, 'totalNonDraft')
      .addSelect(
        `COUNT(*) FILTER (WHERE est.status IN ('accepted', 'converted'))`,
        'converted',
      )
      .where('est.ownerId = :ownerId', { ownerId })
      .andWhere('est.deletedAt IS NULL')
      .getRawOne<{ totalNonDraft: string; converted: string }>();

    const totalNonDraft = parseInt(raw?.totalNonDraft || '0', 10);
    const converted = parseInt(raw?.converted || '0', 10);

    return {
      totalNonDraft,
      converted,
      conversionRate:
        totalNonDraft > 0
          ? Math.round((converted / totalNonDraft) * 100 * 10) / 10
          : 0,
    };
  }

  private async getRecentActivity(
    ownerId: string,
  ): Promise<RecentActivityItem[]> {
    const [invoices, estimates] = await Promise.all([
      this.invoiceRepo
        .createQueryBuilder('inv')
        .leftJoinAndSelect('inv.clientProfile', 'client')
        .where('inv.ownerId = :ownerId', { ownerId })
        .andWhere('inv.deletedAt IS NULL')
        .orderBy('inv.updatedAt', 'DESC')
        .take(10)
        .getMany(),
      this.estimateRepo
        .createQueryBuilder('est')
        .leftJoinAndSelect('est.clientProfile', 'client')
        .where('est.ownerId = :ownerId', { ownerId })
        .andWhere('est.deletedAt IS NULL')
        .orderBy('est.updatedAt', 'DESC')
        .take(10)
        .getMany(),
    ]);

    const items: RecentActivityItem[] = [
      ...invoices.map((inv) => ({
        id: inv.id,
        type: 'invoice' as const,
        number: inv.invoiceNumber,
        clientName: inv.clientProfile?.name || 'Unknown',
        status: inv.status,
        total: parseFloat(String(inv.total)),
        currency: inv.currency,
        date: inv.updatedAt.toISOString(),
      })),
      ...estimates.map((est) => ({
        id: est.id,
        type: 'estimate' as const,
        number: est.estimateNumber,
        clientName: est.clientProfile?.name || 'Unknown',
        status: est.status,
        total: parseFloat(String(est.total)),
        currency: est.currency,
        date: est.updatedAt.toISOString(),
      })),
    ];

    items.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return items.slice(0, 10);
  }

  private async getTopClients(ownerId: string): Promise<TopClient[]> {
    const raw = await this.invoiceRepo
      .createQueryBuilder('inv')
      .select('inv.clientProfileId', 'clientId')
      .addSelect('client.name', 'clientName')
      .addSelect('COALESCE(SUM(inv.total), 0)', 'totalRevenue')
      .addSelect('COUNT(*)', 'invoiceCount')
      .leftJoin('inv.clientProfile', 'client')
      .where('inv.ownerId = :ownerId', { ownerId })
      .andWhere('inv.status = :status', { status: 'paid' })
      .andWhere('inv.deletedAt IS NULL')
      .groupBy('inv.clientProfileId')
      .addGroupBy('client.name')
      .orderBy('totalRevenue', 'DESC')
      .limit(5)
      .getRawMany<{
        clientId: string;
        clientName: string;
        totalRevenue: string;
        invoiceCount: string;
      }>();

    return raw.map((r) => ({
      clientId: r.clientId,
      clientName: r.clientName || 'Unknown',
      totalRevenue: parseFloat(r.totalRevenue),
      invoiceCount: parseInt(r.invoiceCount, 10),
    }));
  }
}
