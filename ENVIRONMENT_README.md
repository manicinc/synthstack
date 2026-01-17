# Environment Configuration - Quick Reference

## TL;DR

```bash
# First time setup - Generate .env from config.json (recommended)
pnpm generate:env --edition lite   # Community edition
pnpm generate:env --edition pro    # PRO edition

# Or create profiles manually from templates
cp .env.lite.example .env.lite
cp .env.pro.example .env.pro

# Fill in your real credentials (API keys, Supabase, etc.)

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
| `pnpm generate:env --edition lite` | Generate .env for Community edition from config.json |
| `pnpm generate:env --edition pro` | Generate .env for PRO edition from config.json |
| `pnpm dev:lite` | Run entire stack in LITE mode (basic copilot; no agents/RAG/referrals) |
| `pnpm dev:pro` | Run entire stack in PRO mode (all features) |
| `pnpm build:lite` | Build LITE version for production |
| `pnpm build:pro` | Build PRO version for production |

## Feature Flags

### LITE Version (Community Edition)
```bash
ENABLE_COPILOT=true
ENABLE_COPILOT_RAG=false
ENABLE_AI_AGENTS=false
ENABLE_REFERRALS=false
VITE_ENABLE_COPILOT=true
VITE_ENABLE_COPILOT_RAG=false
VITE_ENABLE_AI_AGENTS=false
VITE_ENABLE_REFERRALS=false
```

### PRO Version (Commercial Edition)
```bash
ENABLE_COPILOT=true
ENABLE_COPILOT_RAG=true
ENABLE_AI_AGENTS=true
ENABLE_REFERRALS=true
VITE_ENABLE_COPILOT=true
VITE_ENABLE_COPILOT_RAG=true
VITE_ENABLE_AI_AGENTS=true
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
# Preferred: update the profile you actually run
vim .env.lite
vim .env.pro

# Then run the matching mode
pnpm dev:lite
pnpm dev:pro
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

The `pnpm generate:env` script automatically generates all required security keys. If you need to generate them manually:

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
