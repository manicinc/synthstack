# GCP Compute Engine Deployment (Full Walkthrough)

This guide walks through deploying SynthStack to **Google Cloud Compute Engine** using the same **provider-agnostic SSH + Docker Compose** workflow used for any VPS.

**Good news:** you do **not** need GCP-specific `.env` variables. GCP is just “an Ubuntu box with SSH + a public IP”.

If you haven’t yet, skim:
- [Deployment Guide](../../DEPLOYMENT_GUIDE.md)
- [GitHub Secrets (CI/CD)](../GITHUB_SECRETS.md)

---

## 1) Create the VM

1. **Compute Engine → VM instances → Create instance**
2. **OS:** Ubuntu 24.04 LTS (22.04 also fine)
3. **Machine type:** `e2-medium` (2 vCPU / 4GB) minimum recommended
4. **Disk:** 50GB+ SSD recommended for production
5. **Networking:**
   - Ensure the VM has an **External IPv4**
   - Check **Allow HTTP traffic** and **Allow HTTPS traffic**

### Static External IP (Recommended)

Reserve a static address so your IP doesn’t change:

- **VPC network → IP addresses → Reserve static address**
- Attach it to the VM

---

## 2) Firewall Rules (SSH / HTTP / HTTPS)

You need:
- `80/tcp` and `443/tcp` from the internet
- `22/tcp` for SSH

**Important:** if you deploy via **GitHub-hosted Actions**, SSH must be reachable from GitHub runner IPs (not just your laptop). Options:

- allow `22/tcp` from `0.0.0.0/0` and harden SSH (key-only, fail2ban), or
- restrict to GitHub Actions IP ranges and keep them updated, or
- use a self-hosted runner inside your network.

---

## 3) SSH Access (First Time)

Use the console “SSH” button for first access, or configure a key and connect from your machine.

If you add an SSH key via instance metadata, the format is:

```
deploy:ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... your-email@example.com
```

Then connect:

```bash
ssh deploy@YOUR_VM_EXTERNAL_IP
```

<details>
  <summary>OS Login vs metadata keys</summary>

For CI/CD with GitHub Actions, metadata SSH keys are usually simplest because they give you a stable `REMOTE_USER` + keypair.

If you use OS Login, the SSH username is tied to your Google identity, which is often not ideal for automated deploys.
</details>

---

## 4) Prepare the Server (Docker + Permissions)

Your deploy user must be able to:
- write to `/opt/synthstack` and `/var/www/synthstack`
- run Docker (`docker`, `docker compose`)

As a sudo-capable user:

```bash
# Install Docker + compose plugin
curl -fsSL https://get.docker.com | sudo sh

# Create a deploy user (if you don't already have one)
sudo adduser deploy

# Allow docker usage and (optional) sudo
sudo usermod -aG docker deploy
sudo usermod -aG sudo deploy

# Prepare directories used by CI deploys
sudo mkdir -p /opt/synthstack /var/www/synthstack
sudo chown -R deploy:deploy /opt/synthstack /var/www/synthstack
```

Re-login so group membership applies:

```bash
exit
ssh deploy@YOUR_VM_EXTERNAL_IP
docker ps
```

---

## 5) Create the Production Environment File

On the server, create:

- **Path:** `/opt/synthstack/deploy/.env`

Tip: keep this as `deploy/.env` locally (copy from `deploy/.env.example`) and upload it with `./deploy-with-env.sh`.

```bash
mkdir -p /opt/synthstack/deploy
nano /opt/synthstack/deploy/.env
```

Minimum recommended values (example placeholders):

```env
POSTGRES_USER=synthstack
POSTGRES_PASSWORD=change-me

DATABASE_URL=postgresql://synthstack:change-me@postgres:5432/synthstack
JWT_SECRET=change-me-min-32-chars

DIRECTUS_KEY=change-me
DIRECTUS_SECRET=change-me
DIRECTUS_ADMIN_EMAIL=admin@yourdomain.com
DIRECTUS_ADMIN_PASSWORD=change-me
DIRECTUS_ADMIN_TOKEN=change-me

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

OPENAI_API_KEY=
ANTHROPIC_API_KEY=

RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_FROM_NAME=

GH_PAT=ghp_xxx
GITHUB_ORG_PAT=
GITHUB_ORG_NAME=manicinc
GITHUB_TEAM_SLUG=synthstack-pro

CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=
CLOUDFLARE_R2_BUCKET=
```

---

## 6) Configure GitHub Actions Secrets

In your repo: **Settings → Secrets and variables → Actions → Secrets**

Required:
- `REMOTE_SSH_KEY` (the private key contents)
- `REMOTE_USER` (`deploy`)
- `REMOTE_HOST_PRODUCTION` (static external IP or hostname)
- `GH_PAT` (token with at least `read:packages` to pull container images)

Full reference:
- [GitHub Secrets (CI/CD)](../GITHUB_SECRETS.md)

---

## 7) First Deployment

Once secrets are set and `/opt/synthstack/deploy/.env` exists on the server:

1. Push to the deploy branch (currently `master`) to trigger CI/CD.
2. Watch GitHub Actions logs.
3. Verify on the server:

```bash
cd /opt/synthstack
docker compose -f deploy/docker-compose.yml ps
```

---

## 8) Optional: Cloud SQL / Memorystore (No New SynthStack Vars)

If you prefer managed services, you typically only swap existing connection strings:

- **Cloud SQL Postgres:** set `DATABASE_URL` to your Cloud SQL endpoint (or connect via private networking)
- **Memorystore Redis:** set `REDIS_URL` (if supported in your compose/app config) to your Redis endpoint

No “GCP-only” envs are required by SynthStack for Compute Engine itself.
