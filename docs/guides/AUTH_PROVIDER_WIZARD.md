# Auth Provider Wizard (Supabase vs Local PostgreSQL)

SynthStack supports two production-ready auth providers:

- **Supabase Auth** (default) — managed auth + easy OAuth
- **Local PostgreSQL Auth** — self-hosted auth inside your database

This wizard helps you pick the right one and points you to the exact setup steps.

---

## Quick Decision (60 seconds)

### Pick **Supabase Auth** if…

- You want the fastest setup and the fewest moving parts.
- You need **Google/GitHub/Discord OAuth** now.
- You want a hosted user-management UI (Supabase dashboard).
- You’re okay depending on an external service for auth.

Next: [Supabase Auth Setup](./SUPABASE_AUTH_SETUP.md)

### Pick **Local PostgreSQL Auth** if…

- You must be fully self-hosted (no third-party auth service).
- Email + password is enough (OAuth for local auth is **not implemented yet**).
- You’re comfortable owning security, email deliverability, and backups.

Next: [Local Auth Setup](./LOCAL_AUTH_SETUP.md)

---

## What “Auth Provider” Changes (and what it doesn’t)

**Does change:**
- Where user identities live (Supabase vs your Postgres tables)
- Who issues/verifies sessions (Supabase JWTs vs your API issuing JWTs)
- OAuth experience (easy in Supabase; local OAuth is coming later)

**Does not change:**
- Your SynthStack application database (`DATABASE_URL`) — you still need Postgres for app data.

---

## Backups & Responsibility (Make This Decision Explicit)

### If you choose **Supabase Auth**

- Supabase manages auth infrastructure (availability/updates/backup policies depend on your plan).
- You still must back up your **SynthStack app database** (`DATABASE_URL`) separately.

Useful links:
- Supabase Auth docs: https://supabase.com/docs/guides/auth
- Supabase backups (plan-dependent): https://supabase.com/docs/guides/platform/backups

### If you choose **Local PostgreSQL Auth**

- Your database now contains **both app data and auth data** (`local_auth_*`, `auth_provider_config`).
- There is no “managed backups” unless you use a managed Postgres or set up backups yourself.

Good options:
- Provider snapshots (AWS EBS snapshots / GCP disk snapshots)
- Managed Postgres (RDS / Cloud SQL) and point `DATABASE_URL` at it

---

## Full Reference

- [Authentication Documentation](../AUTHENTICATION.md)

