'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import { RecurringInvoice, RecurringFrequency } from '@/lib/types';
import { CURRENCY_GROUPS, CURRENCIES } from '@/lib/currencies';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

const emptyItem: LineItem = { description: '', quantity: 1, unitPrice: 0 };

export default function RecurringPage() {
  const {
    senderProfiles,
    clientProfiles,
    bankProfiles,
    settingsByKey,
    apiFetch,
  } = useApp();

  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [senderProfileId, setSenderProfileId] = useState('');
  const [clientProfileId, setClientProfileId] = useState('');
  const [bankProfileId, setBankProfileId] = useState('');
  const [currency, setCurrency] = useState(() => settingsByKey.currency || 'USD');
  const [taxRate, setTaxRate] = useState(() => Number(settingsByKey.tax_rate) || 15);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ ...emptyItem }]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [autoSendEmail, setAutoSendEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchRecurring = useCallback(async () => {
    try {
      const data = await apiFetch<{ items: RecurringInvoice[] }>('/api/v1/recurring');
      setRecurringInvoices(data.items || []);
    } catch {
      // Silently fail on initial load
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchRecurring();
  }, [fetchRecurring]);

  // Auto-select default profiles
  useEffect(() => {
    const defaultSender = senderProfiles.find((p) => p.isDefault) || senderProfiles[0];
    if (defaultSender) setSenderProfileId(defaultSender.id);
    const defaultClient = clientProfiles.find((p) => p.isDefault) || clientProfiles[0];
    if (defaultClient) setClientProfileId(defaultClient.id);
    const defaultBank = bankProfiles.find((p) => p.isDefault) || bankProfiles[0];
    if (defaultBank) setBankProfileId(defaultBank.id);
  }, [senderProfiles, clientProfiles, bankProfiles]);

  async function handleCreate() {
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    if (!senderProfileId) { setError('Select a sender profile'); return; }
    if (!clientProfileId) { setError('Select a client profile'); return; }
    if (items.every((item) => !item.description.trim())) { setError('Add at least one item'); return; }

    setSubmitting(true);
    try {
      await apiFetch('/api/v1/recurring', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          frequency,
          senderProfileId,
          clientProfileId,
          bankProfileId: bankProfileId || undefined,
          currency,
          taxRate,
          notes: notes.trim() || undefined,
          items: items.filter((i) => i.description.trim()).map((i, idx) => ({
            description: i.description.trim(),
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            sortOrder: idx,
          })),
          startDate,
          endDate: endDate || undefined,
          autoSendEmail,
        }),
      });
      setSuccess('Recurring invoice created');
      setTimeout(() => setSuccess(''), 3000);
      setShowForm(false);
      resetForm();
      fetchRecurring();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTogglePause(id: string, currentStatus: string) {
    try {
      const action = currentStatus === 'active' ? 'pause' : 'resume';
      await apiFetch(`/api/v1/recurring/${id}/${action}`, { method: 'PATCH' });
      fetchRecurring();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this recurring invoice? This cannot be undone.')) return;
    try {
      await apiFetch(`/api/v1/recurring/${id}`, { method: 'DELETE' });
      fetchRecurring();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  function resetForm() {
    setName('');
    setFrequency('monthly');
    setNotes('');
    setItems([{ ...emptyItem }]);
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate('');
    setAutoSendEmail(true);
  }

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recurring Invoices</h1>
          <p className="mt-1 text-sm text-text-secondary">Automate invoice generation on a schedule.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Recurring'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <h2 className="text-lg font-semibold">Create Recurring Invoice</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Monthly retainer - ACME"
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              Frequency
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              Sender
              <select value={senderProfileId} onChange={(e) => setSenderProfileId(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground">
                <option value="">Select...</option>
                {senderProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              Client
              <select value={clientProfileId} onChange={(e) => setClientProfileId(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground">
                <option value="">Select...</option>
                {clientProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              Bank
              <select value={bankProfileId} onChange={(e) => setBankProfileId(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground">
                <option value="">None</option>
                {bankProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              Start Date
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              End Date (optional)
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              Currency
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground">
                {CURRENCY_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.codes.map((code) => {
                      const c = CURRENCIES.find((cur) => cur.code === code);
                      return c ? <option key={c.code} value={c.code}>{c.code} — {c.name}</option> : null;
                    })}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">Items</span>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_100px_36px] gap-2 items-center">
                <input
                  value={item.description}
                  onChange={(e) => updateItem(i, 'description', e.target.value)}
                  placeholder="Description"
                  className="h-8 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                />
                <input
                  type="number"
                  min={0}
                  value={item.quantity}
                  onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
                  className="h-8 rounded-lg border border-border bg-background px-2 text-right text-sm text-foreground"
                />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={item.unitPrice}
                  onChange={(e) => updateItem(i, 'unitPrice', Number(e.target.value))}
                  className="h-8 rounded-lg border border-border bg-background px-2 text-right text-sm text-foreground"
                />
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i))}
                  className="flex h-7 w-7 items-center justify-center rounded text-text-secondary hover:text-red-500"
                >
                  x
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, { ...emptyItem }])}
              className="text-xs text-primary hover:underline"
            >
              + Add item
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              Tax Rate (%)
              <input type="number" min={0} max={100} step={0.5} value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground" />
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer self-end h-9">
              <input type="checkbox" checked={autoSendEmail} onChange={(e) => setAutoSendEmail(e.target.checked)} className="rounded" />
              Auto-send via email
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground resize-none" />
          </label>

          <button
            type="button"
            onClick={handleCreate}
            disabled={submitting}
            className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Recurring Invoice'}
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-sm text-text-secondary">Loading...</p>
      ) : recurringInvoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">No recurring invoices</p>
          <p className="mt-1 text-sm text-text-secondary">Create one to automate your billing.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recurringInvoices.map((rec) => (
            <div key={rec.id} className="rounded-xl border border-border bg-surface/50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-foreground">{rec.name}</p>
                  <p className="text-xs text-text-secondary">
                    {rec.frequency} &middot; {rec.currency} &middot; {rec.invoicesGenerated} generated
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  rec.status === 'active' ? 'bg-green-100 text-green-700' :
                  rec.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {rec.status}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                {rec.nextRunDate && <span>Next: {rec.nextRunDate}</span>}
                {rec.lastRunAt && <span>Last: {new Date(rec.lastRunAt).toLocaleDateString()}</span>}
                <span>Start: {rec.startDate}</span>
                {rec.endDate && <span>End: {rec.endDate}</span>}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleTogglePause(rec.id, rec.status)}
                  className="h-7 rounded-md border border-border px-3 text-xs text-text-secondary hover:bg-surface"
                >
                  {rec.status === 'active' ? 'Pause' : 'Resume'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(rec.id)}
                  className="h-7 rounded-md border border-border px-3 text-xs text-red-500 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
