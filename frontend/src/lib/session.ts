const SESSION_KEY = 'invoice_generator_session_id';

function fallbackId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `sess_${Date.now()}_${random}`;
}

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }

  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : fallbackId();

  localStorage.setItem(SESSION_KEY, id);
  return id;
}
