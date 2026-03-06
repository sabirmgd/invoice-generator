'use client';

import { useEffect, useRef } from 'react';
import { ChatUiMessage } from '@/lib/types';
import { ChatMessageBubble } from './chat-message-bubble';

interface ChatMessageListProps {
  messages: ChatUiMessage[];
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-background p-4">
      {messages.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <div className="max-w-sm text-center">
            <p className="text-lg font-semibold text-foreground">Welcome to Invo</p>
            <p className="mt-2 text-sm text-text-secondary">
              Create professional invoices by chatting. Try something like:
            </p>
            <p className="mt-3 rounded-lg bg-surface px-4 py-2 text-xs text-foreground">
              Create a sender profile for Acme LLC, then draft an invoice for 10 hours of consulting at $150/hour.
            </p>
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <ChatMessageBubble key={msg.id} message={msg} />
      ))}

      <div ref={bottomRef} />
    </div>
  );
}
