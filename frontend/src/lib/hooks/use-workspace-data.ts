'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { buildAuthHeaders, getApiBaseUrl, parseApiResponse } from '@/lib/api';
import { Estimate, Invoice, Paginated, Profile, Setting } from '@/lib/types';

const API_BASE = getApiBaseUrl();

async function fetchJson<T>(
  path: string,
  sessionId: string,
  authToken?: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers({
    ...buildAuthHeaders(sessionId, authToken),
    ...(init?.headers || {}),
  });

  if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  return parseApiResponse<T>(response);
}

export function useWorkspaceData(sessionId: string, authToken: string) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState('');

  const refreshWorkspaceData = useCallback(async (): Promise<{ invoices: Invoice[] } | undefined> => {
    if (!sessionId) return undefined;

    setIsLoadingData(true);
    setError('');

    try {
      const [invoicePayload, estimatePayload, profilePayload, settingPayload] = await Promise.all([
        fetchJson<Paginated<Invoice>>('/api/v1/invoices?page=1&limit=30', sessionId, authToken || undefined),
        fetchJson<Paginated<Estimate>>('/api/v1/estimates?page=1&limit=30', sessionId, authToken || undefined),
        fetchJson<Paginated<Profile>>('/api/v1/profiles?page=1&limit=100', sessionId, authToken || undefined),
        fetchJson<Setting[]>('/api/v1/settings', sessionId, authToken || undefined),
      ]);

      setInvoices(invoicePayload.items);
      setEstimates(estimatePayload.items);
      setProfiles(profilePayload.items);
      setSettings(settingPayload);
      return { invoices: invoicePayload.items };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
      return undefined;
    } finally {
      setIsLoadingData(false);
    }
  }, [sessionId, authToken]);

  useEffect(() => {
    if (!sessionId) return;
    void refreshWorkspaceData();
  }, [sessionId, authToken, refreshWorkspaceData]);

  const senderProfiles = useMemo(() => profiles.filter((p) => p.type === 'sender'), [profiles]);
  const clientProfiles = useMemo(() => profiles.filter((p) => p.type === 'client'), [profiles]);
  const bankProfiles = useMemo(() => profiles.filter((p) => p.type === 'bank'), [profiles]);

  const settingsByKey = useMemo(
    () => Object.fromEntries(settings.map((s) => [s.key, s.value])),
    [settings],
  );

  const editableSettings = useMemo(
    () => settings.filter((s) => !['invoice_logo_data_url', 'invoice_template', 'invoice_accent_color'].includes(s.key)),
    [settings],
  );

  const logoDataUrl = settingsByKey.invoice_logo_data_url || '';

  const revenue = useMemo(
    () => invoices.reduce((sum, inv) => sum + Number(inv.total), 0),
    [invoices],
  );

  // Helper for fetching JSON from other hooks/components
  const apiFetch = useCallback(
    <T>(path: string, init?: RequestInit) =>
      fetchJson<T>(path, sessionId, authToken || undefined, init),
    [sessionId, authToken],
  );

  return {
    invoices,
    estimates,
    profiles,
    settings,
    isLoadingData,
    error,
    setError,
    refreshWorkspaceData,
    senderProfiles,
    clientProfiles,
    bankProfiles,
    settingsByKey,
    editableSettings,
    logoDataUrl,
    revenue,
    apiFetch,
  };
}
