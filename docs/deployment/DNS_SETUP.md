# SynthStack DNS & Domain Configuration

Complete guide for setting up DNS records and custom domains for SynthStack deployment.

## Quick Reference: Required DNS Records

| Subdomain | Type | Target | Proxy | Purpose |
|-----------|------|--------|-------|---------|
| `@` (root) | A | `YOUR_VPS_IP` | ✅ Proxied | Main web app |
| `www` | CNAME | `yourdomain.app` | ✅ Proxied | www redirect |
| `api` | A | `YOUR_VPS_IP` | ✅ Proxied | API Gateway |
| `admin` | A | `YOUR_VPS_IP` | ✅ Proxied | Directus CMS |
| `auth` | CNAME | `*.supabase.co` | ❌ DNS only | Supabase Auth |
| `docs` | CNAME | `username.github.io` | ✅ Proxied | API Documentation |

---

## Setting Up Each Subdomain

### 1. Main App (`yourdomain.app`)

```
Type:    A
Name:    @ (or yourdomain.app)
Content: YOUR_VPS_IP
Proxy:   Proxied (orange cloud)
TTL:     Auto
```

### 2. WWW Redirect (`www.yourdomain.app`)

```
Type:    CNAME
Name:    www
Content: yourdomain.app
Proxy:   Proxied (orange cloud)
TTL:     Auto
```

### 3. API Gateway (`api.yourdomain.app`)

```
Type:    A
Name:    api
Content: YOUR_VPS_IP
Proxy:   Proxied (orange cloud)
TTL:     Auto
```

Update in `.env`:
```env
# Backend
FRONTEND_URL=https://yourdomain.app

# Frontend (VITE_* vars in root .env)
VITE_API_URL=https://api.yourdomain.app
```

### 4. Admin Panel (`admin.yourdomain.app`)

```
Type:    A
Name:    admin
Content: YOUR_VPS_IP
Proxy:   Proxied (orange cloud)
TTL:     Auto
```

Update in `deploy/docker-compose.yml` under `directus`:
```yaml
environment:
  - PUBLIC_URL=https://admin.yourdomain.app
```

### 5. Supabase Auth (`auth.yourdomain.app`)

> **Required if using Supabase authentication**

```
Type:    CNAME
Name:    auth
Content: YOUR_SUPABASE_PROJECT.supabase.co
Proxy:   DNS only (grey cloud) ⚠️ IMPORTANT
TTL:     Auto
```

Also add the ACME challenge TXT record from Supabase dashboard:
```
Type:    TXT
Name:    _acme-challenge.auth
Content: "YOUR_ACME_CHALLENGE_TOKEN"
Proxy:   DNS only
TTL:     Auto
```

Update Supabase dashboard:
1. Go to Project Settings → Custom Domains
2. Add `auth.yourdomain.app`
3. Verify the CNAME and ACME challenge records

### 6. Documentation Site (`docs.yourdomain.app`)

This hosts a landing page that redirects to the main docs (`yourdomain.app/docs`) 
and provides API reference at `/api`.

```
Type:    CNAME
Name:    docs
Content: YOUR_GITHUB_USERNAME.github.io
Proxy:   Proxied (orange cloud)
TTL:     Auto
```

**URL Structure:**
- `docs.yourdomain.app` → Redirects to `yourdomain.app/docs` (main documentation)
- `docs.yourdomain.app/api` → API Reference (OpenAPI/ReDoc)

**GitHub Pages Setup:**
1. Go to GitHub repo → Settings → Pages
2. Under "Custom domain", enter `docs.yourdomain.app`
3. Check "Enforce HTTPS"
4. The site is auto-deployed by CI after production deploys

#### Redirect Configuration

The redirect from `docs.yourdomain.app` to `yourdomain.app/docs` works **two ways**:

**1. Client-Side Redirect (Works Out of Box)**

The `docs-site/index.html` landing page includes:
- HTML meta refresh for instant redirect
- JavaScript fallback redirect
- Manual links if redirects are blocked

To customize the redirect target, edit `docs-site/index.html`:
```html
<!-- Line 11: Change the redirect URL -->
<meta http-equiv="refresh" content="0; url=https://YOUR_DOMAIN/docs">

<!-- Line 132: Update the manual link -->
<a href="https://YOUR_DOMAIN/docs" class="primary-link">
```

**2. Cloudflare Page Rule (Optional - Faster)**

For optimal performance (301 at edge, no page load):

1. Go to Cloudflare → Rules → Page Rules
2. Create Page Rule:
   - **URL:** `docs.yourdomain.app/`
   - **Setting:** Forwarding URL (301)
   - **Destination:** `https://yourdomain.app/docs`
3. Save and Deploy

> **Note:** Both methods can coexist. The Page Rule takes precedence; 
> client-side redirect serves as a fallback.

#### Customizing for Your Domain

Update `docs-site/CNAME` with your domain:
```
docs.yourdomain.app
```

---

## Environment Variables to Update

### Root `.env`

```env
# Domain Configuration
FRONTEND_URL=https://yourdomain.app
DIRECTUS_PUBLIC_URL=https://admin.yourdomain.app
SUPABASE_URL=https://auth.yourdomain.app  # If using custom Supabase domain
```

### Frontend (VITE_* vars in root `.env`)

```env
VITE_API_URL=https://api.yourdomain.app
VITE_SUPABASE_URL=https://auth.yourdomain.app  # If using custom Supabase domain
VITE_DOCS_URL=https://docs.yourdomain.app
```

### Traefik Configuration

Update `deploy/traefik/dynamic/routes.yml` with your domains:

```yaml
http:
  routers:
    web:
      rule: "Host(`yourdomain.app`) || Host(`www.yourdomain.app`)"
    api:
      rule: "Host(`api.yourdomain.app`)"
    admin:
      rule: "Host(`admin.yourdomain.app`)"
```

---

## SSL/TLS Settings (Cloudflare)

Recommended settings in Cloudflare → SSL/TLS:

| Setting | Value |
|---------|-------|
| SSL/TLS encryption mode | **Full (strict)** |
| Always Use HTTPS | ✅ On |
| Automatic HTTPS Rewrites | ✅ On |
| Minimum TLS Version | TLS 1.2 |

---

## Verification Checklist

After DNS propagation (usually 5-10 minutes with Cloudflare):

- [ ] `https://yourdomain.app` loads the main app
- [ ] `https://www.yourdomain.app` redirects to root
- [ ] `https://api.yourdomain.app/health` returns `{"status":"ok"}`
- [ ] `https://admin.yourdomain.app` loads Directus login
- [ ] `https://auth.yourdomain.app` (if configured) shows Supabase
- [ ] `https://docs.yourdomain.app` shows API documentation

---

## Troubleshooting

### ERR_TOO_MANY_REDIRECTS
- Set Cloudflare SSL mode to "Full (strict)" not "Flexible"

### 502 Bad Gateway
- Check if Docker containers are running: `docker ps`
- Check Traefik logs: `docker logs synthstack-traefik`

### DNS Not Propagating
- Use [dnschecker.org](https://dnschecker.org) to verify propagation
- Cloudflare changes are usually instant; non-Cloudflare can take 24-48h

### Supabase Auth Not Working
- Ensure `auth` CNAME is **DNS only** (grey cloud), NOT proxied
- Verify ACME challenge TXT record matches Supabase dashboard
