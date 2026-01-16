# Deployment Quick Start (Production)

Deploy SynthStack to any VPS/cloud VM in ~30 minutes. This flow works on **Linode, DigitalOcean, AWS EC2, GCP Compute Engine, Hetzner**, and more.

## 1) Provision a Server

Requirements:

- Ubuntu 22.04 or 24.04
- 4GB RAM minimum (8GB recommended)
- Ports open: `80/tcp`, `443/tcp`, `22/tcp`
- A static public IP (recommended)

Provider walkthroughs:

- [AWS EC2 Deployment](./deployment/providers/AWS_EC2.md)
- [GCP Compute Engine Deployment](./deployment/providers/GCP_COMPUTE_ENGINE.md)
- [All Providers](./DEPLOYMENT_PROVIDERS.md)

## 2) Bootstrap the Server (Docker + Deploy User)

SSH to the server and run:

```bash
curl -fsSL https://get.docker.com | sudo sh

sudo adduser deploy
sudo usermod -aG docker deploy

sudo mkdir -p /opt/synthstack /var/www/synthstack
sudo chown -R deploy:deploy /opt/synthstack /var/www/synthstack
```

Re-login as `deploy` and verify Docker works:

```bash
docker ps
docker compose version
```

## 3) Create the Production Env File

On your machine:

```bash
cp deploy/.env.example deploy/.env
# Edit deploy/.env
```

This file is uploaded to `/opt/synthstack/deploy/.env` on the server and is used by `deploy/docker-compose.yml`.

## 4) Configure GitHub Secrets (CI/CD)

In your GitHub repo: **Settings → Secrets and variables → Actions → Secrets**

Required secrets:

- `REMOTE_SSH_KEY` (private key contents)
- `REMOTE_USER` (`deploy`)
- `REMOTE_HOST_PRODUCTION` (server IP/hostname)
- `GH_PAT` (token with `read:packages` for GHCR pulls)

Reference:

- [GitHub Secrets (CI/CD)](./deployment/GITHUB_SECRETS.md)

## 5) First Deployment

### Option A: Manual (Uploads env + config + web build)

Build the web app:

```bash
pnpm --filter @synthstack/web build
```

Run the deploy helper:

```bash
export REMOTE_HOST_PRODUCTION=YOUR_SERVER_IP
export REMOTE_USER=deploy
export SSH_KEY=~/.ssh/id_ed25519

./deploy-with-env.sh
```

### Option B: GitHub Actions (Code/Artifacts Only)

Push to `master` to trigger deploy. GitHub Actions assumes `/opt/synthstack/deploy/.env` already exists (use Option A once, or create it manually on the server).

## 6) DNS + TLS

Create A records pointing to your server IP:

- `@`
- `www`
- `api`
- `admin`
- (optional) `traefik`

Traefik will request Let’s Encrypt certificates automatically once DNS resolves.

## 7) Verify

On the server:

```bash
cd /opt/synthstack
docker compose -f deploy/docker-compose.yml ps
docker compose -f deploy/docker-compose.yml logs -f --tail=200
```

## Common Gotcha: SSH Firewall Rules

If you deploy via **GitHub-hosted Actions**, port `22/tcp` must be reachable from GitHub runner IPs (not just your laptop). Use GitHub IP ranges, a self-hosted runner, or temporarily open `22/tcp` while keeping key-based auth enabled.

