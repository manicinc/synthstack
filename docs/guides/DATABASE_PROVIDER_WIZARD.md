# Database Provider Wizard (Local Postgres vs Managed Postgres)

SynthStack always needs a PostgreSQL database for application data (`DATABASE_URL`). This wizard helps you choose **where that Postgres lives**, and what you give up / gain with each option.

If you’re deciding **auth** (Supabase Auth vs Local Auth), start here instead:
- [Auth Provider Wizard](./AUTH_PROVIDER_WIZARD.md)

---

## Quick Decision (60 seconds)

### Pick **Local Postgres (Docker)** if…

- You want the simplest deployment (one VM, one `docker compose`).
- You’re okay managing reliability/backups yourself.
- You don’t need HA/replication right now.

This is the default for:
- local dev (`docker-compose.yml`)
- production deploy (`deploy/docker-compose.yml`)

### Pick **Managed Postgres** if…

- You want managed backups, easy restores, and built-in monitoring.
- You want HA/replication without doing it yourself.
- You’re okay paying for reliability and depending on a provider.

Common choices:
- Supabase Postgres
- AWS RDS Postgres
- GCP Cloud SQL Postgres
- Neon / Railway / Render Postgres

---

## Pros / Cons (Reality Check)

### Local Postgres (self-hosted)

**Pros**
- Fastest path to a working production instance
- No separate database account/VPC/networking to set up
- Easy to reason about (everything on one box)

**Cons**
- Your VM disk is a single point of failure
- You own upgrades, monitoring, and restores
- Backups are only as good as your offsite strategy

> SynthStack Community production compose includes a Postgres backup container, but it writes backups to the server disk by default. Treat that as “better than nothing”, not a full disaster-recovery plan.

### Managed Postgres

**Pros**
- Automated backups (plan/provider dependent), point-in-time recovery, replication
- Better durability than a single VM disk
- Monitoring, alerts, and scaling options

**Cons**
- Extra cost
- Networking/setup complexity (firewalls, TLS, connection pooling)
- You still need to keep `DATABASE_URL` secure and rotate creds if leaked

---

## What You Actually Configure

### Local Dev

No special choice: use `docker-compose.yml` and keep:

- `DATABASE_URL=postgresql://...@postgres:5432/...`

### Production (VPS / AWS EC2 / GCP VM)

Provisioning the VM is provider-specific, but the SynthStack config is not:

- [Deployment Guide](../DEPLOYMENT_GUIDE.md)
- [AWS EC2 Deployment](../deployment/providers/AWS_EC2.md)
- [GCP Compute Engine Deployment](../deployment/providers/GCP_COMPUTE_ENGINE.md)

`DATABASE_URL` is the key variable either way.

---

## Managed Postgres: Important Note (Directus + Migrations)

SynthStack runs:
- **API Gateway** using `DATABASE_URL`
- **Directus** using `DB_HOST/DB_USER/DB_PASSWORD/...` (in Docker Compose)
- **Migrations** via the one-shot `directus-migrate` service

If you move to managed Postgres, all three must point at the **same database**.

Recommended workflow:
1. Start with the default (local Postgres) and get everything working.
2. When you’re ready, migrate to managed Postgres by updating your production compose configuration to point Directus + the migrator at the managed DB.

---

## Backups (Don’t Skip This)

- If you run **Local Postgres**, you must set up offsite backups (object storage, snapshots, or a managed DB).
- If you use **Managed Postgres**, confirm what your plan actually provides (retention, PITR, restores) and still practice restores.

