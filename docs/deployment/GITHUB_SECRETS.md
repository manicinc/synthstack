# GitHub Secrets & Variables Configuration

Required secrets and variables for the SynthStack CI/CD pipeline.

## Repository Secrets

Add these in **Settings → Secrets and variables → Actions → Secrets**

## Runtime Configuration vs CI/CD Secrets

SynthStack’s default production deploy reads **runtime secrets** from:

- Local: `deploy/.env` (copy from `deploy/.env.example`)
- Server: `/opt/synthstack/deploy/.env`

GitHub Actions secrets are primarily for **connecting to the server** (`REMOTE_*`) and pulling images (`GH_PAT`).

### Deployment Configuration

Deploy to any VPS provider: Linode, DigitalOcean, AWS EC2, Vultr, Hetzner, or any server with SSH access.

| Secret | Description | Example |
|--------|-------------|---------|
| `REMOTE_SSH_KEY` | SSH private key for server access | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `REMOTE_USER` | SSH username on remote server | `root`, `deploy`, `ubuntu`, `ec2-user` |
| `REMOTE_HOST_PRODUCTION` | Production server IP or hostname | `172.105.34.567` or `example.com` |
| `REMOTE_HOST_STAGING` | Staging server IP or hostname (optional) | `172.105.78.910` or `staging.example.com` |
| `GH_PAT` | **GitHub Personal Access Token** (required for Docker image pulls) | `<github_pat>` |
| `DEPLOYMENT_PROVIDER` | Cloud provider name (optional) | `linode`, `digitalocean`, `aws`, `gcp`, `vultr` |

#### ⚠️ GH_PAT (Required)

Your production server needs to pull Docker images from GitHub Container Registry. Create a Personal Access Token:

1. Go to **https://github.com/settings/tokens** → **Generate new token (classic)**
2. Select scope: **`read:packages`**
3. Generate and copy the token
4. Add as secret: `GH_PAT`

Without this, deployments will fail with "unauthorized" when pulling images.

**Provider-Specific Examples:**

- **Linode:** User: `root`, Port: `22`, Host: IP from dashboard
- **DigitalOcean:** User: `root` or created user, Port: `22`, Host: Droplet IP
- **AWS EC2:** User: `deploy` (recommended) or `ubuntu` (Ubuntu AMI), Port: `22`, Host: Instance public IP
- **GCP Compute Engine:** User: `deploy` (recommended), Port: `22`, Host: VM external IP
- **Vultr:** User: `root`, Port: `22`, Host: Server IP
- **Hetzner:** User: `root`, Port: `22`, Host: Server IP

### Database & Services

| Secret | Description | Example |
|--------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@host:5432/synthstack` |
| `JWT_SECRET` | JWT signing secret (32+ chars) | `your-super-secret-jwt-key-min-32-chars` |

### Authentication

Choose your auth provider:

| Secret | Description | Required For |
|--------|-------------|--------------|
| `SUPABASE_URL` | Supabase project URL | Supabase Auth (default) |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key | Supabase Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Supabase Auth |
| `JWT_SECRET` | JWT signing secret | Local PostgreSQL Auth |

**Note:** See [Authentication Documentation](../AUTHENTICATION.md) for setup guides.

### Payment Processing

| Secret | Description | Example |
|--------|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe secret API key | `<stripe_secret_key>` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `<stripe_publishable_key>` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `<stripe_webhook_secret>` |

### AI/ML Services

| Secret | Description | Example |
|--------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `ANTHROPIC_API_KEY` | Anthropic (Claude) API key | `sk-ant-...` |

### Email Service

| Secret | Description | Example |
|--------|-------------|---------|
| `RESEND_API_KEY` | Resend email API key | `re_...` |

### Storage (Cloudflare R2)

| Secret | Description | Example |
|--------|-------------|---------|
| `CLOUDFLARE_R2_ACCESS_KEY` | R2 access key ID | `abc123...` |
| `CLOUDFLARE_R2_SECRET_KEY` | R2 secret access key | `xyz789...` |
| `CLOUDFLARE_R2_BUCKET` | R2 bucket name | `synthstack-uploads` |
| `CLOUDFLARE_ZONE_ID` | Cloudflare zone ID (for cache purge) | `abc123def456...` |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token | `...` |

### CMS (Directus)

| Secret | Description | Example |
|--------|-------------|---------|
| `DIRECTUS_KEY` | Directus key | Random UUID |
| `DIRECTUS_SECRET` | Directus secret | Random 32+ char string |
| `ADMIN_EMAIL` | Directus admin email | `admin@synthstack.app` |
| `ADMIN_PASSWORD` | Directus admin password | Strong password |

### Notifications (Optional)

| Secret | Description | Example |
|--------|-------------|---------|
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL | `https://hooks.slack.com/services/...` |

### Analytics & Monitoring (Optional)

| Secret | Description | Example |
|--------|-------------|---------|
| `CODECOV_TOKEN` | Codecov upload token | `abc123...` |
| `SENTRY_DSN_FRONTEND` | Sentry DSN for Vue.js app | `https://xxx@o123456.ingest.sentry.io/xxx` |
| `SENTRY_DSN_BACKEND` | Sentry DSN for API Gateway | `https://xxx@o123456.ingest.sentry.io/xxx` |
| `SENTRY_AUTH_TOKEN` | Sentry auth token for source maps | `sntrys_xxx...` |

**Sentry Setup:**
1. Create account at [sentry.io](https://sentry.io)
2. Create Vue.js project for frontend
3. Create Node.js project for backend
4. Copy DSNs to secrets above
5. Get auth token from User Settings → Auth Tokens

📖 [Full Sentry Guide](../guides/SENTRY_SETUP.md)

---

## Repository Variables

Add these in **Settings → Secrets and variables → Actions → Variables**

These are non-sensitive configuration values.

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Public API URL | `https://api.synthstack.app` |
| `VITE_SUPABASE_URL` | Supabase project URL (if using Supabase) | `https://xxx.supabase.co` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `<stripe_publishable_key>` |
| `DOMAIN` | Main domain | `synthstack.app` |

---

## Environment-Specific Secrets

For staging vs production, create **Environments** in GitHub:
1. Go to **Settings → Environments**
2. Create `staging` and `production` environments
3. Add environment-specific secrets (different API keys, hosts, etc.)

---

## Quick Setup Script

Run this to set secrets via GitHub CLI:

```bash
# Install GitHub CLI: https://cli.github.com/

# Deployment configuration
gh secret set REMOTE_SSH_KEY < ~/.ssh/id_ed25519_production
gh secret set REMOTE_USER -b "root"
gh secret set REMOTE_HOST_PRODUCTION -b "YOUR_SERVER_IP"
gh secret set REMOTE_HOST_STAGING -b "YOUR_STAGING_IP"  # Optional
gh secret set DEPLOYMENT_PROVIDER -b "linode"  # Optional: linode/digitalocean/aws/vultr

# REQUIRED: GitHub PAT for Docker image pulls
# Create at: https://github.com/settings/tokens (select read:packages scope)
gh secret set GH_PAT -b "ghp_your_token_here"

# Database & core
gh secret set DATABASE_URL
gh secret set JWT_SECRET

# Authentication (choose Supabase OR Local PostgreSQL)
# For Supabase (default):
gh secret set SUPABASE_URL
gh secret set SUPABASE_ANON_KEY
gh secret set SUPABASE_SERVICE_ROLE_KEY

# For Local PostgreSQL Auth:
gh secret set JWT_SECRET  # Already set above

# Payments
gh secret set STRIPE_SECRET_KEY
gh secret set STRIPE_PUBLISHABLE_KEY
gh secret set STRIPE_WEBHOOK_SECRET

# Email
gh secret set RESEND_API_KEY

# AI services
gh secret set OPENAI_API_KEY
gh secret set ANTHROPIC_API_KEY

# Storage (optional)
gh secret set CLOUDFLARE_R2_ACCESS_KEY
gh secret set CLOUDFLARE_R2_SECRET_KEY
gh secret set CLOUDFLARE_R2_BUCKET -b "synthstack-uploads"
gh secret set CLOUDFLARE_ZONE_ID
gh secret set CLOUDFLARE_API_TOKEN

# Directus CMS
gh secret set ADMIN_EMAIL -b "admin@synthstack.app"
gh secret set ADMIN_PASSWORD

# Notifications (optional)
gh secret set SLACK_WEBHOOK_URL

# Set variables
gh variable set VITE_API_URL -b "https://api.synthstack.app"
gh variable set VITE_SUPABASE_URL -b "https://xxx.supabase.co"  # If using Supabase
gh variable set VITE_STRIPE_PUBLISHABLE_KEY -b "<stripe_publishable_key>"
gh variable set DOMAIN -b "synthstack.app"
```

---

## Provider-Specific Setup Guides

### Linode

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "linode-deployment" -f ~/.ssh/id_ed25519_linode

# Add public key to Linode: https://cloud.linode.com/profile/keys

# Set secrets
gh secret set REMOTE_SSH_KEY < ~/.ssh/id_ed25519_linode
gh secret set REMOTE_USER -b "root"
gh secret set REMOTE_HOST_PRODUCTION -b "YOUR_LINODE_IP"
gh secret set DEPLOYMENT_PROVIDER -b "linode"

# REQUIRED: GitHub PAT for Docker pulls (create at github.com/settings/tokens with read:packages)
gh secret set GH_PAT -b "ghp_your_token_here"
```

### DigitalOcean

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "digitalocean-deployment" -f ~/.ssh/id_ed25519_do

# Add public key to DigitalOcean: https://cloud.digitalocean.com/account/security

# Set secrets
gh secret set REMOTE_SSH_KEY < ~/.ssh/id_ed25519_do
gh secret set REMOTE_USER -b "root"  # or created user
gh secret set REMOTE_HOST_PRODUCTION -b "YOUR_DROPLET_IP"
gh secret set DEPLOYMENT_PROVIDER -b "digitalocean"
gh secret set GH_PAT -b "ghp_your_token_here"  # Required for Docker pulls
```

### AWS EC2

```bash
# Use existing key pair or create new one in EC2 console

# Set secrets
gh secret set REMOTE_SSH_KEY < ~/.ssh/your-ec2-keypair.pem
gh secret set REMOTE_USER -b "deploy"  # recommended (or ubuntu/ec2-user if configured)
gh secret set REMOTE_HOST_PRODUCTION -b "YOUR_EC2_PUBLIC_IP"
gh secret set DEPLOYMENT_PROVIDER -b "aws"
gh secret set GH_PAT -b "ghp_your_token_here"  # Required for Docker pulls
```

### GCP Compute Engine

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "gcp-deployment" -f ~/.ssh/id_ed25519_gcp

# Add public key to your VM (Compute Engine → VM → Edit → SSH Keys)
# Format: deploy:ssh-ed25519 AAAA... your-email@example.com

# Set secrets
gh secret set REMOTE_SSH_KEY < ~/.ssh/id_ed25519_gcp
gh secret set REMOTE_USER -b "deploy"
gh secret set REMOTE_HOST_PRODUCTION -b "YOUR_GCP_VM_EXTERNAL_IP"
gh secret set DEPLOYMENT_PROVIDER -b "gcp"
gh secret set GH_PAT -b "ghp_your_token_here"  # Required for Docker pulls
```

### Vultr

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "vultr-deployment" -f ~/.ssh/id_ed25519_vultr

# Add public key to Vultr: https://my.vultr.com/settings/#settingssshkeys

# Set secrets
gh secret set REMOTE_SSH_KEY < ~/.ssh/id_ed25519_vultr
gh secret set REMOTE_USER -b "root"
gh secret set REMOTE_HOST_PRODUCTION -b "YOUR_VULTR_IP"
gh secret set DEPLOYMENT_PROVIDER -b "vultr"
gh secret set GH_PAT -b "ghp_your_token_here"  # Required for Docker pulls
```

### Hetzner Cloud

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "hetzner-deployment" -f ~/.ssh/id_ed25519_hetzner

# Add public key to Hetzner: https://console.hetzner.cloud/ → Security → SSH Keys

# Set secrets
gh secret set REMOTE_SSH_KEY < ~/.ssh/id_ed25519_hetzner
gh secret set REMOTE_USER -b "root"
gh secret set REMOTE_HOST_PRODUCTION -b "YOUR_HETZNER_IP"
gh secret set DEPLOYMENT_PROVIDER -b "hetzner"
gh secret set GH_PAT -b "ghp_your_token_here"  # Required for Docker pulls
```

---

## Migration from Linode-Specific Variables

If you have existing `LINODE_*` secrets, migrate to `REMOTE_*`:

```bash
# Option 1: Manual via GitHub UI
# 1. Copy values from old secrets
# 2. Create new REMOTE_* secrets
# 3. Delete old LINODE_* secrets

# Option 2: Via GitHub CLI
gh secret list  # View current secrets

# Set new secrets (paste values when prompted)
gh secret set REMOTE_SSH_KEY
gh secret set REMOTE_USER
gh secret set REMOTE_HOST_PRODUCTION
gh secret set REMOTE_HOST_STAGING

# Delete old secrets
gh secret delete LINODE_SSH_KEY
gh secret delete LINODE_USER
gh secret delete LINODE_PRODUCTION_HOST
gh secret delete LINODE_STAGING_HOST
```

---

## Local Development

Copy `.env.example` to `.env` and fill in your development values:

```bash
cp .env.example .env
```

The local docker-compose uses these environment variables.

---

## Security Best Practices

1. **Never commit secrets** to version control
2. **Rotate secrets regularly** (every 90 days recommended)
3. **Use environment-specific secrets** for staging vs production
4. **Limit secret access** using GitHub environment protection rules
5. **Generate strong secrets:**
   ```bash
   # JWT Secret (256-bit)
   openssl rand -base64 32

   # Encryption Key (256-bit hex)
   openssl rand -hex 32
   ```

---

## Related Documentation

- [Authentication Setup](../AUTHENTICATION.md)
- [Deployment Providers Guide](../DEPLOYMENT_PROVIDERS.md)
- [Self-Hosting Guide](../SELF_HOSTING.md)
