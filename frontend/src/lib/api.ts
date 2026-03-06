import { ApiEnvelope, ApiErrorEnvelope } from '@/lib/types';

const DEFAULT_API_BASE_URL = 'http://localhost:8100';

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
  return raw.replace(/\/$/, '');
}

export function buildAuthHeaders(sessionId: string, authToken?: string): HeadersInit {
  if (authToken) {
    return {
      Authorization: `Bearer ${authToken}`,
    };
  }

  return {
    'X-Session-Id': sessionId,
  };
}

function normalizeErrorMessage(payload: ApiErrorEnvelope | null): string {
  const message = payload?.error?.message;

  if (Array.isArray(message)) {
    return message.join(', ');
  }

  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  return 'Request failed';
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let parsed: ApiErrorEnvelope | null = null;
    try {
      parsed = (await response.json()) as ApiErrorEnvelope;
    } catch {
      // Ignore parsing failure and fall back to status text.
    }

    const msg = parsed ? normalizeErrorMessage(parsed) : response.statusText;
    throw new Error(msg || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const json = (await response.json()) as ApiEnvelope<T>;
  return json.data;
}
