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
import { RecurringService } from './recurring.service';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { OwnerId } from '../auth/decorators/owner-id.decorator';
import { CreateRecurringDto } from './dto/create-recurring.dto';

@ApiTags('Recurring Invoices')
@Controller('api/v1/recurring')
@UseGuards(OptionalAuthGuard)
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  @Post()
  @ApiOperation({ summary: 'Create a recurring invoice' })
  create(@OwnerId() ownerId: string, @Body() dto: CreateRecurringDto) {
    return this.recurringService.create(ownerId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List recurring invoices' })
  findAll(
    @OwnerId() ownerId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.recurringService.findAll(ownerId, { page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a recurring invoice' })
  findOne(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.recurringService.findOne(ownerId, id);
  }

  @Patch(':id/pause')
  @ApiOperation({ summary: 'Pause a recurring invoice' })
  pause(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.recurringService.pause(ownerId, id);
  }

  @Patch(':id/resume')
  @ApiOperation({ summary: 'Resume a recurring invoice' })
  resume(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.recurringService.resume(ownerId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a recurring invoice' })
  remove(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.recurringService.remove(ownerId, id);
  }
}
