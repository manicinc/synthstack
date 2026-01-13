# Environment Configuration Setup

## Overview

SynthStack uses environment files to configure both LITE and PRO versions. This guide explains the file structure and setup workflow.

## Environment Files

### Template Files (Committed to Git)

These files contain **placeholder values** and are safe to commit:

| File | Purpose |
|------|---------|
| `.env.example` | Main template with placeholder values (PRO version) |
| `.env.lite.example` | LITE version template (copilot/referrals disabled) |
| `.env.pro.example` | PRO version template (all features enabled) |

### Personal Configuration Files (NOT in Git)

These files contain **real credentials** and are ignored by git:

| File | Purpose | Created From |
|------|---------|--------------|
| `.env` | Active configuration used by services | Copy from any .example file |
| `.env.lite` | Your personal LITE version config with real values | Copy from `.env` and change flags |
| `.env.pro` | Your personal PRO version config with real values | Copy from `.env` and keep flags |

## Initial Setup

### 1. Copy Template to Active Config

```bash
# Copy the PRO template (recommended for development)
cp .env.example .env
```

### 2. Fill in Your Real Values

Edit `.env` and replace all placeholder values with your actual credentials:

```bash
# Before (placeholders)
OPENAI_API_KEY=sk-xxx
STRIPE_SECRET_KEY=sk_test_xxx
SUPABASE_URL=https://your-project.supabase.co

# After (your real values)
OPENAI_API_KEY=sk-proj-abc123...
STRIPE_SECRET_KEY=sk_test_51R8N...
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
```

### 3. Create Personal LITE and PRO Configs

Once your `.env` has real values, create personal versions for easy switching:

```bash
# Create LITE version (with your real credentials)
cp .env .env.lite

# Edit .env.lite and change feature flags to:
# ENABLE_COPILOT=false
# ENABLE_REFERRALS=false
# VITE_ENABLE_COPILOT=false
# VITE_ENABLE_REFERRALS=false

# Create PRO version (with your real credentials)
cp .env .env.pro

# Keep all flags as true in .env.pro
```

**Quick flag updates:**
```bash
# LITE version
sed -i '' 's/ENABLE_COPILOT=true/ENABLE_COPILOT=false/g' .env.lite
sed -i '' 's/ENABLE_REFERRALS=true/ENABLE_REFERRALS=false/g' .env.lite
sed -i '' 's/VITE_ENABLE_COPILOT=true/VITE_ENABLE_COPILOT=false/g' .env.lite
sed -i '' 's/VITE_ENABLE_REFERRALS=true/VITE_ENABLE_REFERRALS=false/g' .env.lite
```

## Switching Between Versions

### Using npm Scripts (Recommended)

The easiest way to switch versions:

```bash
# Run LITE version
pnpm dev:lite

# Run PRO version
pnpm dev:pro

# Build LITE version
pnpm build:lite

# Build PRO version
pnpm build:pro
```

These scripts automatically:
1. Copy `.env.lite` or `.env.pro` to `.env`
2. Start all services with the correct configuration

### Manual Switching

If you prefer manual control:

```bash
# Switch to LITE
cp .env.lite .env
pnpm dev

# Switch to PRO
cp .env.pro .env
pnpm dev
```

## Package-Level Configuration

Each package can override root environment variables with its own `.env` files:

### Backend (api-gateway)

```
packages/api-gateway/
├── .env.example        # Template (committed)
├── .env.lite.example   # LITE template (committed)
├── .env.pro.example    # PRO template (committed)
├── .env.lite           # Personal LITE config (gitignored)
├── .env.pro            # Personal PRO config (gitignored)
└── .env                # Active config (gitignored)
```

### Frontend (web)

```
apps/web/
├── .env.example        # Template (committed)
├── .env.lite.example   # LITE template (committed)
├── .env.pro.example    # PRO template (committed)
├── .env.lite           # Personal LITE config (gitignored)
├── .env.pro            # Personal PRO config (gitignored)
└── .env                # Active config (gitignored)
```

## What Gets Committed?

### ✅ Safe to Commit

- `.env.example` - Template with placeholders
- `.env.lite.example` - LITE template with placeholders
- `.env.pro.example` - PRO template with placeholders
- Any `.example` file

### ❌ Never Commit

- `.env` - Active config with real credentials
- `.env.lite` - Personal LITE config with real credentials
- `.env.pro` - Personal PRO config with real credentials
- `.env.local` - Local overrides
- Any file without `.example` suffix

These are protected by `.gitignore`:

```gitignore
# Environment files
.env
.env.local
.env.*.local
.env.lite
.env.pro
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
   # Root
   cp .env.example .env

   # Backend
   cp packages/api-gateway/.env.example packages/api-gateway/.env

   # Frontend
   cp apps/web/.env.example apps/web/.env
   ```

3. **Get credentials from team**
   - Ask team lead for credential values
   - Or use team's credential management system (1Password, etc.)

4. **Fill in credentials**
   - Edit all `.env` files with real values
   - Never commit these files

5. **Create LITE/PRO versions** (optional)
   ```bash
   # Root
   cp .env .env.lite && cp .env .env.pro

   # Edit .env.lite to disable copilot/referrals
   sed -i '' 's/ENABLE_COPILOT=true/ENABLE_COPILOT=false/g' .env.lite
   sed -i '' 's/ENABLE_REFERRALS=true/ENABLE_REFERRALS=false/g' .env.lite
   sed -i '' 's/VITE_ENABLE_COPILOT=true/VITE_ENABLE_COPILOT=false/g' .env.lite
   sed -i '' 's/VITE_ENABLE_REFERRALS=true/VITE_ENABLE_REFERRALS=false/g' .env.lite
   ```

### Sharing New Services/Credentials

When adding new services or credentials:

1. **Update templates only**
   ```bash
   # Edit .env.example with new placeholder
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

4. **Team members update their personal configs**
   ```bash
   # Each team member updates their .env
   echo "NEW_SERVICE_API_KEY=sk_real_value" >> .env
   ```

## CI/CD Considerations

### GitHub Actions

Use repository secrets instead of `.env` files:

```yaml
# .github/workflows/deploy.yml
env:
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
  ENABLE_COPILOT: true
  ENABLE_REFERRALS: true
```

### Docker/Kubernetes

Pass environment variables at runtime:

```bash
# Docker
docker run -e ENABLE_COPILOT=false -e ENABLE_REFERRALS=false synthstack:lite

# Kubernetes ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: synthstack-config
data:
  ENABLE_COPILOT: "false"
  ENABLE_REFERRALS: "false"
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

### Issue: Package-level .env overriding root .env

**This is by design!** Package-level environment files override root variables.

**Solution:** Either:
- Remove the package-level `.env` to use root config
- Or understand that package config takes precedence

## Security Best Practices

### ✅ DO

- Use `.env.example` templates with placeholders
- Keep real credentials in `.env` (gitignored)
- Rotate credentials if accidentally committed
- Use different credentials for dev/staging/prod
- Use password managers to share credentials
- Set up credential rotation schedule

### ❌ DON'T

- Commit `.env` files with real credentials
- Share credentials via email/Slack unencrypted
- Use production credentials in development
- Reuse credentials across environments
- Put credentials in code or scripts
- Leave default/example credentials in production

## Resources

- [Twelve-Factor App: Config](https://12factor.net/config)
- [OWASP: Credential Management](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Storage_Cheat_Sheet.html)
- [GitHub: Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
