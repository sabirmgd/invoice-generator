'use client';

import { Provider } from '@/lib/types';

interface ChatHeaderProps {
  provider: Provider;
  onProviderChange: (provider: Provider) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  conversationId: string;
  onReset: () => void;
}

export function ChatHeader({
  provider,
  onProviderChange,
  apiKey,
  onApiKeyChange,
  conversationId,
  onReset,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-background px-4 py-2.5">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-foreground">Invo Chat</span>
        <span className="rounded-full bg-surface px-2.5 py-0.5 text-[10px] font-medium text-text-secondary">
          {conversationId ? `#${conversationId.slice(0, 8)}` : 'New'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={provider}
          onChange={(e) => onProviderChange(e.target.value as Provider)}
          className="h-7 rounded-md border border-border bg-surface px-2 text-xs text-text-secondary focus:outline-none"
        >
          <option value="anthropic">Anthropic</option>
          <option value="openai">OpenAI</option>
        </select>

        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="API Key"
          className="h-7 w-28 rounded-md border border-border bg-surface px-2 text-xs text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
        />

        <button
          type="button"
          onClick={onReset}
          className="h-7 rounded-md border border-border px-2 text-xs text-text-secondary hover:bg-surface"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
