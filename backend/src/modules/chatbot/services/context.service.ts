import { Injectable } from '@nestjs/common';
import { SettingsService } from '../../settings/settings.service';
import { ProfilesService } from '../../profiles/profiles.service';
import { InvoicesService } from '../../invoices/invoices.service';

@Injectable()
export class ContextService {
  constructor(
    private readonly settings: SettingsService,
    private readonly profiles: ProfilesService,
    private readonly invoices: InvoicesService,
  ) {}

  async buildContext(ownerId: string): Promise<string> {
    const sections: string[] = [];

    // Settings
    const allSettings = await this.settings.findAll(ownerId);
    if (allSettings.length > 0) {
      const settingsStr = allSettings
        .map((s) => `${s.key}: ${s.value}`)
        .join(', ');
      sections.push(`SETTINGS: ${settingsStr}`);
    } else {
      sections.push('SETTINGS: None configured yet (defaults: Currency SAR, Tax 15%, Prefix INV)');
    }

    // Profiles
    const profileResult = await this.profiles.findAll(ownerId, { page: 1, limit: 50 });
    if (profileResult.items.length > 0) {
      const profileLines = profileResult.items.map(
        (p) => `[${p.type.toUpperCase()}] "${p.name}"${p.isDefault ? ' (default)' : ''} id=${p.id}`,
      );
      sections.push(`PROFILES (${profileResult.pagination.total}):\n${profileLines.join('\n')}`);
    } else {
      sections.push('PROFILES: None created yet');
    }

    // Invoices summary
    const summary = await this.invoices.getSummary(ownerId);
    if (summary.total > 0) {
      const statusStr = summary.statusCounts
        .map((s: { status: string; count: string }) => `${s.count} ${s.status}`)
        .join(', ');
      sections.push(
        `INVOICES: ${summary.total} total (${statusStr}) | Revenue: ${summary.revenue.toFixed(2)}`,
      );

      // Recent invoices
      const recent = await this.invoices.findAll(ownerId, { page: 1, limit: 5 });
      if (recent.items.length > 0) {
        const recentLines = recent.items.map(
          (inv) =>
            `${inv.invoiceNumber} → ${inv.clientProfile?.name ?? 'Unknown'} → ${inv.currency} ${Number(inv.total).toFixed(2)} → ${inv.status}`,
        );
        sections.push(`RECENT INVOICES:\n${recentLines.join('\n')}`);
      }
    } else {
      sections.push('INVOICES: None created yet');
    }

    return sections.join('\n\n');
  }
}
