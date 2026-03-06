'use client';

import { FormEvent, useState } from 'react';
import { Profile, ProfileType } from '@/lib/types';

type ProfileFormState = {
  type: ProfileType;
  name: string;
  isDefault: boolean;
  companyName: string;
  email: string;
  phone: string;
  taxId: string;
  addressLine1: string;
  city: string;
  country: string;
  bankName: string;
  iban: string;
  swiftCode: string;
  accountHolder: string;
};

const emptyForm: ProfileFormState = {
  type: 'sender',
  name: '',
  isDefault: false,
  companyName: '',
  email: '',
  phone: '',
  taxId: '',
  addressLine1: '',
  city: '',
  country: '',
  bankName: '',
  iban: '',
  swiftCode: '',
  accountHolder: '',
};

interface ProfileFormProps {
  sessionId: string;
  authToken: string;
  apiFetch: <T>(path: string, init?: RequestInit) => Promise<T>;
  onCreated: () => Promise<unknown>;
}

export function ProfileForm({ apiFetch, onCreated }: ProfileFormProps) {
  const [form, setForm] = useState<ProfileFormState>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError('Profile name is required');
      return;
    }

    setCreating(true);
    setError('');
    setNotice('');

    try {
      const payload: Record<string, unknown> = {
        type: form.type,
        name: form.name.trim(),
        isDefault: form.isDefault,
      };

      const optionalFields: Array<keyof Omit<ProfileFormState, 'type' | 'isDefault' | 'name'>> = [
        'companyName', 'email', 'phone', 'taxId', 'addressLine1',
        'city', 'country', 'bankName', 'iban', 'swiftCode', 'accountHolder',
      ];

      for (const key of optionalFields) {
        const value = form[key].trim();
        if (value) payload[key] = value;
      }

      await apiFetch<Profile>('/api/v1/profiles', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setForm(emptyForm);
      setNotice('Profile created');
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setCreating(false);
    }
  }

  const showBankFields = form.type === 'bank';

  return (
    <div className="rounded-xl border border-border bg-surface/50 p-4">
      <h3 className="text-sm font-semibold text-foreground">Create Profile</h3>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {notice && <p className="mt-2 text-xs text-green-600">{notice}</p>}

      <form onSubmit={handleSubmit} className="mt-3 grid gap-2.5">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-foreground/70">
            Type
            <select
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as ProfileType }))}
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
            >
              <option value="sender">Sender</option>
              <option value="client">Client</option>
              <option value="bank">Bank</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-foreground/70">
            Name *
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
              placeholder="Acme LLC"
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
            />
          </label>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-foreground/70">
            Company
            <input
              value={form.companyName}
              onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-foreground/70">
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
            />
          </label>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-foreground/70">
            Phone
            <input
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-foreground/70">
            Tax ID
            <input
              value={form.taxId}
              onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))}
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
            />
          </label>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-foreground/70">
            Address
            <input
              value={form.addressLine1}
              onChange={(e) => setForm((p) => ({ ...p, addressLine1: e.target.value }))}
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-foreground/70">
            City
            <input
              value={form.city}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm text-foreground/70">
          Country
          <input
            value={form.country}
            onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
          />
        </label>

        {showBankFields && (
          <>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-foreground/70">
                Bank Name
                <input
                  value={form.bankName}
                  onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))}
                  className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-foreground/70">
                Account Holder
                <input
                  value={form.accountHolder}
                  onChange={(e) => setForm((p) => ({ ...p, accountHolder: e.target.value }))}
                  className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                />
              </label>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-foreground/70">
                IBAN
                <input
                  value={form.iban}
                  onChange={(e) => setForm((p) => ({ ...p, iban: e.target.value }))}
                  className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-foreground/70">
                SWIFT
                <input
                  value={form.swiftCode}
                  onChange={(e) => setForm((p) => ({ ...p, swiftCode: e.target.value }))}
                  className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                />
              </label>
            </div>
          </>
        )}

        <label className="inline-flex items-center gap-2 text-sm text-foreground/70">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => setForm((p) => ({ ...p, isDefault: e.target.checked }))}
            className="size-4 rounded border-border"
          />
          Set as default for this type
        </label>

        <button
          type="submit"
          disabled={creating}
          className="h-9 rounded-lg bg-primary text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'Create profile'}
        </button>
      </form>
    </div>
  );
}
