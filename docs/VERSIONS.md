# SynthStack Versions: LITE vs PRO

SynthStack is available in two versions built from the same codebase using feature flags.

## Version Comparison

| Feature | LITE (Community) | PRO (Commercial) |
|---------|------------------|------------------|
| Project Management | ✅ | ✅ |
| Client Portal | ✅ | ✅ |
| Invoicing & Billing | ✅ | ✅ |
| Stripe Integration | ✅ | ✅ |
| Text + Image Generation (BYOK) | ✅ | ✅ |
| RAG / Doc Chat | ❌ | ✅ |
| Node-RED Workflows | ❌ | ✅ |
| i18n (Internationalization) | ✅ | ✅ |
| Analytics Dashboard | ✅ | ✅ |
| GDPR Compliance Tools | ✅ | ✅ |
| **AI Agents (LangGraph)** | ❌ | ✅ |
| **Referral System** | ❌ | ✅ |

## Configuration Files

The root directory contains three environment configuration files:

### `.env.example`
- **Purpose**: Template with placeholder values
- **Usage**: Copy to `.env` and fill in your credentials
- **Version**: PRO (copilot and referrals enabled by default)

### `.env.lite`
- **Purpose**: LITE (Community Edition) configuration
- **Features**: Core platform + basic chat/generation (no agents, no RAG, no referrals, no workflows)
- **Feature Flags**:
  ```bash
  ENABLE_COPILOT=true
  ENABLE_AI_AGENTS=false
  ENABLE_COPILOT_RAG=false
  ENABLE_REFERRALS=false
  VITE_ENABLE_COPILOT=true
  VITE_ENABLE_AI_AGENTS=false
  VITE_ENABLE_COPILOT_RAG=false
  VITE_ENABLE_REFERRALS=false
  ```

### `.env.pro`
- **Purpose**: PRO (Commercial Edition) configuration
- **Features**: ALL features including AI Copilot, Referrals, and Workflows
- **Feature Flags**:
  ```bash
  ENABLE_COPILOT=true
  ENABLE_AI_AGENTS=true
  ENABLE_COPILOT_RAG=true
  ENABLE_REFERRALS=true
  VITE_ENABLE_COPILOT=true
  VITE_ENABLE_AI_AGENTS=true
  VITE_ENABLE_COPILOT_RAG=true
  VITE_ENABLE_REFERRALS=true
  ```

## Quick Start

### Running LITE Version

**Option 1: Using root scripts (recommended)**
```bash
# Development
pnpm dev:lite

# Build
pnpm build:lite
```

**Option 2: Manual setup**
```bash
# Copy LITE config
cp .env.lite .env

# Run services
pnpm dev
```

### Running PRO Version

**Option 1: Using root scripts (recommended)**
```bash
# Development
pnpm dev:pro

# Build
pnpm build:pro
```

**Option 2: Manual setup**
```bash
# Copy PRO config
cp .env.pro .env

# Run services
pnpm dev
```

## Package-Level Configuration

Each package also has its own `.env`, `.env.lite`, and `.env.pro` files:

### Backend (api-gateway)
- **Location**: `packages/api-gateway/.env*`
- **Feature Flags**:
  - `ENABLE_COPILOT` - Enable/disable basic AI surfaces (chat/generation)
  - `ENABLE_AI_AGENTS` - Enable/disable agentic AI (LangGraph + agents)
  - `ENABLE_COPILOT_RAG` - Enable/disable RAG mode for Copilot
  - `ENABLE_REFERRALS` - Enable/disable referral & rewards system

### Frontend (web)
- **Location**: `apps/web/.env*`
- **Feature Flags**:
  - `VITE_ENABLE_COPILOT` - Show/hide basic AI UI components
  - `VITE_ENABLE_AI_AGENTS` - Show/hide agentic AI UI (Copilot Hub)
  - `VITE_ENABLE_COPILOT_RAG` - Show/hide RAG toggles/controls
  - `VITE_ENABLE_REFERRALS` - Show/hide referral UI components

## How It Works

### Backend (Fastify)

The api-gateway uses a conditional features plugin that:
1. Reads `ENABLE_COPILOT`, `ENABLE_AI_AGENTS`, `ENABLE_COPILOT_RAG`, and `ENABLE_REFERRALS` from environment
2. Conditionally loads services and routes based on flags
3. Logs which features are enabled/disabled on startup

```typescript
// packages/api-gateway/src/plugins/conditional-features.ts
if (process.env.ENABLE_AI_AGENTS === 'true') {
  await fastify.register(langGraphService); // agentic AI
  await fastify.register(copilotRoutes);    // agents + copilot hub APIs
}

if (process.env.ENABLE_REFERRALS === 'true') {
  await fastify.register(referralService);
  await fastify.register(referralRoutes);
}
```

### Frontend (Vue.js)

The web app uses feature flags to conditionally render components:

```typescript
// apps/web/src/config/features.ts
export const FEATURES = {
  COPILOT: process.env.ENABLE_COPILOT === 'true',
  COPILOT_RAG: process.env.ENABLE_COPILOT_RAG === 'true',
  AI_AGENTS: process.env.ENABLE_AI_AGENTS === 'true',
  REFERRALS: process.env.ENABLE_REFERRALS === 'true',
};
```

```vue
<!-- apps/web/src/layouts/AppLayout.vue -->
<CopilotWidget v-if="FEATURES.AI_AGENTS && authStore.isAuthenticated" />
```

## Switching Between Versions

### During Development

Simply copy the desired environment file and restart the dev servers:

```bash
# Switch to LITE
cp .env.lite .env
pnpm dev

# Switch to PRO
cp .env.pro .env
pnpm dev
```

### For Production Builds

Use the build scripts:

```bash
# Build LITE version
pnpm build:lite

# Build PRO version
pnpm build:pro
```

## Creating Custom Configurations

You can create custom configurations by copying `.env.example` and adjusting the feature flags:

```bash
# Copy example
cp .env.example .env.custom

# Edit feature flags
# ENABLE_COPILOT=true         # Enable basic AI surfaces
# ENABLE_AI_AGENTS=false      # Disable agentic AI
# ENABLE_COPILOT_RAG=false    # Disable RAG mode
# ENABLE_REFERRALS=false      # Disable referrals

# Run with custom config
cp .env.custom .env
pnpm dev
```

## Docker Compose

When using Docker, the root `.env` file is automatically loaded by Docker Compose. To run different versions:

### LITE Version
```bash
cp .env.lite .env
docker compose up
```

### PRO Version
```bash
cp .env.pro .env
docker compose up
```

## CI/CD Considerations

### Version Testing Workflow

The repository includes a comprehensive CI workflow that tests both versions:

**File:** `.github/workflows/test-versions.yml`

This workflow:
- Runs unit, integration, and E2E tests for both LITE and PRO versions
- Builds both versions and verifies bundle contents
- Compares build sizes between versions
- E2E tests run only on Chromium (`--project=chromium`) to reduce CI runtime

```bash
# Test commands used in CI:

# LITE version
ENABLE_COPILOT=true ENABLE_AI_AGENTS=false ENABLE_COPILOT_RAG=false ENABLE_REFERRALS=false pnpm test
VITE_ENABLE_COPILOT=true VITE_ENABLE_AI_AGENTS=false VITE_ENABLE_COPILOT_RAG=false VITE_ENABLE_REFERRALS=false pnpm test:e2e --project=chromium

# PRO version
ENABLE_COPILOT=true ENABLE_AI_AGENTS=true ENABLE_COPILOT_RAG=true ENABLE_REFERRALS=true pnpm test
VITE_ENABLE_COPILOT=true VITE_ENABLE_AI_AGENTS=true VITE_ENABLE_COPILOT_RAG=true VITE_ENABLE_REFERRALS=true pnpm test:e2e --project=chromium
```

### Build Workflow Example

```yaml
# .github/workflows/build-lite.yml
name: Build LITE Version

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build LITE version
        run: pnpm build:lite
```

### Environment Variables in Production

For production deployments, set feature flags as environment variables instead of using `.env` files:

```bash
# Kubernetes ConfigMap / Docker environment
ENABLE_COPILOT=true
ENABLE_AI_AGENTS=false
ENABLE_COPILOT_RAG=false
ENABLE_REFERRALS=false
VITE_ENABLE_COPILOT=true
VITE_ENABLE_AI_AGENTS=false
VITE_ENABLE_COPILOT_RAG=false
VITE_ENABLE_REFERRALS=false
```

## Troubleshooting

### Feature Not Loading

1. **Check environment file**: Ensure you copied the correct `.env.lite` or `.env.pro`
2. **Restart dev servers**: Changes to `.env` require restart
3. **Check logs**: Look for feature initialization messages:
   ```
   ✅ AI Agents (LangGraph): ENABLED
   ⚠️  AI Agents disabled
   ```

### Routes Return 404

If copilot or referral routes return 404, it means:
- The feature is disabled in the backend
- The routes were not registered
- Check `ENABLE_AI_AGENTS` and `ENABLE_REFERRALS` in `packages/api-gateway/.env`

### Components Not Rendering

If UI components don't appear:
- Feature is disabled in the frontend
- Check `VITE_ENABLE_AI_AGENTS` / `VITE_ENABLE_COPILOT_RAG` / `VITE_ENABLE_REFERRALS` in `apps/web/.env`
- Rebuild the frontend: `pnpm --filter @synthstack/web build`

## License Implications

### LITE (Community Edition)
- Community License (modified MIT, non-commercial)
- Free for learning, personal projects, and evaluation
- Basic chat + generation included
- No agentic AI, RAG, workflows, or referrals
- Source available under the Community License terms

### PRO (Commercial Edition)
- Commercial License required
- Includes all features
- Proprietary AI Copilot and Referral system
- Support and updates

See [LICENSE](../LICENSE) and [COMMERCIAL-LICENSE.md](../COMMERCIAL-LICENSE.md) for full terms.

## Support

- **LITE Version**: Community support via GitHub Issues
- **PRO Version**: Priority support for commercial license holders
- **Documentation**: See [docs/](../docs/) directory
- **Website**: https://synthstack.app
