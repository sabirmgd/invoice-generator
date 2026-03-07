'use client';

import { useCallback, useRef, useState } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useApp } from '@/lib/context/app-context';
import { useChat } from '@/lib/hooks/use-chat';
import { Invoice, StreamChunk } from '@/lib/types';
import { ChatHeader } from '@/components/chat/chat-header';
import { ChatMessageList } from '@/components/chat/chat-message-list';
import { ChatInput } from '@/components/chat/chat-input';
import { InvoicePreview } from '@/components/invoice/invoice-preview';
import { InvoiceForm } from '@/components/invoice/invoice-form';
import Link from 'next/link';

type Mode = 'ai' | 'form';

export default function Home() {
  const { sessionId, authToken, refreshWorkspaceData, invoices } = useApp();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [mode, setMode] = useState<Mode>('ai');
  const invoiceCreated = useRef(false);

  const handleStreamChunk = useCallback(
    (chunk: StreamChunk) => {
      if (chunk.type === 'tool_result' && chunk.toolName === 'create_invoice') {
        invoiceCreated.current = true;
      }
    },
    [],
  );

  const handleDone = useCallback(async () => {
    const data = await refreshWorkspaceData();
    if (invoiceCreated.current && data?.invoices && data.invoices.length > 0) {
      setPreviewInvoice(data.invoices[0]);
      invoiceCreated.current = false;
    }
  }, [refreshWorkspaceData]);

  const chat = useChat({
    sessionId,
    authToken,
    executeRecaptcha: executeRecaptcha ?? undefined,
    onStreamChunk: handleStreamChunk,
    onDone: handleDone,
  });

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-3">
      {/* Tab Switcher */}
      <div className="flex shrink-0 gap-1 rounded-lg border border-border bg-surface/50 p-1 self-start">
        <button
          type="button"
          onClick={() => setMode('ai')}
          className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
            mode === 'ai'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-text-secondary hover:text-foreground'
          }`}
        >
          AI Mode
        </button>
        <button
          type="button"
          onClick={() => setMode('form')}
          className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
            mode === 'form'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-text-secondary hover:text-foreground'
          }`}
        >
          Form Mode
        </button>
      </div>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Left Panel */}
        {mode === 'ai' ? (
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
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background lg:flex-[3]">
            <InvoiceForm onInvoiceCreated={(inv) => setPreviewInvoice(inv)} />
          </div>
        )}

        {/* Invoice Preview (40%) — hidden on mobile */}
        <div className="hidden flex-col lg:flex lg:flex-[2]">
          <div className="flex-1 overflow-y-auto rounded-xl">
            <InvoicePreview invoice={previewInvoice} />
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
        {mode === 'ai' && chat.chatError && (
          <div className="fixed bottom-4 left-4 right-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg lg:hidden">
            {chat.chatError}
          </div>
        )}
      </div>
    </div>
  );
}
