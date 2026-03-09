import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estimate } from '../../db/entities/estimate.entity';
import { EstimateItem } from '../../db/entities/estimate-item.entity';
import { EstimatesController } from './estimates.controller';
import { EstimatesService } from './estimates.service';
import { SettingsModule } from '../settings/settings.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { PdfModule } from '../pdf/pdf.module';
import { EmailModule } from '../email/email.module';
import { PortalModule } from '../portal/portal.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Estimate, EstimateItem]),
    SettingsModule,
    ProfilesModule,
    PdfModule,
    EmailModule,
    forwardRef(() => PortalModule),
    forwardRef(() => InvoicesModule),
  ],
  controllers: [EstimatesController],
  providers: [EstimatesService],
  exports: [EstimatesService],
})
export class EstimatesModule {}
