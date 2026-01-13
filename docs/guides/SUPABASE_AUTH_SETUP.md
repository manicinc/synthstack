# Supabase Auth Setup (Wizard)

Use this guide if you want **managed auth** with easy OAuth. Supabase is SynthStack’s default auth provider.

## What You’ll Get

- Email/password auth (with Supabase email flows)
- OAuth logins (Google/GitHub/Discord/etc) via Supabase
- Supabase dashboard for users/sessions/providers

## Important Clarification

Supabase Auth in SynthStack is for **authentication**. Your app still uses your Postgres database for application data via `DATABASE_URL`.

---

## Step 1: Create a Supabase Project

1. Create an account: https://supabase.com
2. Create a new project

---

## Step 2: Configure URLs (required for OAuth + magic links)

In Supabase: **Authentication → URL Configuration**

- **Site URL:** `https://YOUR_APP_DOMAIN`
- **Redirect URLs:** include:
  - `https://YOUR_APP_DOMAIN/**`
  - `http://localhost:3050/**` (local dev)

Supabase docs: https://supabase.com/docs/guides/auth/redirect-urls

---

## Step 3: Copy API Keys

In Supabase: **Project Settings → API**

Copy:
- `SUPABASE_URL` (Project URL)
- `SUPABASE_ANON_KEY` (safe for frontend)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, keep secret)

---

## Step 4: Set Environment Variables (Dev + Production)

### Local development (`apps/web/.env`)

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Local development (`packages/api-gateway/.env`)

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... # secret (server only)
```

### Production runtime (`deploy/.env` → `/opt/synthstack/deploy/.env`)

Put these in `deploy/.env` so `deploy/docker-compose.yml` passes them to the API container:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Production web build (GitHub Actions)

The web app is built in CI and needs Supabase keys at **build time**:

- GitHub Actions **Variables**: `VITE_SUPABASE_URL`
- GitHub Actions **Secrets**: `VITE_SUPABASE_ANON_KEY`

If you build locally, set `apps/web/.env` before running `pnpm --filter @synthstack/web build`.

---

## Step 5: Confirm SynthStack is Using Supabase

Supabase is the default. To explicitly set it:

```sql
UPDATE auth_provider_config
SET active_provider = 'supabase', supabase_enabled = true;
```

---

## Step 6: Enable OAuth Providers (Optional)

Supabase makes OAuth easy, but you still must create OAuth apps with Google/GitHub/etc.

- Supabase providers docs: https://supabase.com/docs/guides/auth/social-login
- SynthStack guide: [OAuth Setup (Supabase)](./OAUTH_SETUP.md)

---

## Step 7: Test

1. Start dev: `pnpm dev` (or deploy production)
2. Visit your app and sign up
3. Check what SynthStack reports:

```bash
curl http://localhost:3003/api/v1/auth/providers
```

You should see `activeProvider: "supabase"` and `providers.supabase: true`.

---

## Pros / Cons (Reality Check)

**Pros**
- Fastest setup + best OAuth story
- Managed auth service + dashboard

**Cons**
- External dependency / potential vendor lock-in
- Supabase uptime and plan limits apply
- You still must back up your **app database** (`DATABASE_URL`)

