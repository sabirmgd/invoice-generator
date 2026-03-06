'use client';

import { useCallback, useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import { useChat } from '@/lib/hooks/use-chat';
import { Invoice, StreamChunk } from '@/lib/types';
import { ChatHeader } from '@/components/chat/chat-header';
import { ChatMessageList } from '@/components/chat/chat-message-list';
import { ChatInput } from '@/components/chat/chat-input';
import { InvoicePreview } from '@/components/invoice/invoice-preview';
import Link from 'next/link';

export default function Home() {
  const { sessionId, authToken, refreshWorkspaceData, invoices, logoDataUrl } = useApp();
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  const handleStreamChunk = useCallback(
    (chunk: StreamChunk) => {
      if (chunk.type === 'tool_result' && chunk.toolName === 'create_invoice') {
        const result = chunk.result as { invoice?: Invoice } | undefined;
        if (result?.invoice) {
          setPreviewInvoice(result.invoice);
        }
      }
    },
    [],
  );

  const handleDone = useCallback(() => {
    void refreshWorkspaceData();
    // Show the latest invoice in preview if none is shown
    if (!previewInvoice && invoices.length > 0) {
      setPreviewInvoice(invoices[0]);
    }
  }, [refreshWorkspaceData, previewInvoice, invoices]);

  const chat = useChat({
    sessionId,
    authToken,
    onStreamChunk: handleStreamChunk,
    onDone: handleDone,
  });

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4">
      {/* Chat Panel (60%) */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background lg:flex-[3]">
        <ChatHeader
          provider={chat.provider}
          onProviderChange={chat.setProvider}
          apiKey={chat.apiKey}
          onApiKeyChange={chat.setApiKey}
          conversationId={chat.conversationId}
          onReset={() => {
            chat.resetConversation();
            setPreviewInvoice(null);
          }}
        />

        <ChatMessageList messages={chat.chatMessages} />

        <ChatInput
          value={chat.chatInput}
          onChange={chat.setChatInput}
          files={chat.chatFiles}
          onFilesChange={chat.setChatFiles}
          onSubmit={chat.handleSendChat}
          disabled={chat.isSendingChat || !sessionId}
          isSending={chat.isSendingChat}
        />
      </div>

      {/* Invoice Preview (40%) — hidden on mobile */}
      <div className="hidden flex-col lg:flex lg:flex-[2]">
        <div className="flex-1 overflow-y-auto rounded-xl">
          <InvoicePreview
            invoice={previewInvoice}
            logoDataUrl={logoDataUrl}
          />
        </div>

        {/* Quick actions under preview */}
        {invoices.length > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-surface/50 px-4 py-2">
            <span className="text-xs text-text-secondary">
              {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} total
            </span>
            <div className="flex gap-2">
              {invoices.length > 0 && !previewInvoice && (
                <button
                  type="button"
                  onClick={() => setPreviewInvoice(invoices[0])}
                  className="text-xs text-primary hover:underline"
                >
                  Show latest
                </button>
              )}
              <Link href="/invoices" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Mobile: Chat error display */}
      {chat.chatError && (
        <div className="fixed bottom-4 left-4 right-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg lg:hidden">
          {chat.chatError}
        </div>
      )}
    </div>
  );
}
