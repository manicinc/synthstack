# Complete Rebranding Guide

This guide walks you through rebranding SynthStack for your own SaaS product. Whether you're building a client project or launching your own startup, follow these steps to make it fully yours.

## Table of Contents

1. [Quick Start (5 minutes)](#quick-start)
2. [Detailed Configuration](#detailed-configuration)
3. [Logo & Asset Replacement](#logo--asset-replacement)
4. [Domain & Infrastructure](#domain--infrastructure)
5. [Email Configuration](#email-configuration)
6. [Mobile Apps](#mobile-apps)
7. [SEO & Meta Tags](#seo--meta-tags)
8. [Deployment](#deployment)

---

## Quick Start

You can also use the in-app setup wizards:

- Branding Wizard: `/setup/branding`
- Environment Setup Wizard: `/setup/env`

For a basic rebrand, you only need to update **2 files**:

### Step 1: Edit `config.json`

Open the root `config.json` and update:

```json
{
  "app": {
    "name": "YourAppName",
    "tagline": "Your Tagline Here",
    "description": "Your SEO description",
    "domain": "yourapp.com"
  },
  "company": {
    "name": "Your Company",
    "legalName": "Your Company, Inc."
  },
  "contact": {
    "support": "support@yourapp.com",
    "sales": "sales@yourapp.com",
    "general": "hello@yourapp.com"
  },
  "social": {
    "github": "https://github.com/yourcompany",
    "twitter": "https://twitter.com/yourapp",
    "discord": "https://discord.gg/yourapp"
  }
}
```

### Step 2: Replace Logo Files

Replace these files in `apps/web/public/`:

```
apps/web/public/
├── logo/
│   ├── your-logo.svg          → rename to match config.json paths
│   ├── your-logo-dark.svg
│   ├── your-mark.svg
│   └── your-mark-dark.svg
├── favicon.svg
├── favicon-dark.svg
└── icons/
    └── icon-192x192.png       → PWA icon (192x192 PNG)
```

### Step 3: Rebuild & Test

```bash
# Rebuild with new branding
pnpm install
pnpm build

# Test locally
pnpm dev:web
```

That's it for a basic rebrand! Continue reading for advanced customization.

---

## Detailed Configuration

### config.json Reference

The `config.json` file is the single source of truth for all branding. Here's a complete reference:

```json
{
  "app": {
    "name": "string",           // App name shown in UI
    "tagline": "string",        // Hero section tagline
    "description": "string",    // Meta description (SEO)
    "fullDescription": "string",// About page description
    "domain": "string",         // Production domain
    "version": "string"         // App version
  },
  "branding": {
    "logo": {
      "light": "/logo/logo.svg",      // Logo for light backgrounds
      "dark": "/logo/logo-dark.svg",  // Logo for dark backgrounds
      "mark": "/logo/mark.svg",       // Icon/mark for compact displays
      "markDark": "/logo/mark-dark.svg"
    },
    "favicon": {
      "default": "/favicon.svg",
      "dark": "/favicon-dark.svg",
      "apple": "/icons/icon-192x192.png"
    },
    "colors": {
      "primary": "#6366F1",     // Primary brand color (buttons, links)
      "accent": "#00D4AA",      // Accent color (highlights)
      "theme": "#6366F1",       // Browser chrome color
      "background": "#0D0D0D"   // Dark mode background
    },
    "og": {
      "image": "/og-image.svg", // Social sharing image
      "type": "website"
    }
  },
  "company": {
    "name": "string",
    "legalName": "string",      // For legal pages
    "founded": "2024",
    "location": null            // Optional
  },
  "contact": {
    "support": "email",
    "sales": "email",
    "general": "email",
    "noreply": "email"
  },
  "social": {
    "github": "url or null",
    "twitter": "url or null",
    "discord": "url or null",
    "linkedin": "url or null",
    "youtube": "url or null"
  },
  "links": {
    "docs": "/docs",
    "changelog": "/changelog",
    "roadmap": "/roadmap",
    "status": null
  },
  "legal": {
    "privacy": "/privacy",
    "terms": "/terms",
    "cookies": "/cookies",
    "security": "/security",
    "gdpr": "/gdpr"
  },
  "demo": {
    "enabled": true,
    "email": "demo@yourapp.com",
    "password": "DemoPassword123!"
  },
  "infrastructure": {
    "containerPrefix": "yourapp",      // Docker container prefix
    "networkName": "yourapp-network",  // Docker network name
    "databaseName": "yourapp",         // PostgreSQL database
    "subdomains": {
      "api": "api",      // api.yourapp.com
      "admin": "admin",  // admin.yourapp.com
      "traefik": "traefik"
    },
    "ports": {
      "web": 3050,
      "api": 3003,
      "directus": 8099,
      "postgres": 5499,
      "redis": 6399,
      "qdrant": 6333,
      "mlService": 8001
    }
  },
  "github": {
    "orgName": "yourcompany",
    "proRepoName": "yourapp-pro",
    "communityRepoName": "yourapp",
    "teamSlug": "yourapp-team"
  },
  "features": {
    "copilot": true,       // AI Copilot feature
    "referrals": false,    // Referral system (Pro only)
    "analytics": true,     // Google Analytics / Clarity
    "i18n": true           // Multi-language support
  }
}
```

### Environment Variable Overrides

You can override any config.json value with environment variables. This is useful for:
- Different values per environment (dev/staging/prod)
- Secrets that shouldn't be in version control
- CI/CD deployments

| Environment Variable | Overrides |
|---------------------|-----------|
| `VITE_APP_NAME` | `app.name` |
| `VITE_APP_TAGLINE` | `app.tagline` |
| `VITE_APP_DOMAIN` | `app.domain` |
| `VITE_CONTACT_EMAIL` | `contact.general` |
| `VITE_SUPPORT_EMAIL` | `contact.support` |
| `VITE_ENABLE_COPILOT` | `features.copilot` |
| `VITE_ENABLE_REFERRALS` | `features.referrals` |
| `CONTAINER_PREFIX` | `infrastructure.containerPrefix` |
| `NETWORK_NAME` | `infrastructure.networkName` |

---

## Logo & Asset Replacement

### Required Files

| File | Size | Purpose |
|------|------|---------|
| `logo/logo.svg` | ~200×50px | Full logo for light backgrounds |
| `logo/logo-dark.svg` | ~200×50px | Full logo for dark backgrounds |
| `logo/mark.svg` | 40×40px | Square icon for light backgrounds |
| `logo/mark-dark.svg` | 40×40px | Square icon for dark backgrounds |
| `favicon.svg` | 32×32px | Browser tab icon (light mode) |
| `favicon-dark.svg` | 32×32px | Browser tab icon (dark mode) |
| `icons/icon-192x192.png` | 192×192px | PWA / mobile home screen icon |
| `og-image.svg` or `.png` | 1200×630px | Social sharing preview |

### Design Guidelines

1. **SVG Format Recommended**: Scales perfectly, smaller file size
2. **Transparent Background**: Essential for theme compatibility
3. **Test Both Themes**: Check visibility on light AND dark backgrounds
4. **Simple Icons**: Mark should be recognizable at 16×16px

### Open Graph Image

The `og-image` appears when sharing on social media:

```
┌────────────────────────────────┐
│                                │
│     YourApp                    │
│     Your Tagline               │
│                                │
│     [Logo]                     │
│                                │
└────────────────────────────────┘
1200×630 pixels
```

---

## Domain & Infrastructure

### DNS Configuration

For production deployment with custom domain:

| Record Type | Name | Value |
|-------------|------|-------|
| A | `@` | `your-server-ip` |
| A | `www` | `your-server-ip` |
| A | `api` | `your-server-ip` |
| A | `admin` | `your-server-ip` |

### Docker Compose Configuration

Update `docker-compose.yml` with your naming:

```yaml
services:
  web:
    container_name: ${CONTAINER_PREFIX:-yourapp}-web
    # ...
    
  api:
    container_name: ${CONTAINER_PREFIX:-yourapp}-api
    # ...
```

### Traefik Domain Routing

Update `deploy/docker-compose.yml` labels:

```yaml
api:
  labels:
    - "traefik.http.routers.api.rule=Host(`api.${APP_DOMAIN}`)"
    - "traefik.http.routers.api.entrypoints=websecure"
    - "traefik.http.routers.api.tls.certresolver=letsencrypt"
```

Then deploy with:

```bash
APP_DOMAIN=yourapp.com docker compose -f deploy/docker-compose.yml up -d
```

---

## Email Configuration

### 1. Resend Setup

1. Sign up at [resend.com](https://resend.com)
2. Add your domain and verify DNS
3. Create an API key
4. Update `.env`:

```bash
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=noreply@yourapp.com
RESEND_FROM_NAME=YourApp
```

### 2. Email Templates

Email templates use branding from config.json. Check:

- `packages/api-gateway/src/services/email/templates/`

Update any hardcoded references to match your brand.

---

## Mobile Apps

### iOS (Capacitor)

Update `apps/web/capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'com.yourcompany.yourapp',
  appName: 'YourApp',
  // ...
}
```

Update `apps/web/ios/App/App/Info.plist`:

```xml
<key>CFBundleDisplayName</key>
<string>YourApp</string>
<key>CFBundleIdentifier</key>
<string>com.yourcompany.yourapp</string>
```

### Android (Capacitor)

Update `apps/web/android/app/build.gradle`:

```groovy
android {
    namespace "com.yourcompany.yourapp"
    defaultConfig {
        applicationId "com.yourcompany.yourapp"
        // ...
    }
}
```

Update `apps/web/android/app/src/main/res/values/strings.xml`:

```xml
<resources>
    <string name="app_name">YourApp</string>
    <string name="title_activity_main">YourApp</string>
    <!-- ... -->
</resources>
```

---

## SEO & Meta Tags

### index.html

Update `apps/web/index.html`:

```html
<head>
  <title>YourApp - Your Tagline</title>
  <meta name="description" content="Your SEO description" />
  
  <!-- Open Graph -->
  <meta property="og:title" content="YourApp" />
  <meta property="og:description" content="Your SEO description" />
  <meta property="og:image" content="https://yourapp.com/og-image.png" />
  <meta property="og:url" content="https://yourapp.com" />
  <meta property="og:site_name" content="YourApp" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@yourapp" />
  <meta name="twitter:title" content="YourApp" />
  <meta name="twitter:description" content="Your SEO description" />
  <meta name="twitter:image" content="https://yourapp.com/og-image.png" />
  
  <!-- Theme Color -->
  <meta name="theme-color" content="#6366F1" />
</head>
```

### PWA Manifest

Update `apps/web/public/manifest.json`:

```json
{
  "name": "YourApp",
  "short_name": "YourApp",
  "description": "Your SEO description",
  "theme_color": "#6366F1",
  "background_color": "#0D0D0D",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## Deployment

### Production Checklist

Before going live:

- [ ] Update `config.json` with production values
- [ ] Set `APP_DOMAIN` environment variable
- [ ] Replace all logo and favicon files
- [ ] Update `index.html` meta tags
- [ ] Update `manifest.json` for PWA
- [ ] Configure DNS records
- [ ] Set up SSL (automatic with Traefik + Let's Encrypt)
- [ ] Test all branding on live site
- [ ] Test social sharing (Facebook, Twitter, LinkedIn)
- [ ] Test PWA install on mobile

### Deploy Command

```bash
# Set your domain
export APP_DOMAIN=yourapp.com

# Build with branding
pnpm build

# Deploy with Docker Compose
docker compose -f deploy/docker-compose.yml up -d
```

### Verify Deployment

```bash
# Check SSL
curl -I https://yourapp.com

# Check API
curl https://api.yourapp.com/health

# Check Admin
curl https://admin.yourapp.com
```

---

## Troubleshooting

### Logo not updating

1. Clear browser cache (Cmd+Shift+R / Ctrl+Shift+F5)
2. Rebuild the app: `pnpm build`
3. Check file paths match config.json

### Favicon not showing

1. Verify file exists at correct path
2. Check index.html references match
3. Clear browser cache completely
4. Try incognito/private window

### Colors not applying

1. Check `config.json` colors are valid hex
2. Verify no CSS overrides in custom styles
3. Clear Vite cache: `rm -rf node_modules/.vite`

### Docker containers have old names

1. Stop all containers: `docker compose down`
2. Update `CONTAINER_PREFIX` in `.env`
3. Start fresh: `docker compose up -d`

---

## Support

- [GitHub Issues](https://github.com/manicinc/synthstack/issues)
- [Discord Community](https://discord.gg/synthstack)
- [Documentation](/docs)

---

**Happy Rebranding!** 🎨

If you build something cool, let us know - we'd love to feature it.
