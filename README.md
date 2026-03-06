# Invoice Generator

AI-native invoicing platform with:
- NestJS backend API (`backend/`)
- Next.js frontend workspace (`frontend/`)

Core capabilities include tool-calling chatbot workflows, dual authentication (anonymous sessions + Firebase), BYOK LLM keys, and automatic PDF generation.

## Architecture

```
Client (Browser / cURL)
  |
  |-- X-Session-Id: uuid          (anonymous — ephemeral, 90-day TTL)
  |-- Authorization: Bearer <jwt>  (Firebase — permanent, encrypted storage)
  |
  v
NestJS API (port 8100)
  |
  |-- OptionalAuthGuard ── resolves ownerId from either header
  |
  |-- REST Endpoints ── /api/v1/profiles, /invoices, /settings
  |-- SSE Chat ── /api/v1/chat/stream (LangChain agent with 14 tools)
  |-- PDF Gen ── PDFKit auto-generates on invoice creation
  |
  v
PostgreSQL ── all data scoped by ownerId (multi-tenant)
```

## Key Features

**AI Chatbot** — Full tool-calling agent (LangChain) that can create invoices, manage profiles, configure settings, and calculate totals through natural conversation. Streams responses via SSE.

**Dual Access** — No signup required. Anonymous users get a session UUID; authenticated users get Firebase Auth (Google / email+password) with encrypted data persistence.

**BYOK** — Bring Your Own Key. Users provide their Anthropic or OpenAI API key per-request, or save it encrypted (AES-256-GCM) for authenticated sessions.

**14 AI Tools** — create_invoice, list_invoices, get_invoice, update_invoice_status, get_invoice_summary, create_profile, list_profiles, get_profile, update_profile, delete_profile, list_settings, get_setting, update_setting, calculate_total.

**Auto PDF** — Every invoice automatically generates a professional PDF (PDFKit) with sender/client details, line items, tax breakdown, bank info, and notes.

**Multi-Tenant** — All data (settings, profiles, invoices, chat) is scoped by `ownerId`. Anonymous and authenticated users are fully isolated.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS 11 |
| Database | PostgreSQL + TypeORM |
| AI/LLM | LangChain (Anthropic Claude, OpenAI GPT-4o) |
| Auth | Firebase Admin SDK (optional) |
| Encryption | AES-256-GCM with HKDF per-user key derivation |
| PDF | PDFKit |
| Validation | class-validator + Zod (tools) |
| Docs | Swagger / OpenAPI |
| Logging | Pino |

## API Endpoints

### Auth
```
POST   /api/v1/auth/verify       — Verify Firebase token, create/return user
PATCH  /api/v1/auth/llm-key      — Save encrypted LLM API key
DELETE /api/v1/auth/llm-key      — Remove saved LLM key
```

### Chat (SSE)
```
POST   /api/v1/chat/stream            — Send message, stream AI response
GET    /api/v1/chat/conversations      — List conversations
GET    /api/v1/chat/conversations/:id  — Get conversation messages
DELETE /api/v1/chat/conversations/:id  — Delete conversation
```

### Profiles
```
POST   /api/v1/profiles          — Create profile (sender, client, bank)
GET    /api/v1/profiles          — List profiles (filter by type)
GET    /api/v1/profiles/:id      — Get profile details
PATCH  /api/v1/profiles/:id      — Update profile
DELETE /api/v1/profiles/:id      — Soft-delete profile
```

### Invoices
```
POST   /api/v1/invoices          — Create invoice + auto-generate PDF
GET    /api/v1/invoices          — List invoices (filter by status)
GET    /api/v1/invoices/:id      — Get invoice with items and profiles
PATCH  /api/v1/invoices/:id/status — Update invoice status
GET    /api/v1/invoices/:id/pdf  — Download invoice PDF
```

### Settings
```
GET    /api/v1/settings          — List all settings
GET    /api/v1/settings/:key     — Get setting by key
PATCH  /api/v1/settings/:key     — Update setting value
```

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Docker (optional, for database)

### Setup

```bash
# Clone
git clone https://github.com/sabirsalah/invoice-generator.git
cd invoice-generator/backend

# Install dependencies
npm install

# Start PostgreSQL (via Docker)
docker compose up -d

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Start development server
npm run start:dev
```

The API will be available at `http://localhost:8100` with Swagger docs at `http://localhost:8100/api/docs`.

### Frontend Setup (Next.js)

```bash
cd invoice-generator/frontend
cp .env.example .env.local
npm install
npm run dev
```

The frontend runs on `http://localhost:3000`.

Set `NEXT_PUBLIC_API_BASE_URL` in `frontend/.env.local` to your backend URL.

### Try the Chat (Anonymous)

```bash
curl -N -X POST http://localhost:8100/api/v1/chat/stream \
  -H 'X-Session-Id: demo-session-1' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Set up my company as Acme Corp and create an invoice for 10 hours of consulting at $200/hr",
    "provider": "anthropic",
    "apiKey": "sk-ant-..."
  }'
```

## Database Schema

```
settings ─────── key-value config per owner (currency, tax rate, prefix)
profiles ─────── reusable sender, client, and bank profiles
invoices ─────── invoices with status lifecycle (draft → sent → paid)
invoice_items ── line items (description, qty, unit price, amount)
users ────────── authenticated users (Firebase UID, encrypted LLM key)
chat_messages ── conversation history (ownerId, role, tool calls)
```

## Project Structure

```
backend/
└── src/
    ├── main.ts                     # Bootstrap, middleware, Swagger
    ├── app.module.ts               # Root module
    ├── config/                     # App, database, Swagger config + Joi validation
    ├── db/
    │   ├── entities/               # TypeORM entities (Setting, Profile, Invoice, User, ChatMessage)
    │   ├── naming.strategy.ts      # Snake case column naming
    │   └── seeds/                  # Database seeding
    ├── common/
    │   ├── dto/                    # Shared DTOs (pagination)
    │   ├── exceptions/             # AppException, NotFoundException
    │   ├── filters/                # Global exception filter
    │   ├── interceptors/           # Response transform interceptor
    │   ├── services/               # EncryptionService (AES-256-GCM)
    │   └── utils/                  # Pagination, findOneOrFail
    └── modules/
        ├── auth/                   # Firebase Auth, OptionalAuthGuard, @OwnerId()
        ├── chatbot/                # LangChain agent, 14 tools, SSE streaming
        ├── settings/               # Key-value settings per owner
        ├── profiles/               # Sender/client/bank profiles
        ├── invoices/               # Invoice CRUD + PDF generation
        ├── pdf/                    # PDFKit service
        └── health/                 # Liveness + readiness checks

frontend/
└── src/
    ├── app/                        # App Router pages, layout, global styles
    ├── components/                 # Invoice workspace UI
    └── lib/                        # API/session/types helpers
```

## License

MIT
