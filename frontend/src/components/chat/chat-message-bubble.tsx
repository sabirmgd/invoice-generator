import Markdown from 'react-markdown';
import { ChatUiMessage } from '@/lib/types';

interface ChatMessageBubbleProps {
  message: ChatUiMessage;
}

const roleStyles: Record<ChatUiMessage['role'], string> = {
  user: 'ml-auto bg-primary text-white',
  assistant: 'bg-surface text-foreground border border-border',
  system: 'bg-red-50 text-red-700 border border-red-200',
};

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  return (
    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${roleStyles[message.role]}`}>
      {message.role === 'assistant' ? (
        <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-2 prose-code:rounded prose-code:bg-black/5 prose-code:px-1 prose-code:py-0.5 prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none">
          <Markdown>{message.content}</Markdown>
        </div>
      ) : (
        <p className="whitespace-pre-wrap">{message.content}</p>
      )}
    </div>
  );
}
