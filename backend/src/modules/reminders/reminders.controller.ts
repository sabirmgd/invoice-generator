import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RemindersService } from './reminders.service';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { OwnerId } from '../auth/decorators/owner-id.decorator';
import { UpdateReminderConfigDto } from './dto/update-reminder-config.dto';

@ApiTags('Reminders')
@Controller('api/v1/reminders')
@UseGuards(OptionalAuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get reminder configuration' })
  getConfig(@OwnerId() ownerId: string) {
    return this.remindersService.getConfig(ownerId);
  }

  @Patch('config')
  @ApiOperation({ summary: 'Update reminder configuration' })
  updateConfig(
    @OwnerId() ownerId: string,
    @Body() dto: UpdateReminderConfigDto,
  ) {
    return this.remindersService.updateConfig(ownerId, dto);
  }
}
