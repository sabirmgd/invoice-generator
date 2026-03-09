import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstimateStatus } from '../../../db/entities/estimate.entity';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryEstimateDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EstimateStatus })
  @IsOptional()
  @IsEnum(EstimateStatus)
  status?: EstimateStatus;
}
