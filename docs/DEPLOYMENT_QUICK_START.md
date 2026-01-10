# Quick Start Guide

Get SynthStack deployed in **under 30 minutes**.

---

## Choose Your Version

**Community Edition (Free)**
- GitHub Template: [github.com/manicinc/synthstack](https://github.com/manicinc/synthstack)
- Full-stack SaaS starter
- Core features included
- Perfect for learning & side projects

**Pro Edition (Premium)**
- GitHub Template: [github.com/manicinc/synthstack-pro](https://github.com/manicinc/synthstack-pro) _(Coming Soon)_
- Everything in Community +
- Advanced AI features
- Priority support
- Commercial license

---

## Step 1: Clone the Template

### Option A: Use GitHub Template (Recommended)

1. Go to [github.com/manicinc/synthstack](https://github.com/manicinc/synthstack)
2. Click **"Use this template"** → **"Create a new repository"**
3. Name your repo (e.g., `my-saas-app`)
4. Choose **Public** or **Private**
5. Click **"Create repository"**

### Option B: Clone Manually

```bash
git clone https://github.com/manicinc/synthstack.git my-saas-app
cd my-saas-app
rm -rf .git
git init
git remote add origin https://github.com/YOUR_USERNAME/my-saas-app.git
```

---

## Step 2: Choose Deployment Method

### 🚀 Automated (Recommended)
- Push to GitHub → auto-deploys
- GitHub Actions handles everything
- Best for teams & production

**[Continue to Automated Setup →](#automated-deployment-setup)**

### 🛠️ Manual
- Deploy from your computer
- Full control
- Best for testing

**[Continue to Manual Setup →](#manual-deployment-setup)**

---

## Automated Deployment Setup

### Prerequisites

- [ ] GitHub account
- [ ] Cloud server (Linode, DigitalOcean, AWS, Vultr, or Hetzner)
- [ ] 30 minutes

### 2.1: Provision Server

Choose a cloud provider:

| Provider | Cost/Month | Sign Up |
|----------|------------|---------|
| **Hetzner** | $9 | [console.hetzner.cloud](https://console.hetzner.cloud) ⭐ Best Value |
| **Vultr** | $24 | [vultr.com](https://vultr.com) |
| **Linode** | $36 | [cloud.linode.com](https://cloud.linode.com) |
| **DigitalOcean** | $48 | [digitalocean.com](https://digitalocean.com) |
| **AWS EC2** | $30-40 | [aws.amazon.com](https://aws.amazon.com) |

**Server Requirements:**
- **OS:** Ubuntu 24.04 LTS
- **RAM:** 4GB minimum (8GB recommended)
- **CPU:** 2+ cores
- **Storage:** 80GB SSD

**Setup Steps:**
1. Create account at your chosen provider
2. Add your SSH public key (see below)
3. Create server with Ubuntu 24.04
4. Copy the server's **IP address**

**Generate SSH Key (if you don't have one):**
```bash
ssh-keygen -t ed25519 -C "your-email@example.com" -f ~/.ssh/synthstack_deploy
```

**Get your public key:**
```bash
cat ~/.ssh/synthstack_deploy.pub
```

Add this public key to your cloud provider's SSH keys section.

---

### 2.2: Configure GitHub Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these **4 required secrets:**

| Secret Name | Value | Where to Get It |
|-------------|-------|-----------------|
| `REMOTE_SSH_KEY` | Your SSH **private** key | `cat ~/.ssh/synthstack_deploy` |
| `REMOTE_USER` | SSH username | `root` (Linode/DO/Vultr/Hetzner) or `ubuntu` (AWS) |
| `REMOTE_HOST_PRODUCTION` | Server IP address | Your cloud provider dashboard |
| `GH_PAT` | GitHub Personal Access Token | [github.com/settings/tokens](https://github.com/settings/tokens) (select `read:packages`) |

> ⚠️ **GH_PAT is required!** Your server needs it to pull Docker images from GitHub Container Registry. Without it, deployments fail with "unauthorized" errors.

**Optional secrets:**

| Secret Name | Value | Purpose |
|-------------|-------|---------|
| `REMOTE_HOST_STAGING` | Staging server IP | For staging environment |
| `DEPLOYMENT_PROVIDER` | `linode`, `digitalocean`, etc. | For reference only |

---

### 2.3: Configure Environment Variables

Create `.env` files for each package:

```bash
# API Gateway
cp packages/api-gateway/.env.example packages/api-gateway/.env

# Web Frontend
cp apps/web/.env.example apps/web/.env

# Directus CMS
cp services/directus/.env.example services/directus/.env
```

**Edit each `.env` file with your keys:**

#### Required API Keys:

**Stripe (Payments)** - Get from [dashboard.stripe.com](https://dashboard.stripe.com)
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Resend (Email)** - Get from [resend.com/api-keys](https://resend.com/api-keys)
```bash
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**OpenAI (AI Features)** - Get from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
```bash
OPENAI_API_KEY=sk-proj-...
```

**Authentication (Choose One):**

Option A: **Supabase** (Recommended) - Get from [supabase.com/dashboard](https://supabase.com/dashboard)
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Option B: **Local PostgreSQL** (Self-hosted)
```bash
JWT_SECRET=$(openssl rand -base64 32)
DATABASE_URL=postgres://synthstack:password@postgres:5432/synthstack
```

**Generate secure secrets:**
```bash
# JWT Secret (256-bit)
openssl rand -base64 32

# Directus Key & Secret
openssl rand -hex 32
```

---

### 2.4: Initial Deployment

**Upload .env files to server:**
```bash
./deploy-with-env.sh
```

This script:
1. ✅ Uploads your `.env` files to the server
2. ✅ Deploys code via rsync
3. ✅ Installs Docker + Docker Compose
4. ✅ Starts all services

**Watch the deployment:**
```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# View logs
cd /opt/synthstack
docker-compose logs -f
```

---

### 2.5: Configure DNS (Optional)

Point your domain to your server:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_SERVER_IP | 300 |
| A | www | YOUR_SERVER_IP | 300 |
| A | api | YOUR_SERVER_IP | 300 |
| A | admin | YOUR_SERVER_IP | 300 |

**SSL Certificates:**
- Traefik automatically obtains Let's Encrypt SSL
- Requires DNS to be configured first
- Certificates renew automatically

---

### 2.6: Continuous Deployment

From now on, **every push to `main` deploys automatically:**

```bash
git add .
git commit -m "feat: add new feature"
git push origin main
```

GitHub Actions will:
1. Run tests
2. Build Docker images
3. SSH into your server
4. Deploy latest code
5. Restart services

**Monitor deployments:**
- GitHub repo → **Actions** tab

---

## Manual Deployment Setup

### 3.1: Install Prerequisites

**On your local machine:**
```bash
# macOS
brew install docker docker-compose

# Linux
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### 3.2: Configure Environment

```bash
# Copy example files
cp .env.example .env
cp packages/api-gateway/.env.example packages/api-gateway/.env
cp apps/web/.env.example apps/web/.env

# Fill in your API keys (see section 2.3 above)
```

### 3.3: Start Services Locally

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

**Access your app:**
- Frontend: http://localhost:3000
- API: http://localhost:3030
- Directus Admin: http://localhost:8055

### 3.4: Deploy to Server

```bash
# Deploy to production
./deploy-with-env.sh
```

---

## Next Steps

### ✅ Verify Deployment

**Check services are running:**
```bash
curl http://YOUR_SERVER_IP          # Frontend
curl http://YOUR_SERVER_IP:3030/health  # API
```

### 🎨 Customize Your App

1. **Branding:**
   - Update `apps/web/src/config/branding.ts`
   - Replace logo: `apps/web/public/logo.svg`
   - Update colors: `apps/web/src/css/variables.css`

2. **Features:**
   - Enable/disable features: `services/directus/migrations/`
   - Configure pricing tiers: Stripe Dashboard
   - Set up OAuth: [docs/AUTHENTICATION.md](./AUTHENTICATION.md)

3. **Content:**
   - Login to Directus: `http://YOUR_SERVER_IP:8055`
   - Default credentials: Check `.env` for `DIRECTUS_ADMIN_EMAIL`
   - Create pages, blog posts, documentation

### 📊 Set Up Monitoring

**Add health checks:**
1. Sign up at [uptimerobot.com](https://uptimerobot.com) (free)
2. Monitor: `http://YOUR_SERVER_IP:3030/health`
3. Get alerts for downtime

**View metrics:**
```bash
ssh root@YOUR_SERVER_IP
cd /opt/synthstack
docker stats
```

### 🔒 Secure Your App

1. **Enable firewall:**
```bash
ssh root@YOUR_SERVER_IP
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

2. **Rotate secrets:**
   - Generate new JWT_SECRET
   - Update Stripe webhook secrets
   - Regenerate API keys quarterly

3. **Enable backups:**
   - Linode: Settings → Backups ($7.20/month)
   - Manual: `docker exec postgres pg_dump > backup.sql`

### 🚀 Go Live

**Production checklist:**
- [ ] DNS configured and propagated
- [ ] SSL certificates obtained (automatic via Traefik)
- [ ] Environment variables set to production values
- [ ] Stripe live keys (not test keys)
- [ ] Email domain verified (Resend)
- [ ] Analytics configured (optional)
- [ ] Error tracking enabled ([Sentry Setup Guide](./guides/SENTRY_SETUP.md), recommended)
- [ ] Backups enabled
- [ ] Uptime monitoring configured

---

## Troubleshooting

### Services won't start

```bash
# Check logs
ssh root@YOUR_SERVER_IP
cd /opt/synthstack
docker-compose logs

# Common issues:
# - Missing .env files → Run ./deploy-with-env.sh
# - Port conflicts → Check nothing else using ports 80,443,3030,8055
# - Database connection → Verify DATABASE_URL in .env
```

### Deployment fails

```bash
# Check GitHub Actions logs
# Go to: github.com/YOUR_USERNAME/YOUR_REPO/actions

# Common issues:
# - Wrong SSH key → Verify REMOTE_SSH_KEY in GitHub Secrets
# - Wrong server IP → Verify REMOTE_HOST_PRODUCTION
# - SSH connection refused → Check server firewall allows port 22
```

### SSL certificates not working

```bash
# Requirements:
# 1. DNS must point to server
# 2. Ports 80 and 443 must be open
# 3. Wait 5-10 minutes after DNS change

# Check DNS propagation:
dig yourdomain.com +short  # Should return YOUR_SERVER_IP

# Force Traefik to retry:
ssh root@YOUR_SERVER_IP
cd /opt/synthstack
docker-compose restart traefik
```

### Can't access Directus

```bash
# Check it's running:
ssh root@YOUR_SERVER_IP
docker-compose ps directus

# Reset admin password:
docker-compose exec directus npx directus users update-password admin@example.com

# Check logs:
docker-compose logs directus
```

---

## Getting Help

- **Documentation:** [github.com/manicinc/synthstack/docs](https://github.com/manicinc/synthstack/tree/main/docs)
- **Issues:** [github.com/manicinc/synthstack/issues](https://github.com/manicinc/synthstack/issues)
- **Discord:** Coming soon
- **Email:** team@manic.agency

---

## What's Next?

1. **Learn More:**
   - [Authentication Guide](./AUTHENTICATION.md)
   - [Self-Hosting Guide](./SELF_HOSTING.md)
   - [Deployment Providers](./DEPLOYMENT_PROVIDERS.md)
   - [Feature Flags](./FEATURE_FLAGS.md)

2. **Customize:**
   - [Design System](./DESIGN_SYSTEM.md)
   - [White Label](./WHITE_LABEL.md)
   - [Pricing & Features](./PRICING_AND_FEATURES.md)

3. **Extend:**
   - [Email Service](./EMAIL_SERVICE.md)
   - [Cron Jobs](./CRON_JOBS.md)
   - [ML Service](./ML_SERVICE_FASTAPI.md)

---

**Ready to build your SaaS?** 🚀

Welcome to the SynthStack community!
