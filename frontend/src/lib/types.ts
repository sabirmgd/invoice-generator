export type Provider = 'anthropic' | 'openai';

export interface ApiMeta {
  timestamp: string;
  path: string;
}

export interface ApiEnvelope<T> {
  code: number;
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorEnvelope {
  code: number;
  error?: {
    message?: string | string[];
  };
  meta?: ApiMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

export type ProfileType = 'sender' | 'client' | 'bank';

export interface Profile {
  id: string;
  ownerId: string;
  type: ProfileType;
  name: string;
  isDefault: boolean;
  companyName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  bankName?: string;
  iban?: string;
  swiftCode?: string;
  accountHolder?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  sortOrder: number;
}

export interface Invoice {
  id: string;
  ownerId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  senderProfileId: string;
  clientProfileId: string;
  bankProfileId?: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes?: string;
  pdfPath?: string;
  senderProfile?: Profile;
  clientProfile?: Profile;
  bankProfile?: Profile;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Setting {
  id: string;
  ownerId: string;
  key: string;
  value: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatUiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface ChatUiEvent {
  id: string;
  label: string;
  createdAt: string;
}

export type StreamChunk =
  | { type: 'text'; content: string }
  | { type: 'tool_start'; toolName: string; toolCallId: string }
  | { type: 'tool_result'; toolName: string; toolCallId: string; result: unknown }
  | { type: 'file_processing'; filename: string; status: 'processing' | 'done' | 'error' }
  | { type: 'error'; message: string }
  | { type: 'done'; conversationId: string };
