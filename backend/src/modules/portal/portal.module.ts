import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortalToken } from '../../db/entities/portal-token.entity';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { InvoicesModule } from '../invoices/invoices.module';
import { EstimatesModule } from '../estimates/estimates.module';
import { PdfModule } from '../pdf/pdf.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PortalToken]),
    forwardRef(() => InvoicesModule),
    forwardRef(() => EstimatesModule),
    PdfModule,
    forwardRef(() => PaymentsModule),
  ],
  controllers: [PortalController],
  providers: [PortalService],
  exports: [PortalService],
})
export class PortalModule {}
