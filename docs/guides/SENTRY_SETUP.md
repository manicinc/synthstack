# Sentry Error Tracking Setup

Comprehensive guide for integrating Sentry error tracking and performance monitoring into SynthStack.

> **For Self-Hosters & Purchasers**: The default `.env` files contain our development Sentry DSN. You **MUST** create your own Sentry project and replace the DSN with your own to receive error reports for your deployment. Errors sent to the default DSN will go to our dashboard, not yours.

## Overview

Sentry provides real-time error tracking, performance monitoring, and release health insights for both the frontend Vue.js application and the Fastify API Gateway.

## Prerequisites

- Sentry account (free tier available at [sentry.io](https://sentry.io))
- Access to SynthStack environment configuration

## For Deployments, Self-Hosting & Purchases

If you're deploying SynthStack to production, self-hosting, or purchased a license:

1. **Create your own Sentry account** at [sentry.io](https://sentry.io) (free tier available)
2. **Create your own projects** (Vue.js for frontend, Node.js for backend)
3. **Replace the DSN** in your environment files with your own DSN
4. **Update these files:**
   - `.env` (root)
   - `packages/api-gateway/.env`
   - `apps/web/.env`

This ensures error reports go to YOUR Sentry dashboard, not ours.

## Quick Setup (5 Minutes)

### Step 1: Create Sentry Projects

1. Sign up or log in at [sentry.io](https://sentry.io)
2. Create an organization (or use existing)
3. Create **two projects**:
   - **Frontend**: Platform → Vue.js
   - **Backend**: Platform → Node.js (Fastify)

### Step 2: Get Your DSN

For each project:
1. Go to **Settings** → **Projects** → Select project
2. Click **Client Keys (DSN)** under SDK Setup
3. Copy the DSN (format: `https://xxx@o123456.ingest.sentry.io/xxx`)

### Step 3: Configure Environment Variables

**Frontend (`apps/web/.env`):**
```bash
VITE_SENTRY_DSN=https://xxx@o123456.ingest.sentry.io/xxx
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
```

**Backend (`packages/api-gateway/.env`):**
```bash
SENTRY_DSN=https://xxx@o123456.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### Step 4: Add GitHub Secrets (For CI/CD)

```bash
gh secret set SENTRY_DSN_FRONTEND -b "https://xxx@o123456.ingest.sentry.io/xxx"
gh secret set SENTRY_DSN_BACKEND -b "https://xxx@o123456.ingest.sentry.io/xxx"
gh secret set SENTRY_AUTH_TOKEN -b "sntrys_xxx"  # For source maps
```

## What Gets Tracked

### Frontend (Vue.js)
- Unhandled JavaScript exceptions
- Promise rejections
- Vue component errors
- Network request failures (API calls)
- Performance metrics (LCP, FID, CLS)
- Navigation timing

### Backend (Fastify)
- Unhandled route exceptions
- Database query failures
- External API errors (OpenAI, Stripe, etc.)
- Request performance traces
- Background job failures

## Environment Configuration

| Variable | Frontend | Backend | Description |
|----------|----------|---------|-------------|
| `SENTRY_DSN` / `VITE_SENTRY_DSN` | Required | Required | Project identifier |
| `SENTRY_ENVIRONMENT` | Optional | Optional | `development`, `staging`, `production` |
| `SENTRY_TRACES_SAMPLE_RATE` | Optional | Optional | 0.0 to 1.0 (default: 0.1 = 10%) |
| `SENTRY_PROFILES_SAMPLE_RATE` | - | Optional | 0.0 to 1.0 (default: 0.1 = 10%) |

## Recommended Settings by Environment

### Development
```bash
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=1.0  # Capture all traces for debugging
```

### Staging
```bash
SENTRY_ENVIRONMENT=staging
SENTRY_TRACES_SAMPLE_RATE=0.5  # Capture 50% for testing
```

### Production
```bash
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1  # Capture 10% to manage costs
```

## Manual Error Capture

### Frontend (Vue.js)

```typescript
import { captureException, captureMessage, addBreadcrumb } from 'src/boot/sentry'

// Capture an exception with context
try {
  await riskyOperation()
} catch (error) {
  captureException(error as Error, {
    operation: 'riskyOperation',
    userId: user.id,
    additionalData: someData
  })
}

// Capture a warning message
captureMessage('User attempted deprecated action', 'warning')

// Add breadcrumb for debugging trail
addBreadcrumb({
  category: 'user-action',
  message: 'Clicked submit button',
  level: 'info'
})
```

### Backend (Node.js)

```typescript
import { captureException, captureMessage, addSentryBreadcrumb } from './services/sentry.js'

// Capture an exception
captureException(error, {
  service: 'copilot',
  userId: request.user?.id
})

// Capture a message
captureMessage('High API latency detected', 'warning')

// Add breadcrumb
addSentryBreadcrumb('API call started', 'api', { endpoint: '/generate' })
```

## User Context

User context is automatically set when users log in:

- **Frontend**: The auth store calls `setSentryUser()` after successful authentication
- **Backend**: The `sentryUserMiddleware` extracts user info from authenticated requests

User context includes:
- `id`: User ID
- `email`: User email
- `username`: Display name
- `subscription_tier`: Current plan (backend only)

## Filtering Sensitive Data

Sentry automatically filters common sensitive fields. Additional filtering is configured:

**Headers removed:**
- `Authorization`
- `Cookie`
- `x-api-key`

**Errors ignored:**
- Network timeouts (`ECONNRESET`, `EPIPE`, `ETIMEDOUT`)
- Rate limit errors (`RATE_LIMIT_EXCEEDED`)
- Browser extension errors
- ResizeObserver errors (benign)

## Alerting Setup

### Recommended Alerts

1. **High Error Rate**
   - Trigger: >10 errors per minute
   - Action: Slack/email notification

2. **New Issue**
   - Trigger: First occurrence of error type
   - Action: Create GitHub issue

3. **Performance Degradation**
   - Trigger: LCP > 4 seconds
   - Action: Team notification

## Cost Optimization

| Plan | Events/Month | Price | Recommended For |
|------|--------------|-------|-----------------|
| **Developer** | 5,000 | Free | Side projects |
| **Team** | 50,000 | $26/mo | Small teams |
| **Business** | 100,000+ | Custom | Production apps |

### Tips to Reduce Event Volume
- Use `SENTRY_TRACES_SAMPLE_RATE=0.1` in production
- Filter duplicate errors with fingerprinting
- Exclude development/test environments
- Use `ignoreErrors` for known non-actionable errors

## Troubleshooting

### Errors Not Appearing

1. Verify DSN is correct
2. Check environment variable is loaded
3. Ensure Sentry SDK is initialized early
4. Check browser console for Sentry errors

### Source Maps Not Working

1. Upload source maps during build:
   ```bash
   npx @sentry/cli releases files $RELEASE upload-sourcemaps ./dist
   ```
2. Verify `SENTRY_AUTH_TOKEN` is set
3. Check release version matches

### Performance Issues

1. Lower trace sample rate
2. Disable session replay if unused
3. Use `beforeSend` to filter verbose errors

## Verifying Installation

### Frontend
1. Open browser console
2. Look for: `[Sentry] Initialized successfully`
3. Trigger a test error: `throw new Error('Test Sentry')`
4. Check Sentry dashboard for the error

### Backend
1. Check server logs for: `[Sentry] Initialized successfully`
2. Call a test endpoint that throws an error
3. Check Sentry dashboard for the error

## Related Documentation

- [Deployment Quick Start](../DEPLOYMENT_QUICK_START.md)
- [Self-Hosting Guide](../SELF_HOSTING.md)
- [GitHub Secrets](../deployment/GITHUB_SECRETS.md)
- [Sentry Official Docs](https://docs.sentry.io/)
