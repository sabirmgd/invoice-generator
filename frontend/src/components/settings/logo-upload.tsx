'use client';

import { ChangeEvent, useState } from 'react';
import { Setting } from '@/lib/types';

interface LogoUploadProps {
  logoDataUrl: string;
  apiFetch: <T>(path: string, init?: RequestInit) => Promise<T>;
  onSaved: () => Promise<void>;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Failed to read file as data URL'));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function LogoUpload({ logoDataUrl, apiFetch, onSaved }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Logo must be PNG, JPG, or WEBP');
      return;
    }
    if (file.size > 1024 * 1024) {
      setError('Logo must be 1MB or smaller');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const dataUrl = await fileToDataUrl(file);
      await apiFetch<Setting>('/api/v1/settings/invoice_logo_data_url', {
        method: 'PATCH',
        body: JSON.stringify({ value: dataUrl }),
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleClear() {
    setError('');
    setUploading(true);
    try {
      await apiFetch<Setting>('/api/v1/settings/invoice_logo_data_url', {
        method: 'PATCH',
        body: JSON.stringify({ value: '' }),
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove logo');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface/50 p-4">
      <p className="text-xs text-text-secondary">
        Upload PNG/JPG/WEBP up to 1MB. The logo appears in the PDF header.
      </p>

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-surface">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => void handleUpload(e)}
            className="hidden"
          />
          {uploading ? 'Uploading...' : 'Upload logo'}
        </label>

        <button
          type="button"
          onClick={() => void handleClear()}
          disabled={!logoDataUrl || uploading}
          className="h-9 rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
        >
          Remove logo
        </button>
      </div>

      {logoDataUrl && (
        <div className="mt-4 rounded-lg border border-border bg-white p-3">
          <p className="mb-2 text-xs text-text-secondary">Preview</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoDataUrl}
            alt="Invoice logo preview"
            className="max-h-16 w-auto object-contain"
          />
        </div>
      )}
    </div>
  );
}
