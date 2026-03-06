# Invoice Generator UX Research (March 4, 2026)

## Goal
Define a practical frontend UX for an invoice generator that supports:
- fast invoice creation,
- AI-assisted workflows,
- low-friction onboarding,
- safe financial actions.

## Source-backed findings
1. Reduce manual follow-up by making reminders and payment collection part of the invoice flow.
Sources:
- Stripe Invoicing docs on automatic reminders and collection settings: https://docs.stripe.com/invoicing/automatic-collection
- Stripe hosted invoice page and online payment UX: https://docs.stripe.com/invoicing/hosted-invoice-page
- QuickBooks reminder automation guidance: https://quickbooks.intuit.com/learn-support/en-za/help-article/customer-statements/set-send-invoice-payment-reminders-quickbooks-online/L7wH9NVDN_ZA_en_ZA

2. Keep form completion efficient with inline, immediate validation near the field.
Sources:
- Baymard findings on inline validation timing and placement: https://baymard.com/blog/inline-form-validation
- GOV.UK error-message pattern for clear corrective guidance: https://design-system.service.gov.uk/components/error-message/

3. Financial submissions should support reversibility/review to reduce costly mistakes.
Source:
- WCAG 2.2 Success Criterion 3.3.4 (Error Prevention for legal/financial data): https://www.w3.org/WAI/WCAG22/quickref/?showtechniques=334%2C33#sufficient-techniques-49

## UX principles for this frontend
1. Dual path from the first screen:
- AI mode for natural-language invoice creation and file-assisted extraction.
- Manual mode for deterministic creation and status updates.

2. Reusable profile-first workflow:
- Encourage sender/client/bank profile setup once, then reuse in invoice creation.

3. Live totals and transparency:
- Show subtotal, tax, total before submit.

4. Operational visibility:
- Surface stream/tool/file events while AI runs so users trust what is happening.

5. Lightweight session model:
- Anonymous session by default (X-Session-Id), optional bearer token for authenticated mode.

## Implemented IA in this repo
- `AI Workspace`: chat, model/provider selection, API key entry, file attachment, stream events.
- `Invoices`: quick create form + list + status update + PDF download.
- `Profiles`: create and browse sender/client/bank reusable records.
- `Settings`: edit owner-scoped defaults (`currency`, `tax_rate`, sequence settings).

## Notes
- Current backend supports file uploads in chat endpoint (`multipart/form-data`) with MIME limits.
- PDF handling in the backend currently uses `image_url` blocks; provider-native PDF/document blocks should be validated and likely refined in backend for maximum reliability.
