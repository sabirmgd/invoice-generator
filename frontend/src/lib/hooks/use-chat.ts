'use client';

import { FormEvent, useState, useCallback, useEffect } from 'react';
import { buildAuthHeaders, getApiBaseUrl } from '@/lib/api';
import { ChatUiEvent, ChatUiMessage, Provider, StreamChunk } from '@/lib/types';

const API_BASE = getApiBaseUrl();

const STORAGE_KEYS = {
  apiKey: 'invo-api-key',
  provider: 'invo-provider',
  conversationId: 'invo-conversation-id',
  chatMessages: 'invo-chat-messages',
} as const;

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

export interface UseChatOptions {
  sessionId: string;
  authToken: string;
  onStreamChunk?: (chunk: StreamChunk) => void;
  onDone?: () => void;
}

export function useChat({ sessionId, authToken, onStreamChunk, onDone }: UseChatOptions) {
  const [provider, setProvider] = useState<Provider>(() => loadFromStorage('invo-provider', 'anthropic'));
  const [apiKey, setApiKey] = useState(() => loadFromStorage('invo-api-key', ''));
  const [conversationId, setConversationId] = useState(() => loadFromStorage('invo-conversation-id', ''));
  const [chatInput, setChatInput] = useState('');
  const [chatFiles, setChatFiles] = useState<File[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatUiMessage[]>(() => loadFromStorage('invo-chat-messages', []));
  const [chatEvents, setChatEvents] = useState<ChatUiEvent[]>([]);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatError, setChatError] = useState('');

  // Persist to localStorage on change
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.apiKey, JSON.stringify(apiKey)); }, [apiKey]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.provider, JSON.stringify(provider)); }, [provider]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.conversationId, JSON.stringify(conversationId)); }, [conversationId]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.chatMessages, JSON.stringify(chatMessages)); }, [chatMessages]);

  const appendEvent = useCallback((label: string) => {
    setChatEvents((prev) => {
      const next = [
        { id: crypto.randomUUID(), label, createdAt: new Date().toISOString() },
        ...prev,
      ];
      return next.slice(0, 40);
    });
  }, []);

  const appendMessage = useCallback((role: ChatUiMessage['role'], content: string) => {
    setChatMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role, content, createdAt: new Date().toISOString() },
    ]);
  }, []);

  const resetConversation = useCallback(() => {
    setConversationId('');
    setChatMessages([]);
    setChatEvents([]);
    localStorage.removeItem(STORAGE_KEYS.conversationId);
    localStorage.removeItem(STORAGE_KEYS.chatMessages);
  }, []);

  const handleSendChat = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();

      const trimmed = chatInput.trim();
      if (!trimmed || !sessionId || isSendingChat) return;

      setChatError('');
      setIsSendingChat(true);

      appendMessage('user', trimmed);
      setChatInput('');
      setChatFiles([]);

      try {
        const formData = new FormData();
        formData.set('message', trimmed);
        formData.set('provider', provider);
        if (conversationId) formData.set('conversationId', conversationId);
        if (apiKey.trim()) formData.set('apiKey', apiKey.trim());
        for (const file of chatFiles) formData.append('files', file);

        const response = await fetch(`${API_BASE}/api/v1/chat/stream`, {
          method: 'POST',
          headers: buildAuthHeaders(sessionId, authToken || undefined),
          body: formData,
        });

        if (!response.ok) {
          const payload = await response.text();
          throw new Error(payload || `Chat request failed (${response.status})`);
        }

        if (!response.body) throw new Error('No stream body received from chatbot');

        const decoder = new TextDecoder();
        const reader = response.body.getReader();
        let buffer = '';

        const handleChunk = (chunk: StreamChunk) => {
          onStreamChunk?.(chunk);

          if (chunk.type === 'text') {
            appendMessage('assistant', chunk.content);
          } else if (chunk.type === 'tool_start') {
            appendEvent(`Tool: ${chunk.toolName} started`);
          } else if (chunk.type === 'tool_result') {
            appendEvent(`Tool: ${chunk.toolName} finished`);
          } else if (chunk.type === 'file_processing') {
            appendEvent(`File ${chunk.filename}: ${chunk.status}`);
          } else if (chunk.type === 'done') {
            setConversationId(chunk.conversationId);
            appendEvent(`Conversation ${chunk.conversationId} updated`);
          } else if (chunk.type === 'error') {
            appendMessage('system', `Error: ${chunk.message}`);
            appendEvent(`Chat error: ${chunk.message}`);
          }
        };

        const processRawEvent = (rawEvent: string) => {
          const data = rawEvent
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.replace(/^data:\s?/, ''))
            .join('');
          if (!data) return;

          try {
            const chunk = JSON.parse(data) as StreamChunk;
            handleChunk(chunk);
          } catch {
            appendEvent(`Skipped unparseable stream payload: ${data.slice(0, 120)}`);
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          while (buffer.includes('\n\n')) {
            const delimiterIndex = buffer.indexOf('\n\n');
            const rawEvent = buffer.slice(0, delimiterIndex).trim();
            buffer = buffer.slice(delimiterIndex + 2);
            if (rawEvent) processRawEvent(rawEvent);
          }
        }

        const trailing = buffer.trim();
        if (trailing) processRawEvent(trailing);

        onDone?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected error';
        setChatError(message);
        appendMessage('system', `Chat failed: ${message}`);
      } finally {
        setIsSendingChat(false);
      }
    },
    [
      chatInput,
      sessionId,
      isSendingChat,
      provider,
      conversationId,
      apiKey,
      chatFiles,
      authToken,
      appendMessage,
      appendEvent,
      onStreamChunk,
      onDone,
    ],
  );

  return {
    provider,
    setProvider,
    apiKey,
    setApiKey,
    conversationId,
    chatInput,
    setChatInput,
    chatFiles,
    setChatFiles,
    chatMessages,
    chatEvents,
    isSendingChat,
    chatError,
    handleSendChat,
    resetConversation,
    appendMessage,
    appendEvent,
  };
}
