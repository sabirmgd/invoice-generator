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
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { QueryProfileDto } from './dto/query-profile.dto';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { OwnerId } from '../auth/decorators/owner-id.decorator';

@ApiTags('Profiles')
@Controller('api/v1/profiles')
@UseGuards(OptionalAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a profile (sender, client, or bank)' })
  create(@OwnerId() ownerId: string, @Body() dto: CreateProfileDto) {
    return this.profilesService.create(ownerId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List profiles with optional type filter' })
  findAll(@OwnerId() ownerId: string, @Query() query: QueryProfileDto) {
    return this.profilesService.findAll(ownerId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a profile by ID' })
  findOne(@OwnerId() ownerId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.profilesService.findOne(ownerId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a profile' })
  update(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profilesService.update(ownerId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a profile' })
  remove(@OwnerId() ownerId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.profilesService.remove(ownerId, id);
  }
}
