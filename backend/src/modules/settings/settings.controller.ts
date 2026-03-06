import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { OwnerId } from '../auth/decorators/owner-id.decorator';

@ApiTags('Settings')
@Controller('api/v1/settings')
@UseGuards(OptionalAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'List all settings' })
  async findAll(@OwnerId() ownerId: string) {
    await this.settingsService.ensureDefaults(ownerId);
    return this.settingsService.findAll(ownerId);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a setting by key' })
  async findByKey(@OwnerId() ownerId: string, @Param('key') key: string) {
    await this.settingsService.ensureDefaults(ownerId);
    return this.settingsService.findByKey(ownerId, key);
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Update a setting value' })
  async update(
    @OwnerId() ownerId: string,
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
  ) {
    await this.settingsService.ensureDefaults(ownerId);
    return this.settingsService.update(ownerId, key, dto.value);
  }
}
