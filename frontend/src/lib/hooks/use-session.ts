'use client';

import { useState } from 'react';
import { getOrCreateSessionId } from '@/lib/session';

const AUTH_TOKEN_KEY = 'invoice_generator_auth_token';

export function useSession() {
  const [sessionId] = useState(() => getOrCreateSessionId());
  const [authToken, setAuthToken] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(AUTH_TOKEN_KEY) || '';
  });

  function persistAuthToken(token: string) {
    const trimmed = token.trim();
    localStorage.setItem(AUTH_TOKEN_KEY, trimmed);
    setAuthToken(trimmed);
  }

  return { sessionId, authToken, setAuthToken, persistAuthToken };
}
