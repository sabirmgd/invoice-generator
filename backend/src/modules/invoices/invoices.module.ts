import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../../db/entities/invoice.entity';
import { InvoiceItem } from '../../db/entities/invoice-item.entity';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { SettingsModule } from '../settings/settings.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, InvoiceItem]),
    SettingsModule,
    ProfilesModule,
    PdfModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
