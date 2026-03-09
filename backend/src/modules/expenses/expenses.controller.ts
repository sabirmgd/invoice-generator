import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { OwnerId } from '../auth/decorators/owner-id.decorator';

@ApiTags('Expenses')
@Controller('api/v1/expenses')
@UseGuards(OptionalAuthGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({ summary: 'Create an expense' })
  create(@OwnerId() ownerId: string, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(ownerId, dto);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get expense summary by category' })
  getSummary(@OwnerId() ownerId: string) {
    return this.expensesService.getSummary(ownerId);
  }

  @Get()
  @ApiOperation({ summary: 'List expenses (paginated)' })
  findAll(@OwnerId() ownerId: string, @Query() query: QueryExpenseDto) {
    return this.expensesService.findAll(ownerId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single expense' })
  findOne(@OwnerId() ownerId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.findOne(ownerId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an expense' })
  update(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(ownerId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete an expense' })
  remove(@OwnerId() ownerId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.remove(ownerId, id);
  }
}
