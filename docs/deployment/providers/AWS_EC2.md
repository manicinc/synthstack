# AWS EC2 Deployment (Full Walkthrough)

This guide walks through deploying SynthStack to **AWS EC2** using the same **provider-agnostic SSH + Docker Compose** workflow used for any VPS.

**Good news:** you do **not** need AWS-specific `.env` variables. AWS is just “an Ubuntu box with SSH + a public IP”.

## What You’ll Deploy

- **Server:** Ubuntu 22.04/24.04 on EC2
- **Reverse proxy + TLS:** Traefik (Let’s Encrypt)
- **Web:** Static SPA served by Nginx container
- **API + services:** Docker containers pulled from GHCR
- **State:** Postgres + Redis volumes on the instance (or optional managed services)

If you haven’t yet, skim:
- [Deployment Guide](../../DEPLOYMENT_GUIDE.md)
- [GitHub Secrets (CI/CD)](../GITHUB_SECRETS.md)

---

## 1) Create the EC2 Instance

1. **EC2 → Launch instance**
2. **AMI:** Ubuntu Server 24.04 LTS (22.04 is also fine)
3. **Instance type:** `t3.medium` (4GB RAM) minimum recommended
4. **Storage:** 80GB `gp3` (or larger if you expect lots of media/logs)
5. **Key pair:**
   - Create/import an SSH keypair
   - Download the private key (`.pem`) and keep it safe
6. **Network / Security group inbound rules:**
   - `22/tcp` (SSH) from your IP **or** from GitHub Actions runner IPs (if using CI/CD)
   - `80/tcp` (HTTP) from `0.0.0.0/0`
   - `443/tcp` (HTTPS) from `0.0.0.0/0`

### Optional: Elastic IP (Recommended)

Allocate and attach an **Elastic IP** so your server IP does not change across restarts.

---

## 2) SSH In (First Time)

Ubuntu AMIs typically use the `ubuntu` user:

```bash
chmod 600 ~/.ssh/your-ec2-key.pem
ssh -i ~/.ssh/your-ec2-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

---

## 3) Prepare the Server (Docker + Permissions)

Your CI/CD pipeline needs a user that can:
- write to `/opt/synthstack` and `/var/www/synthstack`
- run Docker (`docker`, `docker compose`)

### Recommended: Create a Dedicated `deploy` User

While logged in as `ubuntu`:

```bash
# Create deploy user
sudo adduser deploy

# Allow docker usage and sudo (ubuntu is typically passwordless sudo on EC2)
sudo usermod -aG sudo deploy

# Install Docker + compose plugin
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker deploy

# Prepare directories for CI deploys
sudo mkdir -p /opt/synthstack /var/www/synthstack
sudo chown -R deploy:deploy /opt/synthstack /var/www/synthstack
```

Then re-login so group membership applies:

```bash
exit
ssh -i ~/.ssh/your-ec2-key.pem deploy@YOUR_EC2_PUBLIC_IP
docker ps
```

If `docker ps` works without `sudo`, you’re good.

---

## 4) Create the Production Environment File

On the server, create:

- **Path:** `/opt/synthstack/deploy/.env`

This is the single runtime env file used by `deploy/docker-compose.yml`.

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

# Needed for GHCR pulls at deploy time AND for GitHub org access at runtime (if used)
GH_PAT=ghp_xxx
GITHUB_ORG_PAT=
GITHUB_ORG_NAME=manicinc
GITHUB_TEAM_SLUG=synthstack-pro

# Optional uploads (Cloudflare R2)
CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=
CLOUDFLARE_R2_BUCKET=
```

---

## 5) Configure GitHub Actions Secrets

In your repo: **Settings → Secrets and variables → Actions → Secrets**

Required:
- `REMOTE_SSH_KEY` (the private key contents)
- `REMOTE_USER` (`deploy`)
- `REMOTE_HOST_PRODUCTION` (your Elastic IP or public IP)
- `GH_PAT` (token with at least `read:packages` to pull container images)

Full reference:
- [GitHub Secrets (CI/CD)](../GITHUB_SECRETS.md)

---

## 6) First Deployment

Once secrets are set and `/opt/synthstack/deploy/.env` exists on the server:

1. Push to the deploy branch (currently `master`) to trigger CI/CD.
2. Watch GitHub Actions logs.
3. Verify on the server:

```bash
cd /opt/synthstack
docker compose -f deploy/docker-compose.yml ps
```

---

## 7) DNS + TLS (Let’s Encrypt)

Point DNS A records to your Elastic IP:

- `@` → `YOUR_EC2_ELASTIC_IP`
- `www` → `YOUR_EC2_ELASTIC_IP`
- `api` → `YOUR_EC2_ELASTIC_IP`
- `admin` → `YOUR_EC2_ELASTIC_IP`
- (optional) `traefik` → `YOUR_EC2_ELASTIC_IP`

Traefik will request certificates automatically once DNS resolves.

---

## 8) Optional: AWS Managed Services (No New SynthStack Vars)

If you prefer managed services, you typically only swap existing connection strings:

- **RDS Postgres:** set `DATABASE_URL` to your RDS endpoint (and disable/omit the local Postgres service if you customize the compose)
- **ElastiCache Redis:** set `REDIS_URL` (if supported in your compose/app config) to your Redis endpoint

No “AWS-only” envs are required by SynthStack for EC2 itself.

---

## Troubleshooting

- **SSH works locally but not in GitHub Actions:** confirm the same private key is in `REMOTE_SSH_KEY`, and `REMOTE_USER` matches the server user.
- **HTTP/HTTPS timeouts:** verify Security Group inbound rules for `80/443` and that your instance has a public IP / Elastic IP attached.
- **Permissions errors writing `/opt/synthstack` or `/var/www/synthstack`:** ensure those directories are owned by `deploy`.
- **Docker permission denied:** ensure `deploy` is in the `docker` group and you re-logged in after adding it.
