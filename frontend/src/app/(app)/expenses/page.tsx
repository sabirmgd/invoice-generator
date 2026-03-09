'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import { Expense, ExpenseCategory, Paginated } from '@/lib/types';

const CATEGORIES: { value: ExpenseCategory; label: string; color: string }[] = [
  { value: 'office', label: 'Office', color: 'bg-blue-100 text-blue-700' },
  { value: 'travel', label: 'Travel', color: 'bg-purple-100 text-purple-700' },
  { value: 'software', label: 'Software', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'marketing', label: 'Marketing', color: 'bg-pink-100 text-pink-700' },
  { value: 'salary', label: 'Salary', color: 'bg-green-100 text-green-700' },
  { value: 'utilities', label: 'Utilities', color: 'bg-gray-100 text-gray-700' },
  { value: 'equipment', label: 'Equipment', color: 'bg-orange-100 text-orange-700' },
  { value: 'meals', label: 'Meals', color: 'bg-amber-100 text-amber-700' },
  { value: 'professional_services', label: 'Professional Services', color: 'bg-teal-100 text-teal-700' },
  { value: 'other', label: 'Other', color: 'bg-slate-100 text-slate-700' },
];

function getCategoryStyle(category: string): string {
  return CATEGORIES.find((c) => c.value === category)?.color || 'bg-slate-100 text-slate-700';
}

function getCategoryLabel(category: string): string {
  return CATEGORIES.find((c) => c.value === category)?.label || category;
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export default function ExpensesPage() {
  const { apiFetch, settingsByKey, refreshWorkspaceData } = useApp();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [category, setCategory] = useState<ExpenseCategory>('software');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [vendor, setVendor] = useState('');
  const [taxDeductible, setTaxDeductible] = useState(true);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);

  const currency = settingsByKey.currency || 'SAR';

  const fetchExpenses = useCallback(async () => {
    try {
      const data = await apiFetch<Paginated<Expense>>('/api/v1/expenses?page=1&limit=50');
      setExpenses(data.items || []);
    } catch {
      // Silently fail on initial load
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  function resetForm() {
    setCategory('software');
    setDescription('');
    setAmount(0);
    setDate(new Date().toISOString().slice(0, 10));
    setVendor('');
    setTaxDeductible(true);
    setNotes('');
    setEditingId(null);
  }

  function startEdit(expense: Expense) {
    setEditingId(expense.id);
    setCategory(expense.category);
    setDescription(expense.description);
    setAmount(Number(expense.amount));
    setDate(expense.date);
    setVendor(expense.vendor || '');
    setTaxDeductible(expense.taxDeductible);
    setNotes(expense.notes || '');
    setShowForm(true);
    setError('');
  }

  async function handleSubmit() {
    setError('');
    if (!description.trim()) { setError('Description is required'); return; }
    if (amount <= 0) { setError('Amount must be greater than 0'); return; }

    setSubmitting(true);
    try {
      const body = {
        category,
        description: description.trim(),
        amount,
        date,
        currency,
        vendor: vendor.trim() || undefined,
        taxDeductible,
        notes: notes.trim() || undefined,
      };

      if (editingId) {
        await apiFetch(`/api/v1/expenses/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        setSuccess('Expense updated');
      } else {
        await apiFetch('/api/v1/expenses', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setSuccess('Expense created');
      }

      setTimeout(() => setSuccess(''), 3000);
      setShowForm(false);
      resetForm();
      fetchExpenses();
      refreshWorkspaceData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await apiFetch(`/api/v1/expenses/${id}`, { method: 'DELETE' });
      fetchExpenses();
      refreshWorkspaceData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  // Summary
  const totalThisMonth = expenses
    .filter((e) => e.date >= new Date().toISOString().slice(0, 8) + '01')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="mt-1 text-sm text-text-secondary">Track your business expenses.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (showForm && editingId) { resetForm(); }
            setShowForm(!showForm);
          }}
          className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Expense'}
        </button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-surface/50 p-4">
          <p className="text-xs font-medium text-text-secondary">This Month</p>
          <p className="mt-1 text-xl font-bold text-foreground">{formatMoney(totalThisMonth, currency)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface/50 p-4">
          <p className="text-xs font-medium text-text-secondary">Total Expenses</p>
          <p className="mt-1 text-xl font-bold text-foreground">{expenses.length}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <h2 className="text-lg font-semibold">{editingId ? 'Edit Expense' : 'New Expense'}</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            Description
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Claude API subscription"
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              Amount
              <input
                type="number"
                min={0}
                step={0.01}
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="0.00"
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              Vendor
              <input
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="e.g. Anthropic"
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={taxDeductible}
              onChange={(e) => setTaxDeductible(e.target.checked)}
              className="rounded"
            />
            Tax deductible
          </label>

          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground resize-none"
            />
          </label>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving...' : editingId ? 'Update Expense' : 'Create Expense'}
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-sm text-text-secondary">Loading...</p>
      ) : expenses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">No expenses yet</p>
          <p className="mt-1 text-sm text-text-secondary">Start tracking your business expenses.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-text-secondary">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-text-secondary">Category</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-text-secondary">Description</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-text-secondary">Vendor</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-text-secondary">Amount</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-surface/30">
                    <td className="px-4 py-2.5 text-text-secondary whitespace-nowrap">{exp.date}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getCategoryStyle(exp.category)}`}>
                        {getCategoryLabel(exp.category)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-foreground max-w-[200px] truncate">{exp.description}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{exp.vendor || '-'}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-foreground">{formatMoney(Number(exp.amount), exp.currency)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(exp)}
                          className="h-7 rounded-md border border-border px-2 text-xs text-text-secondary hover:bg-surface"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(exp.id)}
                          className="h-7 rounded-md border border-border px-2 text-xs text-red-500 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {expenses.map((exp) => (
              <div key={exp.id} className="rounded-xl border border-border bg-surface/50 p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getCategoryStyle(exp.category)}`}>
                        {getCategoryLabel(exp.category)}
                      </span>
                      {exp.taxDeductible && (
                        <span className="text-[10px] text-text-secondary">Tax deductible</span>
                      )}
                    </div>
                    <p className="mt-1 font-medium text-foreground truncate">{exp.description}</p>
                    <p className="text-xs text-text-secondary">{exp.vendor || 'No vendor'} &middot; {exp.date}</p>
                  </div>
                  <p className="text-sm font-bold text-foreground ml-3">{formatMoney(Number(exp.amount), exp.currency)}</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(exp)}
                    className="h-7 rounded-md border border-border px-3 text-xs text-text-secondary hover:bg-surface"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(exp.id)}
                    className="h-7 rounded-md border border-border px-3 text-xs text-red-500 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
