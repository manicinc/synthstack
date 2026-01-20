# SynthStack AI (Chat + Generations)

## Overview

In the Community Edition, SynthStack ships with **credit‑metered AI chat and generation endpoints** backed by the TypeScript ML service (`packages/ts-ml-service`). These power the in-app pages:

- `http://localhost:3050/app/chat` (AI Chat)
- `http://localhost:3050/app/generate` (Text Generation)
- `http://localhost:3050/app/images` (Image Generation)

> Pro-only: RAG indexing, multi-agent orchestration, and the full “Copilot Hub” UI. See `docs/PORTAL_COPILOT_ARCHITECTURE.md`.

---

## API Endpoints

All endpoints require auth and deduct credits on success.

### Chat (basic copilot)
- `POST /api/v1/chat/completions`
- `POST /api/v1/chat/completions/stream` (SSE)

### Generations
- `POST /api/v1/generation/text`
- `POST /api/v1/generation/image`

### Credits + Profile
- `GET /api/v1/users/me` (includes `credits_remaining` + tier)
- `GET /api/v1/users/me/history` (credit transactions)
- `GET /api/v1/credits/unified` (unified credit status)

**OpenAPI**: `http://localhost:3003/docs`

---

## Credit Behavior

- Insufficient balance returns **402** with `{ required, remaining }`.
- Credit transactions are recorded in `credit_transactions` with `type='generation'` and `transaction_type='deduction'`.
- Plan defaults are defined in `packages/api-gateway/src/services/stripe.ts` (`TIER_CONFIG`).

---

## Configuration

### Root (`.env`)
- `ML_SERVICE_URL` (default `http://localhost:8001`)
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` (depending on routing)

### Frontend (Vite `VITE_*` in root `.env`)
- `VITE_API_URL` (default `http://localhost:3003`)

---

## Troubleshooting

- If chat/generation returns 500, confirm `ML_SERVICE_URL` is reachable and the ML service is running.
- If you always get 402, verify your user row exists in `app_users` and your tier has credits (`TIER_CONFIG`).
- If auth fails, see `docs/AUTHENTICATION.md`.
