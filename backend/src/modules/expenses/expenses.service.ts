import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from '../../db/entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';
import { HttpStatus } from '@nestjs/common';
import { findOneOrFail } from '../../common/utils/find-one-or-fail.util';
import { paginate, PaginatedResult } from '../../common/utils/pagination.util';
import { AppException } from '../../common/exceptions/app.exception';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
  ) {}

  async create(ownerId: string, dto: CreateExpenseDto): Promise<Expense> {
    const expense = this.expenseRepo.create({
      ownerId,
      ...dto,
    });
    return this.expenseRepo.save(expense);
  }

  async findAll(
    ownerId: string,
    query: QueryExpenseDto,
  ): Promise<PaginatedResult<Expense>> {
    const qb = this.expenseRepo
      .createQueryBuilder('exp')
      .where('exp.ownerId = :ownerId', { ownerId })
      .andWhere('exp.deletedAt IS NULL');

    if (query.category) {
      qb.andWhere('exp.category = :category', { category: query.category });
    }
    if (query.dateFrom) {
      qb.andWhere('exp.date >= :dateFrom', { dateFrom: query.dateFrom });
    }
    if (query.dateTo) {
      qb.andWhere('exp.date <= :dateTo', { dateTo: query.dateTo });
    }

    qb.orderBy('exp.date', 'DESC').addOrderBy('exp.createdAt', 'DESC');

    return paginate(qb, query);
  }

  async findOne(ownerId: string, id: string): Promise<Expense> {
    const expense = await findOneOrFail(this.expenseRepo, 'Expense', id);
    if (expense.ownerId !== ownerId) {
      throw new AppException('Expense not found', HttpStatus.NOT_FOUND);
    }
    return expense;
  }

  async update(
    ownerId: string,
    id: string,
    dto: UpdateExpenseDto,
  ): Promise<Expense> {
    const expense = await this.findOne(ownerId, id);
    Object.assign(expense, dto);
    return this.expenseRepo.save(expense);
  }

  async remove(ownerId: string, id: string): Promise<void> {
    await this.findOne(ownerId, id);
    await this.expenseRepo.softDelete(id);
  }

  async getSummary(ownerId: string): Promise<{
    total: number;
    byCategory: Array<{ category: string; total: number; count: number }>;
  }> {
    const raw = await this.expenseRepo
      .createQueryBuilder('exp')
      .select('exp.category', 'category')
      .addSelect('COALESCE(SUM(exp.amount), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('exp.ownerId = :ownerId', { ownerId })
      .andWhere('exp.deletedAt IS NULL')
      .groupBy('exp.category')
      .orderBy('total', 'DESC')
      .getRawMany<{ category: string; total: string; count: string }>();

    const byCategory = raw.map((r) => ({
      category: r.category,
      total: parseFloat(r.total),
      count: parseInt(r.count, 10),
    }));

    const total = byCategory.reduce((sum, c) => sum + c.total, 0);

    return { total, byCategory };
  }
}
