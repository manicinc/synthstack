# Local PostgreSQL Auth Setup (Wizard)

Use this guide if you want **fully self-hosted authentication** (no Supabase dependency).

## What You’ll Get (Today)

- Email/password auth
- Argon2id password hashing
- API-issued JWT access + refresh tokens
- Email verification + password reset flows (requires email provider for real delivery)

## Current Limitations

- **OAuth/social login is not supported for local auth yet.**
  - If you need OAuth now, use [Supabase Auth Setup](./SUPABASE_AUTH_SETUP.md).

---

## Step 1: Ensure Local Auth Tables Exist

Local auth requires the migration:

- `services/directus/migrations/070_local_auth.sql`

You can verify tables exist:

```sql
SELECT to_regclass('public.local_auth_credentials') AS local_auth_credentials,
       to_regclass('public.auth_provider_config')   AS auth_provider_config;
```

### If the tables are missing (manual apply)

In local dev (docker compose):

```bash
docker compose exec -T postgres psql -U "${DB_USER:-synthstack}" -d "${DB_DATABASE:-synthstack}" < services/directus/migrations/070_local_auth.sql
```

In production, apply the same SQL against your production Postgres (where `DATABASE_URL` points).

---

## Step 2: Set Required Environment Variables

### Backend (`packages/api-gateway/.env`)

```bash
JWT_SECRET=$(openssl rand -base64 32)
```

You can leave Supabase env vars empty/unset:

```bash
# SUPABASE_URL=
# SUPABASE_ANON_KEY=
# SUPABASE_SERVICE_ROLE_KEY=
```

### Frontend (`apps/web/.env`)

Do not set Supabase frontend keys:

```bash
# VITE_SUPABASE_URL=
# VITE_SUPABASE_ANON_KEY=
```

### Production runtime (`deploy/.env`)

Ensure `JWT_SECRET` is set in `deploy/.env` (uploaded to `/opt/synthstack/deploy/.env`).

---

## Step 3: Enable Local Auth Provider

Run this in your SynthStack database:

```sql
UPDATE auth_provider_config
SET
  active_provider = 'local',
  local_enabled = true,
  supabase_enabled = false;
```

---

## Step 4: Email Verification + Password Reset

Local auth can send emails via the SynthStack email system when configured (recommended for production).

If no email provider is configured, verification/reset tokens are printed in the API logs for development.

---

## Step 5: Backups (You Own This)

With local auth, your Postgres database contains:
- app data **and**
- auth credentials/sessions

Make a backup plan:

- Use managed Postgres (RDS/Cloud SQL) if you want automated backups
- Or schedule `pg_dump` + offsite storage
- Or use provider snapshots (disk/EBS snapshots)

---

## Step 6: Test

1. Start dev: `pnpm dev` (or deploy production)
2. Sign up in the web app
3. Confirm SynthStack reports local auth:

```bash
curl http://localhost:3003/api/v1/auth/providers
```

You should see `activeProvider: "local"` and `providers.local: true`.

