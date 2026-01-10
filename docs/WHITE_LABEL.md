# White-Label Branding Guide

**⚠️ Commercial License Required**

White-labeling and removing SynthStack branding requires a [Commercial License](https://synthstack.app/pricing). This guide shows you how to customize branding once you have commercial rights.

**What you can do with Commercial License:**
- Remove all "Powered by SynthStack" attribution
- Use your own brand name, logo, and colors
- Deploy under your own domain
- Present as your own product

---

This guide explains how to customize SynthStack's branding (logos, colors, favicons, etc.) for your own product.

## Overview

SynthStack supports comprehensive white-labeling across:
- **Directus Admin** - CMS/admin panel branding
- **Frontend App** - Public-facing application
- **Favicons** - Browser tab icons
- **Logos** - Light and dark mode support
- **Colors** - Primary colors and theme

## Quick Start

### 1. Replace Logo Files

Replace the following files in `services/directus/public/`:

```bash
services/directus/public/
├── favicon.svg          # Browser favicon (32x32 recommended)
├── logo-mark.svg        # Small icon/mark (for compact displays)
├── logo-dark.svg        # Dark mode logo
└── logo.svg             # Light mode logo
```

**Requirements:**
- SVG format recommended (scales perfectly)
- PNG also supported
- Favicon: 32x32px or 64x64px
- Logos: Transparent background

### 2. Update Environment Variables

Edit your `.env` file:

```bash
# Brand Name & Colors
BRAND_NAME="Your Company"
BRAND_TAGLINE="Your tagline here"
BRAND_COLOR="#6366F1"  # Primary color (hex)

# Directus Branding
PROJECT_NAME="Your Company"
PROJECT_DESCRIPTOR="Your tagline"
PROJECT_COLOR="#6366F1"
DEFAULT_APPEARANCE="dark"  # or "light"
```

### 3. Rebuild & Restart

```bash
# Rebuild Directus with new branding
docker compose build directus

# Restart to apply changes
docker compose up -d directus
```

The branding sync script will automatically:
1. Upload your favicon, logos to Directus
2. Update Directus settings with file references
3. Apply your brand colors and name

## Automatic Branding Sync

### How It Works

On container startup, the script `/docker-entrypoint.d/99-sync-branding.sh` runs automatically:

1. **Waits** for Directus to be ready
2. **Uploads** favicon and logos to Directus files
3. **Updates** settings with file IDs
4. **Applies** brand name, colors, and tagline

### Manual Trigger

If you need to re-sync branding without restarting:

```bash
docker compose exec directus /docker-entrypoint.d/99-sync-branding.sh
```

## Frontend Branding

### Update Branding Config

Edit `apps/web/src/config/branding.ts`:

```typescript
export const branding = {
  name: 'Your Company',
  tagline: 'Your tagline',
  mark: '/logo/your-mark.svg',
  logo: '/logo/your-logo.svg',
  logoDark: '/logo/your-logo-dark.svg',
  primaryColor: '#6366F1',

  social: {
    github: 'https://github.com/yourcompany',
    twitter: 'https://twitter.com/yourcompany',
    discord: 'https://discord.gg/yourcompany'
  },

  links: {
    docs: 'https://docs.yourcompany.com',
    support: 'mailto:support@yourcompany.com'
  }
}
```

### Update Frontend Logos

Replace files in `apps/web/public/logo/`:

```bash
apps/web/public/
├── logo/
│   ├── your-mark.svg
│   ├── your-mark-dark.svg
│   ├── your-logo.svg
│   └── your-logo-dark.svg
├── favicon.svg
└── icons/
    └── icon-192x192.png  # PWA icon
```

## Advanced Customization

### Custom CSS

Add custom CSS to Directus via environment variable:

```bash
# In docker-compose.yml
CUSTOM_CSS: "
  :root {
    --primary: #6366F1;
    --project-color: #6366F1;
  }

  .v-app-bar {
    background: linear-gradient(135deg, #6366F1, #818CF8) !important;
  }
"
```

### Theme Overrides

For light/dark theme customization:

```bash
# Light theme overrides (JSON)
DEFAULT_THEME_LIGHT: '{"navigation":"#fff","background":"#f8f9fa"}'

# Dark theme overrides (JSON)
DEFAULT_THEME_DARK: '{"navigation":"#1a1a1a","background":"#0a0a0a"}'
```

### Dynamic Favicons (Light/Dark Mode)

Update `apps/web/index.html`:

```html
<link rel="icon" type="image/svg+xml" href="/your-favicon-light.svg" media="(prefers-color-scheme: light)" />
<link rel="icon" type="image/svg+xml" href="/your-favicon-dark.svg" media="(prefers-color-scheme: dark)" />
```

## Troubleshooting

### Favicon Not Showing

1. **Clear browser cache** - Hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)
2. **Check file uploaded**:
   ```bash
   docker compose exec directus ls -la /directus/public/
   ```
3. **Verify settings**:
   ```bash
   curl -s http://localhost:8099/server/info | grep favicon
   ```
4. **Re-run sync script**:
   ```bash
   docker compose exec directus /docker-entrypoint.d/99-sync-branding.sh
   ```

### Logo Not Updating

1. **Rebuild container**:
   ```bash
   docker compose build directus --no-cache
   docker compose up -d directus
   ```
2. **Check file permissions**:
   ```bash
   docker compose exec directus ls -la /directus/uploads/
   ```

### Colors Not Applied

1. **Check environment variables**:
   ```bash
   docker compose exec directus env | grep PROJECT_COLOR
   ```
2. **Verify in Directus UI**:
   - Go to Settings → Project Settings
   - Check "Project Color" field
3. **Force update**:
   ```bash
   docker compose down directus
   docker compose up -d directus
   ```

## White-Label Checklist

- [ ] Replace `favicon.svg`, `logo-mark.svg`, `logo.svg`, `logo-dark.svg`
- [ ] Update `BRAND_NAME`, `BRAND_TAGLINE`, `BRAND_COLOR` in `.env`
- [ ] Update `PROJECT_NAME`, `PROJECT_DESCRIPTOR`, `PROJECT_COLOR` in docker-compose
- [ ] Rebuild Directus: `docker compose build directus`
- [ ] Restart Directus: `docker compose up -d directus`
- [ ] Update `apps/web/src/config/branding.ts`
- [ ] Replace `apps/web/public/logo/` files
- [ ] Replace `apps/web/public/favicon.svg`
- [ ] Update `apps/web/index.html` meta tags (Open Graph, Twitter)
- [ ] Test in browser (clear cache first)

## Production Deployment

### Build-Time Branding

For production, inject branding at build time:

```bash
# Build args for Docker
docker build \
  --build-arg BRAND_NAME="Your Company" \
  --build-arg BRAND_COLOR="#6366F1" \
  -t your-company/directus:latest \
  services/directus
```

### CI/CD Integration

Add to your GitHub Actions / CI pipeline:

```yaml
- name: Copy custom branding
  run: |
    cp ./branding/logo.svg services/directus/public/
    cp ./branding/favicon.svg services/directus/public/

- name: Build with branding
  run: docker compose build directus
```

## Support

For issues or questions about white-labeling:
- Check the [troubleshooting section](#troubleshooting) above
- Review logs: `docker compose logs directus | grep branding`
- Verify file uploads in Directus admin: Content → File Library

---

**Pro Tip:** Keep your original branding files in a separate `branding/` folder for version control and easy switching between brands.
