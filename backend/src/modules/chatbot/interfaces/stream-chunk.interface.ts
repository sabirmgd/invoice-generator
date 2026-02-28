export type StreamChunk =
  | { type: 'text'; content: string }
  | { type: 'tool_start'; toolName: string; toolCallId: string }
  | { type: 'tool_result'; toolName: string; toolCallId: string; result: unknown }
  | { type: 'error'; message: string }
  | { type: 'done'; conversationId: string };
