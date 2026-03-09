'use client';

import { FormEvent, useCallback, useMemo, useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import { Estimate, Profile } from '@/lib/types';
import { CURRENCY_GROUPS, CURRENCIES } from '@/lib/currencies';
import Link from 'next/link';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

const emptyItem: LineItem = { description: '', quantity: 1, unitPrice: 0 };

interface EstimateFormProps {
  onEstimateCreated: (estimate: Estimate) => void;
}

export function EstimateForm({ onEstimateCreated }: EstimateFormProps) {
  const {
    senderProfiles,
    clientProfiles,
    bankProfiles,
    settingsByKey,
    logoDataUrl,
    apiFetch,
    refreshWorkspaceData,
  } = useApp();

  const [senderProfileId, setSenderProfileId] = useState('');
  const [clientProfileId, setClientProfileId] = useState('');
  const [bankProfileId, setBankProfileId] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [currency, setCurrency] = useState(() => settingsByKey.currency || 'USD');
  const [taxRate, setTaxRate] = useState(() => Number(settingsByKey.tax_rate) || 15);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ ...emptyItem }]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Auto-select defaults
  useState(() => {
    const defaultSender = senderProfiles.find((p) => p.isDefault) || senderProfiles[0];
    if (defaultSender) setSenderProfileId(defaultSender.id);

    const defaultClient = clientProfiles.find((p) => p.isDefault) || clientProfiles[0];
    if (defaultClient) setClientProfileId(defaultClient.id);

    const defaultBank = bankProfiles.find((p) => p.isDefault) || bankProfiles[0];
    if (defaultBank) setBankProfileId(defaultBank.id);
  });

  const selectedSender = useMemo(
    () => senderProfiles.find((p) => p.id === senderProfileId),
    [senderProfiles, senderProfileId],
  );
  const selectedClient = useMemo(
    () => clientProfiles.find((p) => p.id === clientProfileId),
    [clientProfiles, clientProfileId],
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items],
  );
  const taxAmount = useMemo(() => subtotal * taxRate / 100, [subtotal, taxRate]);
  const total = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);

  const updateItem = useCallback((index: number, field: keyof LineItem, value: string | number) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }, []);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, { ...emptyItem }]);
  }, []);

  const fmt = useCallback(
    (n: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(n),
    [currency],
  );

  async function handleSubmit(e: FormEvent, asDraft: boolean) {
    e.preventDefault();
    setError('');

    if (!senderProfileId) {
      setError('Please select a sender profile');
      return;
    }
    if (!clientProfileId) {
      setError('Please select a client profile');
      return;
    }
    if (items.every((item) => !item.description.trim())) {
      setError('Please add at least one line item');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        senderProfileId,
        clientProfileId,
        bankProfileId: bankProfileId || undefined,
        issueDate,
        validUntil,
        currency,
        taxRate,
        notes: notes.trim() || undefined,
        items: items
          .filter((item) => item.description.trim())
          .map((item, i) => ({
            description: item.description.trim(),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            sortOrder: i,
          })),
      };

      const created = await apiFetch<Estimate>('/api/v1/estimates', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!asDraft) {
        await apiFetch(`/api/v1/estimates/${created.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'sent' }),
        });
      }

      await refreshWorkspaceData();
      onEstimateCreated(created);

      setItems([{ ...emptyItem }]);
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create estimate');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <form className="flex flex-col gap-5 p-5" onSubmit={(e) => handleSubmit(e, false)}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {logoDataUrl ? (
              <img src={logoDataUrl} alt="Logo" className="h-10 w-10 rounded-lg object-contain" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-xs text-text-secondary">
                Logo
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-foreground">ESTIMATE</h2>
              <p className="text-xs text-text-secondary">Auto-generated number</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 text-right">
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              Date
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              Valid Until
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
              />
            </label>
          </div>
        </div>

        {/* Parties */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">From</span>
            {senderProfiles.length > 0 ? (
              <select
                value={senderProfileId}
                onChange={(e) => setSenderProfileId(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
              >
                <option value="">Select sender...</option>
                {senderProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.companyName ? ` (${p.companyName})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <Link href="/settings" className="text-xs text-primary hover:underline">
                + Create a sender profile
              </Link>
            )}
            {selectedSender && <ProfileDetails profile={selectedSender} />}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">To</span>
            {clientProfiles.length > 0 ? (
              <select
                value={clientProfileId}
                onChange={(e) => setClientProfileId(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
              >
                <option value="">Select client...</option>
                {clientProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.companyName ? ` (${p.companyName})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <Link href="/settings" className="text-xs text-primary hover:underline">
                + Create a client profile
              </Link>
            )}
            {selectedClient && <ProfileDetails profile={selectedClient} />}
          </div>
        </div>

        {/* Line Items */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">Items</span>
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_100px_100px_36px] gap-px bg-surface px-3 py-2 text-xs font-medium text-text-secondary">
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Price</span>
              <span className="text-right">Amount</span>
              <span />
            </div>

            {items.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_80px_100px_100px_36px] gap-px border-t border-border px-3 py-1.5 items-center"
              >
                <input
                  value={item.description}
                  onChange={(e) => updateItem(i, 'description', e.target.value)}
                  placeholder="Item description"
                  className="h-8 rounded border-0 bg-transparent px-1 text-sm text-foreground placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
                  className="h-8 rounded border-0 bg-transparent px-1 text-right text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={item.unitPrice}
                  onChange={(e) => updateItem(i, 'unitPrice', Number(e.target.value))}
                  className="h-8 rounded border-0 bg-transparent px-1 text-right text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <span className="text-right text-sm text-foreground">
                  {fmt(item.quantity * item.unitPrice)}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="flex h-7 w-7 items-center justify-center rounded text-text-secondary hover:bg-surface hover:text-red-500 transition-colors"
                  title="Remove item"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="self-start rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-text-secondary hover:border-primary hover:text-primary transition-colors"
          >
            + Add Line Item
          </button>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Subtotal</span>
              <span className="text-foreground">{fmt(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">
                Tax (
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="inline-block w-12 rounded border border-border bg-background px-1 text-center text-xs"
                />
                %)
              </span>
              <span className="text-foreground">{fmt(taxAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
              <span className="text-foreground">Total</span>
              <span className="text-foreground">{fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Notes + Settings */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="This estimate is valid for 30 days..."
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-text-secondary/50 resize-none"
            />
          </label>
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              Currency
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
              >
                {CURRENCY_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.codes.map((code) => {
                      const c = CURRENCIES.find((cur) => cur.code === code);
                      return c ? (
                        <option key={c.code} value={c.code}>
                          {c.code} — {c.symbol} {c.name}
                        </option>
                      ) : null;
                    })}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              Bank Account
              {bankProfiles.length > 0 ? (
                <select
                  value={bankProfileId}
                  onChange={(e) => setBankProfileId(e.target.value)}
                  className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                >
                  <option value="">None</option>
                  {bankProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.bankName ? ` (${p.bankName})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <Link href="/settings" className="text-xs text-primary hover:underline">
                  + Create a bank profile
                </Link>
              )}
            </label>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={(e) => handleSubmit(e as unknown as FormEvent, true)}
            disabled={submitting}
            className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-surface transition-colors disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Estimate'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ProfileDetails({ profile }: { profile: Profile }) {
  const lines = [
    profile.companyName,
    profile.email,
    profile.phone,
    [profile.addressLine1, profile.city, profile.country].filter(Boolean).join(', '),
    profile.taxId ? `Tax ID: ${profile.taxId}` : null,
  ].filter(Boolean);

  if (lines.length === 0) return null;

  return (
    <div className="mt-1 text-xs text-text-secondary leading-relaxed">
      {lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}
