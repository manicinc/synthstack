# Self-Hosting SynthStack (Community Edition)

This guide covers running SynthStack on your own infrastructure — both **locally** (Docker) and in **production** (VPS/cloud).

## Start Here

- Local dev: [Quick Start](./QUICK_START.md)
- Production deploy (30 minutes): [Deployment Quick Start](./DEPLOYMENT_QUICK_START.md)
- Full production details: [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- Auth decision (Supabase vs Local): [Auth Provider Wizard](./guides/AUTH_PROVIDER_WIZARD.md)

---

## Local Development (Docker)

1. Clone the repo:

```bash
git clone https://github.com/manicinc/synthstack.git
cd synthstack
```

2. Configure environment:

```bash
cp .env.example .env
```

3. Install dependencies + start services:

```bash
pnpm install

# Community stack (no AI services)
docker compose -f docker-compose.community.yml up -d
```

4. Access:

- Web App: http://localhost:3050
- API Docs: http://localhost:3003/docs
- Admin CMS (Directus): http://localhost:8099/admin

### Database Migrations (Community Docker Compose)

App migrations live in `services/directus/migrations/*.sql`.

With `docker-compose.community.yml`, those SQL files run automatically **only on first database initialization** (Postgres init scripts).

If you pull updates that include new migrations, apply the new SQL manually:

```bash
docker compose -f docker-compose.community.yml exec -T postgres \
  psql -U "${DB_USER:-synthstack}" -d "${DB_DATABASE:-synthstack}" \
  < services/directus/migrations/<NEW_MIGRATION>.sql
```

---

## Production Deployment (VPS / Cloud)

SynthStack’s production deployment is provider-agnostic. AWS/GCP don’t require special `.env` values — they only change how you provision the VM and networking.

Provider walkthroughs:
- [AWS EC2 Deployment](./deployment/providers/AWS_EC2.md)
- [GCP Compute Engine Deployment](./deployment/providers/GCP_COMPUTE_ENGINE.md)
- [All Providers](./DEPLOYMENT_PROVIDERS.md)

Start here:
- [Deployment Quick Start](./DEPLOYMENT_QUICK_START.md)

---

## Authentication Provider Setup (Supabase vs Local PostgreSQL)

SynthStack supports two auth providers:

- **Supabase Auth** (default) — managed auth + OAuth
- **Local PostgreSQL Auth** — self-hosted auth in your database (**email/password today; OAuth not implemented yet**)

Start with:
- [Auth Provider Wizard](./guides/AUTH_PROVIDER_WIZARD.md)
- [Supabase Auth Setup](./guides/SUPABASE_AUTH_SETUP.md)
- [Local Auth Setup](./guides/LOCAL_AUTH_SETUP.md)

---

## Backups & Reliability (Don’t Skip This)

- You always need to back up your **SynthStack Postgres** (`DATABASE_URL`) — it contains your application data.
- If you choose **Local PostgreSQL Auth**, your Postgres also contains auth credentials/sessions — **you own backups**.

Good options:
- Managed Postgres (RDS / Cloud SQL) + point `DATABASE_URL` at it
- `pg_dump` scheduled to offsite storage
- VM disk snapshots (AWS EBS / GCP Persistent Disk)

---

## Support

- Troubleshooting: [Troubleshooting](./TROUBLESHOOTING.md)
- GitHub Issues: https://github.com/manicinc/synthstack/issues
