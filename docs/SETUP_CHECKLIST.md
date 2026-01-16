# SynthStack Production Setup Checklist

This is the practical checklist for launching a production SynthStack Community instance using `deploy/docker-compose.yml`.

Start here (in order):
- [Deployment Quick Start](./DEPLOYMENT_QUICK_START.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Auth Provider Wizard](./guides/AUTH_PROVIDER_WIZARD.md)
- [Database Provider Wizard](./guides/DATABASE_PROVIDER_WIZARD.md)

---

## 1) Confirm License/Use Case

- [ ] Confirm you’re allowed to use the Community edition for your use case
- [ ] Review: [License FAQ](./LICENSE-FAQ.md)
- [ ] Feature overview: [Pricing & Features](./PRICING_AND_FEATURES.md)

---

## 2) Provision Your Server (Provider-Agnostic)

- [ ] Ubuntu 22.04/24.04 VM with a public IP (4GB+ RAM recommended)
- [ ] Firewall open: `80/tcp`, `443/tcp`, `22/tcp`
- [ ] (Recommended) Static IP (AWS Elastic IP / GCP reserved IP)

Provider walkthroughs:
- [AWS EC2 Deployment](./deployment/providers/AWS_EC2.md)
- [GCP Compute Engine Deployment](./deployment/providers/GCP_COMPUTE_ENGINE.md)

---

## 3) Create a Deploy User + Install Docker

- [ ] Create a `deploy` user (or pick an existing one)
- [ ] Ensure the user can run `docker` without password prompts
- [ ] Ensure the user can write to `/opt/synthstack` and `/var/www/synthstack`

Reference: [Deployment Guide](./DEPLOYMENT_GUIDE.md)

---

## 4) Configure Production Environment (`deploy/.env`)

On your machine:

- [ ] `cp deploy/.env.example deploy/.env`
- [ ] Fill in required values (minimum):
  - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`
  - `JWT_SECRET`
  - `DIRECTUS_KEY`, `DIRECTUS_SECRET`, `DIRECTUS_ADMIN_EMAIL`, `DIRECTUS_ADMIN_PASSWORD`, `DIRECTUS_ADMIN_TOKEN`

Auth choice:
- [ ] Supabase Auth: set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - Setup: [Supabase Auth Setup](./guides/SUPABASE_AUTH_SETUP.md)
- [ ] Local Auth: no Supabase keys required
  - Setup: [Local Auth Setup](./guides/LOCAL_AUTH_SETUP.md)

---

## 5) Configure CI/CD Secrets (Optional, but Recommended)

If using GitHub Actions deploys, set repo secrets:
- [ ] `REMOTE_SSH_KEY`
- [ ] `REMOTE_USER`
- [ ] `REMOTE_HOST_PRODUCTION`

Reference: [GitHub Secrets](./deployment/GITHUB_SECRETS.md)

---

## 6) First Deploy

Recommended first deploy (uploads `deploy/.env` + deploy config):
- [ ] Run `./deploy-with-env.sh`

Then verify on the server:
- [ ] `docker compose -f deploy/docker-compose.yml ps`
- [ ] `docker compose -f deploy/docker-compose.yml logs -f --tail=200`

---

## 7) Migrations (How Your DB Gets Created)

You should not manually paste SQL into dashboards.

SynthStack uses a one-shot migrator container (`directus-migrate`) that applies `*.sql` files and records them in `synthstack_migrations`.

- [ ] Run migrations on the server:

```bash
docker compose -f deploy/docker-compose.yml up -d directus-migrate
```

Reference: [Database Management](./DATABASE_MANAGEMENT.md)

---

## 8) Stripe (Optional)

- [ ] Set `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` in `deploy/.env`
- [ ] Create webhook endpoint in Stripe pointing at your production API

Guide: [Stripe Integration](./features/STRIPE_INTEGRATION.md)

---

## 9) Email (Recommended)

- [ ] Set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME` in `deploy/.env`

Guide: [Email Service](./EMAIL_SERVICE.md)

---

## 10) Backups (Don’t Skip This)

- [ ] If you run local Postgres on the VM: confirm you have offsite backups/snapshots
- [ ] If you use managed Postgres: confirm your plan’s retention + practice restores

Reference:
- [Database Provider Wizard](./guides/DATABASE_PROVIDER_WIZARD.md)
- [Database Management](./DATABASE_MANAGEMENT.md)

---

## 11) Production Security Basics

- [ ] Rotate any default/example secrets before launch
- [ ] Lock down SSH (`22/tcp`) as appropriate for your deploy method
- [ ] Ensure HTTPS works for `@`, `www`, `api`, and `admin`
- [ ] Verify CORS is correct for your domains

---

**Last Updated:** January 2026
