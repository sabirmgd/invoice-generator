'use client';

import { useApp } from '@/lib/context/app-context';
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
