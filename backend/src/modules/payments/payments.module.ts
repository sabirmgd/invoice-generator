import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { InvoicesModule } from '../invoices/invoices.module';
import { PortalModule } from '../portal/portal.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => InvoicesModule),
    forwardRef(() => PortalModule),
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
