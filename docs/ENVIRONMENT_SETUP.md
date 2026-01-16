# Environment Configuration Setup

## Overview

SynthStack uses environment files to configure the application. This guide explains the file structure and setup workflow.

## Environment Files

### Template Files (Committed to Git)

These files contain **placeholder values** and are safe to commit:

| File | Purpose |
|------|---------|
| `.env.example` | Main template with placeholder values |

### Personal Configuration Files (NOT in Git)

These files contain **real credentials** and are ignored by git:

| File | Purpose | Created From |
|------|---------|--------------|
| `.env` | Active configuration used by services | Copy from `.env.example` |

## Initial Setup

### 1. Copy Template to Active Config

```bash
cp .env.example .env
```

### 2. Fill in Your Real Values

Edit `.env` and replace all placeholder values with your actual credentials:

```bash
# Before (placeholders)
OPENAI_API_KEY=sk-xxx
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY

# After (your real values)
OPENAI_API_KEY=sk-proj-abc123...
STRIPE_SECRET_KEY=sk_live_...
```

### 3. Start Development

```bash
pnpm dev
```

## Package-Level Configuration

Some packages use their own `.env` files (frontend), while others load the root `.env` (backend).

### Backend (api-gateway)

The API gateway loads environment variables from the **repo root** `.env` by default:

- Source: `packages/api-gateway/src/config/index.ts`
- Template reference: `packages/api-gateway/.env.example` (for docs/visibility)

### Frontend (web)

```
apps/web/
├── .env.example        # Template (committed)
└── .env                # Active config (gitignored)
```

## What Gets Committed?

### Safe to Commit

- `.env.example` - Template with placeholders
- Any `.example` file

### Never Commit

- `.env` - Active config with real credentials
- `.env.local` - Local overrides
- Any file without `.example` suffix

These are protected by `.gitignore`:

```gitignore
# Environment files
.env
.env.local
.env.*.local
```

## Team Workflow

### New Team Member Setup

1. **Clone repository**
   ```bash
   git clone https://github.com/manicinc/synthstack.git
   cd synthstack
   ```

2. **Copy templates**
   ```bash
   cp .env.example .env
   cp apps/web/.env.example apps/web/.env
   ```

3. **Get credentials from team**
   - Ask team lead for credential values
   - Or use team's credential management system (1Password, etc.)

4. **Fill in credentials**
   - Edit `.env` and `apps/web/.env` with real values
   - Never commit these files

5. **Run development**
   ```bash
   pnpm dev
   ```

### Sharing New Services/Credentials

When adding new services or credentials:

1. **Update templates only**
   ```bash
   vim .env.example
   # Add: NEW_SERVICE_API_KEY=your-api-key-here
   ```

2. **Commit template changes**
   ```bash
   git add .env.example
   git commit -m "Add NEW_SERVICE_API_KEY to environment template"
   git push
   ```

3. **Share real values separately**
   - Via Slack/email (encrypted)
   - Via password manager
   - Via secure credential storage

## CI/CD Considerations

### GitHub Actions

Use repository secrets instead of `.env` files:

```yaml
# .github/workflows/deploy.yml
env:
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
```

### Docker/Kubernetes

Pass environment variables at runtime:

```bash
# Docker
docker run -e OPENAI_API_KEY=... synthstack:latest

# Kubernetes ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: synthstack-config
data:
  NODE_ENV: "production"
```

## Troubleshooting

### Issue: Changes to .env not taking effect

**Solution:** Restart development servers

```bash
# Kill all services
pkill -f "tsx watch"
pkill -f "quasar dev"

# Restart
pnpm dev
```

### Issue: Missing environment variable

**Check order of precedence:**

1. System environment variables (highest priority)
2. `.env.local` (local overrides)
3. `.env` (active config)
4. `.env.example` (fallback template)

**Solution:** Add missing variable to `.env`

```bash
echo "MISSING_VAR=value" >> .env
```

### Issue: Accidentally committed .env file

**Immediate action:**

```bash
# Remove from git but keep locally
git rm --cached .env

# Commit the removal
git commit -m "Remove .env from git (contains secrets)"

# Push immediately
git push

# Rotate all exposed credentials!
```

## Security Best Practices

### DO

- Use `.env.example` templates with placeholders
- Keep real credentials in `.env` (gitignored)
- Rotate credentials if accidentally committed
- Use different credentials for dev/staging/prod
- Use password managers to share credentials

### DON'T

- Commit `.env` files with real credentials
- Share credentials via email/Slack unencrypted
- Use production credentials in development
- Reuse credentials across environments
- Put credentials in code or scripts

## Resources

- [Twelve-Factor App: Config](https://12factor.net/config)
- [OWASP: Credential Management](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Storage_Cheat_Sheet.html)
- [GitHub: Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
