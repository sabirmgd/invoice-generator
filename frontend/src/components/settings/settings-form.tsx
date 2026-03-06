'use client';

import { useEffect, useState } from 'react';
import { Setting } from '@/lib/types';

interface SettingsFormProps {
  settings: Setting[];
  apiFetch: <T>(path: string, init?: RequestInit) => Promise<T>;
  onSaved: () => Promise<unknown>;
}

export function SettingsForm({ settings, apiFetch, onSaved }: SettingsFormProps) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(settings.map((s) => [s.key, s.value])),
  );
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Sync draft when settings change externally
  const settingsKeys = settings.map((s) => s.key).join(',');
  useEffect(() => {
    setDraft(Object.fromEntries(settings.map((s) => [s.key, s.value])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsKeys]);

  async function handleSave(key: string) {
    setSaving(key);
    setError('');
    setNotice('');

    try {
      await apiFetch(`/api/v1/settings/${key}`, {
        method: 'PATCH',
        body: JSON.stringify({ value: draft[key] ?? '' }),
      });
      setNotice(`Setting "${key}" updated`);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save setting');
    } finally {
      setSaving('');
    }
  }

  if (settings.length === 0) {
    return <p className="text-sm text-text-secondary">No settings found.</p>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}
      {notice && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">{notice}</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {settings.map((setting) => (
          <div key={setting.key} className="rounded-xl border border-border bg-surface/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              {setting.key.replace(/_/g, ' ')}
            </p>
            <input
              value={draft[setting.key] ?? ''}
              onChange={(e) => setDraft((prev) => ({ ...prev, [setting.key]: e.target.value }))}
              className="mt-2 h-9 w-full rounded-lg border border-border bg-background px-3 font-mono text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {setting.description && (
              <p className="mt-1.5 text-xs text-text-secondary">{setting.description}</p>
            )}
            <button
              type="button"
              onClick={() => void handleSave(setting.key)}
              disabled={saving === setting.key}
              className="mt-2 h-8 rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-background disabled:opacity-50"
            >
              {saving === setting.key ? 'Saving...' : 'Save'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
