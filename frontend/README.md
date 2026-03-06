# Invoice Generator Frontend

Next.js + Tailwind frontend for the Invoice Generator API.

## Features
- AI chat workspace with optional file/image attachment upload.
- Manual invoice creation with live totals.
- Invoice list with status update and PDF download.
- Reusable profile management (sender/client/bank).
- Settings editor for owner-scoped defaults.
- Anonymous mode (`X-Session-Id`) plus optional Firebase bearer token.

## Prerequisites
- Node.js 20+
- Running backend API (default `http://localhost:8100`)

## Local Development
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables
- `NEXT_PUBLIC_API_BASE_URL` (required): backend API base URL.

## Production Build
```bash
cd frontend
npm run lint
npm run build
npm run start
```

## Docker
```bash
cd frontend
docker build \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://YOUR_BACKEND_URL \
  -t invoice-generator-frontend .
docker run -p 8080:8080 invoice-generator-frontend
```

## Cloud Run via Cloud Build
From repository root:

```bash
gcloud builds submit \
  --config cloudbuild.frontend.yaml \
  --substitutions _API_BASE_URL=https://YOUR_BACKEND_URL
```

Default substitutions in `cloudbuild.frontend.yaml`:
- `_REGION=asia-southeast1`
- `_REPO=delegate`
- `_SERVICE=invoice-generator-frontend`

## UX Research
See `UX_RESEARCH.md` for source-backed UX decisions used in this frontend.
