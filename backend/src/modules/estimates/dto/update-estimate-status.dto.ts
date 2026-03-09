import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EstimateStatus } from '../../../db/entities/estimate.entity';

export class UpdateEstimateStatusDto {
  @ApiProperty({ enum: EstimateStatus })
  @IsEnum(EstimateStatus)
  status!: EstimateStatus;
}
