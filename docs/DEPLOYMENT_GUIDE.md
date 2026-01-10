# SynthStack Deployment Guide

## Quick Start: Deploy to Linode (or any VPS)

### Prerequisites
- ✅ Linode server created (IP: 50.116.40.126)
- ✅ SSH key added to GitHub secrets
- ✅ Local .env files configured

---

## Option 1: One-Command Deployment (Recommended)

Deploy everything (code + .env files) from your local machine:

```bash
./deploy-with-env.sh
```

This script:
1. ✅ Checks for required .env files
2. ✅ Uploads .env files to server via SCP
3. ✅ Deploys code to server via rsync
4. ✅ Installs Docker + Docker Compose (if needed)
5. ✅ Starts all services

**When to use:** First deployment or when .env files change

---

## Option 2: GitHub Actions Auto-Deploy

Push to main branch → auto-deploys to server (code only, not .env)

### First-Time Setup:

**1. Upload .env files once:**
```bash
# From your local machine
./deploy-with-env.sh
```

**2. GitHub Secrets (already configured):**
- `REMOTE_SSH_KEY` - SSH private key
- `REMOTE_USER` - root
- `REMOTE_HOST_PRODUCTION` - 50.116.40.126

**3. Push code:**
```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

GitHub Actions will automatically:
- SSH into your server
- Pull latest code
- Restart Docker containers
- ✅ .env files remain untouched on server

**When to use:** Code changes (daily workflow)

---

## Environment Variables

### Required .env Files:

1. **`apps/web/.env`** - Frontend configuration
2. **`packages/api-gateway/.env`** - API configuration
3. **`services/directus/.env`** - CMS configuration

### Where are they stored?

| Location | Purpose | When Created |
|----------|---------|--------------|
| **Local** | Development | You create from .env.example |
| **Server** | Production | Uploaded via `deploy-with-env.sh` |
| **GitHub Secrets** | Deployment Connection | Manual setup (done) |

**Important:** GitHub Secrets only store **connection details** (SSH key, host, user), NOT your app secrets. App secrets live in .env files on the server.

---

## Deployment Workflows

### Scenario 1: First Deployment
```bash
# 1. Configure local .env files
cp apps/web/.env.example apps/web/.env
cp packages/api-gateway/.env.example packages/api-gateway/.env
cp services/directus/.env.example services/directus/.env

# 2. Fill in values (Stripe keys, API keys, etc.)
# Edit each .env file

# 3. Deploy everything
./deploy-with-env.sh
```

### Scenario 2: Code Update (Daily)
```bash
# Option A: Auto-deploy via GitHub Actions
git push origin main  # Auto-deploys

# Option B: Manual deploy (faster, no GitHub Actions)
./deploy-with-env.sh
```

### Scenario 3: .env Update
```bash
# Update local .env files, then:
./deploy-with-env.sh
```

---

## Server Access

### SSH into server:
```bash
ssh root@50.116.40.126
```

### View logs:
```bash
ssh root@50.116.40.126 'cd /opt/synthstack && docker-compose logs -f'
```

### Restart services:
```bash
ssh root@50.116.40.126 'cd /opt/synthstack && docker-compose restart'
```

### Check status:
```bash
ssh root@50.116.40.126 'cd /opt/synthstack && docker-compose ps'
```

---

## Troubleshooting

### ❌ "Missing .env files" error
```bash
# Create from examples:
cp apps/web/.env.example apps/web/.env
# Fill in values, then deploy again
```

### ❌ SSH connection refused
```bash
# Check SSH key permissions:
chmod 600 ~/.ssh/id_ed25519
```

### ❌ Docker not installed on server
```bash
# deploy-with-env.sh auto-installs Docker
# Or manually:
ssh root@50.116.40.126
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### ❌ Services not starting
```bash
# Check logs:
ssh root@50.116.40.126 'cd /opt/synthstack && docker-compose logs'
```

---

## Security Best Practices

✅ **DO:**
- Keep .env files gitignored (never commit)
- Rotate SSH keys after sharing in chat/screenshots
- Use strong database passwords
- Enable firewall on server (ports 22, 80, 443 only)

❌ **DON'T:**
- Commit .env files to git
- Share API keys in public channels
- Use default passwords in production
- Leave port 3000, 8055 open to internet (use Traefik proxy)

---

## Next Steps

After first deployment:

1. **Configure DNS:**
   - Point `synthstack.app` → `50.116.40.126`
   - Point `api.synthstack.app` → `50.116.40.126`
   - Point `admin.synthstack.app` → `50.116.40.126`

2. **Enable SSL:**
   - Traefik auto-obtains Let's Encrypt certificates
   - Requires DNS to be configured first

3. **Set up monitoring:**
   - Add health check pings
   - Configure uptime monitoring

4. **Database backups:**
   - Enable Linode backups ($7.20/month)
   - Or configure automated PostgreSQL dumps

---

## Architecture

```
Your Computer          GitHub          Linode Server
    │                    │                   │
    │  git push          │                   │
    ├───────────────────>│                   │
    │                    │  SSH + rsync      │
    │                    ├──────────────────>│
    │                    │                   │
    │  ./deploy-with-env.sh                  │
    ├───────────────────────────────────────>│
    │    (SCP .env + rsync code)             │
    │                                         │
    │                                    Docker
    │                                 ┌────────────┐
    │                                 │ Traefik    │
    │                                 │ Frontend   │
    │                                 │ API        │
    │                                 │ Directus   │
    │                                 │ PostgreSQL │
    │                                 │ Redis      │
    │                                 └────────────┘
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Server provisioned (Linode, DigitalOcean, AWS, etc.)
- [ ] SSH key generated and added to server
- [ ] GitHub secrets configured (REMOTE_SSH_KEY, REMOTE_USER, REMOTE_HOST_PRODUCTION)
- [ ] Local .env files created and configured
- [ ] DNS configured (if using custom domain)

### First Deployment
- [ ] Run `./deploy-with-env.sh`
- [ ] Verify services running: `ssh root@IP 'docker-compose ps'`
- [ ] Test frontend: `http://IP`
- [ ] Test API: `http://IP:3000/health`
- [ ] Test Directus: `http://IP:8055`

### Ongoing Deployments
- [ ] Code changes: `git push origin main` (auto-deploys via GitHub Actions)
- [ ] .env changes: `./deploy-with-env.sh`
- [ ] Monitor logs: `ssh root@IP 'docker-compose logs -f'`

---

## Support

- **Documentation:** [docs/DEPLOYMENT_PROVIDERS.md](docs/DEPLOYMENT_PROVIDERS.md)
- **GitHub Issues:** https://github.com/your-repo/synthstack/issues
- **Discord:** (coming soon)
