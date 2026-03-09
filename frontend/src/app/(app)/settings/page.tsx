'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import { ReminderConfig, Setting } from '@/lib/types';
import { SettingsForm } from '@/components/settings/settings-form';
import { LogoUpload } from '@/components/settings/logo-upload';
import { ProfileForm } from '@/components/settings/profile-form';
import { ProfileList } from '@/components/settings/profile-list';

export default function SettingsPage() {
  const {
    editableSettings,
    logoDataUrl,
    profiles,
    sessionId,
    authToken,
    settingsByKey,
    refreshWorkspaceData,
    apiFetch,
  } = useApp();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Configure your invoice defaults, branding, and saved profiles.
        </p>
      </div>

      {/* Invoice Defaults */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Invoice Defaults</h2>
        <SettingsForm
          settings={editableSettings}
          apiFetch={apiFetch}
          onSaved={refreshWorkspaceData}
        />
      </section>

      {/* Logo */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Invoice Logo</h2>
        <LogoUpload
          logoDataUrl={logoDataUrl}
          apiFetch={apiFetch}
          onSaved={refreshWorkspaceData}
        />
      </section>

      {/* Invoice Template */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Invoice Template</h2>
        <p className="text-sm text-text-secondary">
          Choose a PDF design and accent color for your invoices.
        </p>
        <TemplateSelector
          currentTemplate={settingsByKey.invoice_template || 'classic'}
          currentColor={settingsByKey.invoice_accent_color || '#2563eb'}
          apiFetch={apiFetch}
          onSaved={refreshWorkspaceData}
        />
      </section>

      {/* Payment Reminders */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Payment Reminders</h2>
        <p className="text-sm text-text-secondary">
          Automatically remind clients about upcoming and overdue invoices.
        </p>
        <ReminderSettings apiFetch={apiFetch} />
      </section>

      {/* AI Configuration */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">AI Configuration</h2>
        <p className="text-sm text-text-secondary">
          AI provider and API key are configured per-session from the chat interface on the home page.
        </p>
      </section>

      {/* Saved Profiles */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Saved Profiles</h2>
        <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          <ProfileForm
            sessionId={sessionId}
            authToken={authToken}
            apiFetch={apiFetch}
            onCreated={refreshWorkspaceData}
          />
          <ProfileList profiles={profiles} />
        </div>
      </section>
    </div>
  );
}

function ReminderSettings({ apiFetch }: { apiFetch: <T>(path: string, init?: RequestInit) => Promise<T> }) {
  const [config, setConfig] = useState<ReminderConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const data = await apiFetch<ReminderConfig>('/api/v1/reminders/config');
      setConfig({
        ...data,
        daysBeforeDue: Number(data.daysBeforeDue),
        daysAfterDue: Number(data.daysAfterDue),
        maxOverdueReminders: Number(data.maxOverdueReminders),
        lateFeeValue: Number(data.lateFeeValue),
        lateFeeGraceDays: Number(data.lateFeeGraceDays),
      });
    } catch {
      // Config may not exist yet, use defaults
      setConfig({
        ownerId: '',
        enableBeforeDue: true,
        daysBeforeDue: 3,
        enableOnDue: true,
        enableOverdue: true,
        daysAfterDue: 1,
        maxOverdueReminders: 3,
        enableLateFees: false,
        lateFeeType: 'percentage',
        lateFeeValue: 5,
        lateFeeGraceDays: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setMessage('');
    try {
      await apiFetch('/api/v1/reminders/config', {
        method: 'PATCH',
        body: JSON.stringify({
          enableBeforeDue: config.enableBeforeDue,
          daysBeforeDue: config.daysBeforeDue,
          enableOnDue: config.enableOnDue,
          enableOverdue: config.enableOverdue,
          daysAfterDue: config.daysAfterDue,
          maxOverdueReminders: config.maxOverdueReminders,
          enableLateFees: config.enableLateFees,
          lateFeeType: config.lateFeeType,
          lateFeeValue: Number(config.lateFeeValue),
          lateFeeGraceDays: Number(config.lateFeeGraceDays),
        }),
      });
      setMessage('Saved');
      setIsError(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save');
      setIsError(true);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !config) return <p className="text-sm text-text-secondary">Loading...</p>;

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      {/* Before due */}
      <div className="flex items-center justify-between">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableBeforeDue}
              onChange={(e) => setConfig({ ...config, enableBeforeDue: e.target.checked })}
              className="rounded"
            />
            Remind before due date
          </label>
          <p className="ml-6 text-xs text-text-secondary">Send a reminder before the invoice is due</p>
        </div>
        {config.enableBeforeDue && (
          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <input
              type="number"
              min={1}
              max={30}
              value={config.daysBeforeDue}
              onChange={(e) => setConfig({ ...config, daysBeforeDue: Number(e.target.value) })}
              className="h-8 w-16 rounded-lg border border-border bg-background px-2 text-center text-sm text-foreground"
            />
            days before
          </label>
        )}
      </div>

      {/* On due */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={config.enableOnDue}
            onChange={(e) => setConfig({ ...config, enableOnDue: e.target.checked })}
            className="rounded"
          />
          Remind on due date
        </label>
        <p className="ml-6 text-xs text-text-secondary">Send a reminder when the invoice is due</p>
      </div>

      {/* Overdue */}
      <div className="flex items-center justify-between">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableOverdue}
              onChange={(e) => setConfig({ ...config, enableOverdue: e.target.checked })}
              className="rounded"
            />
            Remind when overdue
          </label>
          <p className="ml-6 text-xs text-text-secondary">Send reminders after the due date has passed</p>
        </div>
        {config.enableOverdue && (
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <label className="flex items-center gap-1">
              Every
              <input
                type="number"
                min={1}
                max={30}
                value={config.daysAfterDue}
                onChange={(e) => setConfig({ ...config, daysAfterDue: Number(e.target.value) })}
                className="h-8 w-16 rounded-lg border border-border bg-background px-2 text-center text-sm text-foreground"
              />
              days
            </label>
            <label className="flex items-center gap-1">
              Max
              <input
                type="number"
                min={1}
                max={10}
                value={config.maxOverdueReminders}
                onChange={(e) => setConfig({ ...config, maxOverdueReminders: Number(e.target.value) })}
                className="h-8 w-16 rounded-lg border border-border bg-background px-2 text-center text-sm text-foreground"
              />
            </label>
          </div>
        )}
      </div>

      {/* Late Fees */}
      <div className="space-y-3 border-t border-border pt-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableLateFees}
              onChange={(e) => setConfig({ ...config, enableLateFees: e.target.checked })}
              className="rounded"
            />
            Apply late fees automatically
          </label>
          <p className="ml-6 text-xs text-text-secondary">Charge a fee on overdue invoices</p>
        </div>
        {config.enableLateFees && (
          <div className="ml-6 space-y-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="radio"
                  name="lateFeeType"
                  checked={config.lateFeeType === 'percentage'}
                  onChange={() => setConfig({ ...config, lateFeeType: 'percentage' })}
                />
                Percentage
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="radio"
                  name="lateFeeType"
                  checked={config.lateFeeType === 'fixed'}
                  onChange={() => setConfig({ ...config, lateFeeType: 'fixed' })}
                />
                Fixed amount
              </label>
            </div>
            <div className="flex items-center gap-3 text-xs text-text-secondary">
              <label className="flex items-center gap-1">
                {config.lateFeeType === 'percentage' ? 'Rate' : 'Amount'}
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={config.lateFeeType === 'percentage' ? 0.5 : 1}
                  value={config.lateFeeValue}
                  onChange={(e) => setConfig({ ...config, lateFeeValue: Number(e.target.value) })}
                  className="h-8 w-20 rounded-lg border border-border bg-background px-2 text-center text-sm text-foreground"
                />
                {config.lateFeeType === 'percentage' ? '%' : ''}
              </label>
              <label className="flex items-center gap-1">
                Grace period
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={config.lateFeeGraceDays}
                  onChange={(e) => setConfig({ ...config, lateFeeGraceDays: Number(e.target.value) })}
                  className="h-8 w-16 rounded-lg border border-border bg-background px-2 text-center text-sm text-foreground"
                />
                days
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Reminders'}
        </button>
        {message && <span className={`text-sm ${isError ? 'text-red-600' : 'text-green-600'}`}>{message}</span>}
      </div>
    </div>
  );
}

const TEMPLATES = [
  { id: 'classic', name: 'Classic', desc: 'Traditional layout with clean lines' },
  { id: 'modern', name: 'Modern', desc: 'Full-width colored header, minimal borders' },
  { id: 'bold', name: 'Bold', desc: 'Accent sidebar with dramatic styling' },
] as const;

const PRESET_COLORS = ['#2563eb', '#059669', '#dc2626', '#7c3aed', '#ea580c', '#0891b2'];

function TemplateSelector({
  currentTemplate,
  currentColor,
  apiFetch,
  onSaved,
}: {
  currentTemplate: string;
  currentColor: string;
  apiFetch: <T>(path: string, init?: RequestInit) => Promise<T>;
  onSaved: () => Promise<unknown>;
}) {
  const [template, setTemplate] = useState(currentTemplate);
  const [color, setColor] = useState(currentColor);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setTemplate(currentTemplate);
    setColor(currentColor);
  }, [currentTemplate, currentColor]);

  const isDirty = template !== currentTemplate || color !== currentColor;

  async function handleSave() {
    setSaving(true);
    setMessage('');
    try {
      await Promise.all([
        apiFetch('/api/v1/settings/invoice_template', {
          method: 'PATCH',
          body: JSON.stringify({ value: template }),
        }),
        apiFetch('/api/v1/settings/invoice_accent_color', {
          method: 'PATCH',
          body: JSON.stringify({ value: color }),
        }),
      ]);
      await onSaved();
      setMessage('Saved');
      setIsError(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save');
      setIsError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTemplate(t.id)}
            className={`rounded-lg border-2 p-3 text-left transition-colors ${
              template === t.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
            }`}
          >
            <TemplateMiniPreview template={t.id} color={color} />
            <p className="mt-2 text-sm font-medium text-foreground">{t.name}</p>
            <p className="text-xs text-text-secondary">{t.desc}</p>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Accent Color</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full border-2 transition-transform ${
                  color === c ? 'border-foreground scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-7 w-7 cursor-pointer rounded border-0 p-0"
          />
          <span className="text-xs text-text-secondary font-mono">{color}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Template'}
        </button>
        {message && (
          <span className={`text-sm ${isError ? 'text-red-600' : 'text-green-600'}`}>{message}</span>
        )}
      </div>
    </div>
  );
}

function TemplateMiniPreview({ template, color }: { template: string; color: string }) {
  const light = `${color}20`;
  if (template === 'modern') {
    return (
      <svg viewBox="0 0 120 80" className="w-full rounded border border-border bg-white">
        <rect x="0" y="0" width="120" height="20" fill={color} />
        <text x="6" y="14" fontSize="8" fill="white" fontWeight="bold">INVOICE</text>
        <rect x="6" y="26" width="30" height="3" rx="1" fill="#d1d5db" />
        <rect x="70" y="26" width="30" height="3" rx="1" fill="#d1d5db" />
        <line x1="6" y1="38" x2="114" y2="38" stroke={color} strokeWidth="0.5" />
        <rect x="6" y="40" width="108" height="3" rx="1" fill="#e5e7eb" />
        <rect x="6" y="46" width="108" height="3" rx="1" fill="#f3f4f6" />
        <rect x="6" y="52" width="108" height="3" rx="1" fill="#e5e7eb" />
        <rect x="70" y="62" width="44" height="14" rx="3" fill={light} stroke={color} strokeWidth="0.5" />
        <text x="80" y="72" fontSize="5" fill={color} fontWeight="bold">Total</text>
      </svg>
    );
  }
  if (template === 'bold') {
    return (
      <svg viewBox="0 0 120 80" className="w-full rounded border border-border bg-white">
        <rect x="0" y="0" width="14" height="80" fill={color} />
        <text x="7" y="50" fontSize="6" fill="white" fontWeight="bold" textAnchor="middle" transform="rotate(-90, 7, 50)">INVOICE</text>
        <rect x="20" y="8" width="40" height="4" rx="1" fill="#111827" />
        <rect x="20" y="16" width="20" height="3" rx="1" fill={color} />
        <rect x="20" y="28" width="30" height="3" rx="1" fill="#d1d5db" />
        <rect x="66" y="28" width="30" height="3" rx="1" fill="#d1d5db" />
        <rect x="20" y="40" width="94" height="5" fill={color} />
        <rect x="20" y="48" width="94" height="3" rx="1" fill="#e5e7eb" />
        <rect x="20" y="54" width="94" height="3" rx="1" fill="#f3f4f6" />
        <rect x="70" y="62" width="44" height="14" rx="3" fill={light} stroke={color} strokeWidth="0.5" />
        <text x="80" y="72" fontSize="5" fill={color} fontWeight="bold">Total</text>
      </svg>
    );
  }
  // classic
  return (
    <svg viewBox="0 0 120 80" className="w-full rounded border border-border bg-white">
      <text x="6" y="14" fontSize="10" fill="#111827" fontWeight="bold">INVOICE</text>
      <rect x="80" y="6" width="34" height="3" rx="1" fill="#d1d5db" />
      <rect x="80" y="12" width="34" height="3" rx="1" fill="#d1d5db" />
      <line x1="6" y1="20" x2="114" y2="20" stroke={color} strokeWidth="1" />
      <rect x="6" y="26" width="30" height="3" rx="1" fill="#d1d5db" />
      <rect x="70" y="26" width="30" height="3" rx="1" fill="#d1d5db" />
      <rect x="6" y="40" width="108" height="5" rx="1" fill="#f3f4f6" />
      <rect x="6" y="48" width="108" height="3" rx="1" fill="#e5e7eb" />
      <rect x="6" y="54" width="108" height="3" rx="1" fill="#f3f4f6" />
      <rect x="70" y="62" width="44" height="14" rx="3" fill="#f8fafc" stroke="#d1d5db" strokeWidth="0.5" />
      <text x="80" y="72" fontSize="5" fill="#374151" fontWeight="bold">Total</text>
    </svg>
  );
}
