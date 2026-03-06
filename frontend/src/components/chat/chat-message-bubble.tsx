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
      <p className="whitespace-pre-wrap">{message.content}</p>
      <p className="mt-2 text-[10px] uppercase tracking-widest opacity-50">
        {message.role}
      </p>
    </div>
  );
}
