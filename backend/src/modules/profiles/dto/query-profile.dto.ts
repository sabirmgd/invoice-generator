import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProfileType } from '../../../db/entities/profile.entity';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryProfileDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ProfileType })
  @IsOptional()
  @IsEnum(ProfileType)
  type?: ProfileType;
}
