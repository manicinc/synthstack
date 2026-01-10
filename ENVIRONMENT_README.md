# Environment Configuration - Quick Reference

## TL;DR

```bash
# First time setup
cp .env.example .env
# Fill in your real credentials in .env

# Create personal LITE/PRO configs
cp .env .env.lite && cp .env .env.pro

# Disable copilot/referrals in LITE
sed -i '' 's/ENABLE_COPILOT=true/ENABLE_COPILOT=false/g' .env.lite
sed -i '' 's/ENABLE_REFERRALS=true/ENABLE_REFERRALS=false/g' .env.lite
sed -i '' 's/VITE_ENABLE_COPILOT=true/VITE_ENABLE_COPILOT=false/g' .env.lite
sed -i '' 's/VITE_ENABLE_REFERRALS=true/VITE_ENABLE_REFERRALS=false/g' .env.lite

# Run LITE version
pnpm dev:lite

# Run PRO version
pnpm dev:pro
```

## File Structure

```
.
├── .env.example          # Template with placeholders (in git) ✅
├── .env.lite.example     # LITE template (in git) ✅
├── .env.pro.example      # PRO template (in git) ✅
├── .env                  # Your active config with real values (gitignored) 🔒
├── .env.lite             # Your LITE config with real values (gitignored) 🔒
└── .env.pro              # Your PRO config with real values (gitignored) 🔒
```

**Legend:**
- ✅ = Committed to git (safe, has placeholders)
- 🔒 = Gitignored (contains real credentials)

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev:lite` | Run entire stack in LITE mode (no copilot/referrals) |
| `pnpm dev:pro` | Run entire stack in PRO mode (all features) |
| `pnpm build:lite` | Build LITE version for production |
| `pnpm build:pro` | Build PRO version for production |

## Feature Flags

### LITE Version (Community Edition)
```bash
ENABLE_COPILOT=false
ENABLE_REFERRALS=false
VITE_ENABLE_COPILOT=false
VITE_ENABLE_REFERRALS=false
```

### PRO Version (Commercial Edition)
```bash
ENABLE_COPILOT=true
ENABLE_REFERRALS=true
VITE_ENABLE_COPILOT=true
VITE_ENABLE_REFERRALS=true
```

## Common Tasks

### Switch to LITE
```bash
pnpm dev:lite
```

### Switch to PRO
```bash
pnpm dev:pro
```

### Manual switch
```bash
cp .env.lite .env && pnpm dev
cp .env.pro .env && pnpm dev
```

### Update a credential
```bash
# Edit your active .env
vim .env

# Copy changes to LITE/PRO versions
cp .env .env.lite
cp .env .env.pro

# Re-adjust flags in LITE
sed -i '' 's/ENABLE_COPILOT=true/ENABLE_COPILOT=false/g' .env.lite
sed -i '' 's/ENABLE_REFERRALS=true/ENABLE_REFERRALS=false/g' .env.lite
sed -i '' 's/VITE_ENABLE_COPILOT=true/VITE_ENABLE_COPILOT=false/g' .env.lite
sed -i '' 's/VITE_ENABLE_REFERRALS=true/VITE_ENABLE_REFERRALS=false/g' .env.lite
```

## Documentation

- [Full Setup Guide](docs/ENVIRONMENT_SETUP.md) - Comprehensive documentation
- [Version Comparison](docs/VERSIONS.md) - LITE vs PRO feature comparison
- [Migration Guide](packages/agentic-ai/docs/MIGRATION.md) - Agentic AI package migration

## What NOT to Do

❌ **Never commit these files:**
- `.env`
- `.env.lite`
- `.env.pro`

✅ **Only commit template files:**
- `.env.example`
- `.env.lite.example`
- `.env.pro.example`

## Security

### Required Keys

| Variable | Purpose | Generation |
|----------|---------|------------|
| `JWT_SECRET` | Authentication tokens | `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |
| `DIRECTUS_KEY` | CMS security | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DIRECTUS_SECRET` | CMS security | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ENCRYPTION_KEY` | BYOK API key storage | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

### BYOK Encryption

The `ENCRYPTION_KEY` is **required** for the BYOK (Bring Your Own Keys) feature:
- Encrypts stored user API keys using AES-256-GCM
- Must be a 64-character hex string (32 bytes)
- If lost, users must re-enter their API keys
- Use different keys for dev/staging/production

### Recovery

If you accidentally commit `.env`:

```bash
# Remove from git
git rm --cached .env
git commit -m "Remove .env (contained secrets)"
git push

# IMMEDIATELY rotate all credentials
# - Stripe keys
# - OpenAI API keys
# - Database passwords
# - All other secrets
```
