'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import { ReminderConfig } from '@/lib/types';
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

  const fetchConfig = useCallback(async () => {
    try {
      const data = await apiFetch<ReminderConfig>('/api/v1/reminders/config');
      setConfig(data);
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
        }),
      });
      setMessage('Saved');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save');
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

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Reminders'}
        </button>
        {message && <span className="text-sm text-green-600">{message}</span>}
      </div>
    </div>
  );
}
