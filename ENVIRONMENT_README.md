# Environment Configuration - Quick Reference

## TL;DR

```bash
# 1) Create your root env file
cp .env.example .env

# 2) Fill in required credentials in .env
#    - DATABASE_URL / DB_* (if not using Docker Postgres)
#    - DIRECTUS_* (admin + keys)
#    - SUPABASE_* (if using Supabase auth)
#    - STRIPE_* (if enabling billing)
#    - OPENAI_API_KEY / ANTHROPIC_API_KEY (for AI)

# 3) Start infra/services (recommended)
docker compose up -d

# 4) Run the web app in dev mode
pnpm dev:web
```

## Source Of Truth

- All packages load configuration from the repo root `.env`.
- Only `VITE_*` variables are exposed to the frontend (Vite); server secrets should never use the `VITE_` prefix.

## Useful Commands

- Web dev: `pnpm dev:web`
- API dev: `pnpm dev:api`
- Docker stack: `docker compose up -d` / `docker compose down`
- Generate `.env` from `config.json`: `pnpm generate:env --edition lite --output .env`

## Docs

- `docs/ENVIRONMENT_SETUP.md`
- `docs/AUTHENTICATION.md`
- `docs/features/STRIPE_INTEGRATION.md`

