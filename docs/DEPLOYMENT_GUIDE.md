# SynthStack Deployment Guide

SynthStack production deployment is **provider-agnostic**: any Ubuntu server with SSH access works (Linode, DigitalOcean, AWS EC2, GCP Compute Engine, Hetzner, etc.).

This repository’s production deployment uses:

- **Production compose:** `deploy/docker-compose.yml`
- **Runtime env file:** `deploy/.env` (gitignored — copy from `deploy/.env.example`)
- **Manual deploy helper:** `./deploy-with-env.sh` (uploads env + deploy config + web build)
- **CI/CD deploy:** GitHub Actions (push to `master`) — deploys artifacts/config but does **not** upload secrets/env

## Provider Guides

- [Deployment Providers Overview](./DEPLOYMENT_PROVIDERS.md)
- [AWS EC2 Deployment](./deployment/providers/AWS_EC2.md)
- [GCP Compute Engine Deployment](./deployment/providers/GCP_COMPUTE_ENGINE.md)

## Deployment Model (How It Works)

- **Web frontend** is deployed as static files to `/var/www/synthstack` and served by an Nginx container.
- **API + services** run via Docker Compose and read runtime configuration from `/opt/synthstack/deploy/.env`.
- **No AWS/GCP-specific env vars** are required — those providers only change how you provision the VM/networking.

## 1) One-Time Server Bootstrap

On your server (Ubuntu 22.04/24.04), you need:

- Docker + Docker Compose v2 (`docker compose`)
- An SSH user that can run Docker and write to:
  - `/opt/synthstack`
  - `/var/www/synthstack`
- Firewall open for:
  - `80/tcp` and `443/tcp`
  - `22/tcp` (SSH)

Example bootstrap (recommended `deploy` user):

```bash
curl -fsSL https://get.docker.com | sudo sh

sudo adduser deploy
sudo usermod -aG docker deploy

sudo mkdir -p /opt/synthstack /var/www/synthstack
sudo chown -R deploy:deploy /opt/synthstack /var/www/synthstack
```

## 2) Configure Runtime Environment (`deploy/.env`)

On your machine:

```bash
cp deploy/.env.example deploy/.env
# Edit deploy/.env
```

Upload it to the server (first deploy + whenever env changes):

```bash
export REMOTE_HOST_PRODUCTION=YOUR_SERVER_IP
export REMOTE_USER=deploy
export SSH_KEY=~/.ssh/id_ed25519

./deploy-with-env.sh
```

This uploads:

- `deploy/.env` → `/opt/synthstack/deploy/.env`
- `deploy/` → `/opt/synthstack/deploy/`
- web build (if present) → `/var/www/synthstack/`

> If your GHCR images are private, `deploy-with-env.sh` will attempt `docker login ghcr.io` using `GH_PAT` from `/opt/synthstack/deploy/.env` and `GHCR_USERNAME` (defaults to `manicinc`).

## 3) CI/CD Deploy (GitHub Actions)

GitHub Actions deploys on push to `master` and assumes `/opt/synthstack/deploy/.env` already exists on the server.

Required repo secrets:

- `REMOTE_SSH_KEY`
- `REMOTE_USER`
- `REMOTE_HOST_PRODUCTION`
- `GH_PAT` (for GHCR pulls)

Full reference:

- [GitHub Secrets (CI/CD)](./deployment/GITHUB_SECRETS.md)

## 4) Verify and Operate

On the server:

```bash
cd /opt/synthstack
docker compose -f deploy/docker-compose.yml ps
docker compose -f deploy/docker-compose.yml logs -f --tail=200
```

## Troubleshooting

- **`/opt/synthstack/deploy/.env not found` in CI/CD:** run `./deploy-with-env.sh` once (or create the file manually).
- **SSH blocked during CI/CD:** if you locked `22/tcp` to your laptop IP, GitHub-hosted runners won’t connect. Allow SSH from GitHub Actions IPs, use a self-hosted runner, or temporarily open `22/tcp`.
- **Docker permission denied:** ensure your SSH user is in the `docker` group and re-login.
- **GHCR unauthorized:** ensure `GH_PAT` has `read:packages`, and the server is logged in to GHCR (CI does this automatically).

## Related Documentation

- [Deployment Quick Start](./DEPLOYMENT_QUICK_START.md)
- [Operations Guide](./OPERATIONS_GUIDE.md)
- [Cloudflare Integration](./CLOUDFLARE_INTEGRATION.md)

