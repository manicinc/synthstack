# Cloudflare Integration Guide

Complete guide for using Cloudflare with SynthStack - DNS, SSL, CDN, R2 storage, and security.

---

## Overview

SynthStack works with Cloudflare in several ways:

| Feature | Purpose | Required? |
|---------|---------|-----------|
| **DNS** | Point domain to your server | Recommended |
| **Proxy (CDN)** | Cache static assets, DDoS protection | Optional |
| **SSL/TLS** | Encryption between users and server | Automatic via Traefik |
| **R2 Storage** | File uploads and media storage | Optional |
| **Tunnel** | Expose server without public IP | Optional |

---

## Quick Start

### 1. Add Domain to Cloudflare

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com)
2. Click **Add a Site** → Enter your domain
3. Select plan (Free works fine)
4. Update nameservers at your registrar to Cloudflare's

### 2. Configure DNS Records

Add these A records pointing to your server IP:

| Type | Name | Content | Proxy Status | TTL |
|------|------|---------|--------------|-----|
| A | `@` | `YOUR_SERVER_IP` | Proxied (orange) | Auto |
| A | `www` | `YOUR_SERVER_IP` | Proxied (orange) | Auto |
| A | `api` | `YOUR_SERVER_IP` | **DNS only (gray)** | Auto |
| A | `admin` | `YOUR_SERVER_IP` | **DNS only (gray)** | Auto |

**Important:**
- **Proxied (orange cloud)**: Traffic goes through Cloudflare CDN
- **DNS only (gray cloud)**: Traffic goes directly to your server

**Why gray cloud for API/Admin?**
- WebSocket connections work better without proxy
- Let's Encrypt HTTP challenge works reliably
- Avoid double SSL termination complexity

### 3. Configure SSL/TLS Mode

Go to **SSL/TLS** → **Overview** → Select mode:

| Mode | When to Use |
|------|-------------|
| **Full (Strict)** | Recommended - Traefik has valid Let's Encrypt cert |
| **Full** | If using self-signed certs on origin |
| **Flexible** | NOT recommended - insecure between CF and origin |

**Use Full (Strict)** - SynthStack's Traefik automatically gets Let's Encrypt certificates.

---

## SSL/TLS Configuration

### How HTTPS Works with Cloudflare + Traefik

```
User → Cloudflare (SSL) → Your Server (Traefik SSL) → Docker containers
```

**Two SSL connections:**
1. User ↔ Cloudflare: Cloudflare's certificate
2. Cloudflare ↔ Traefik: Let's Encrypt certificate

### Recommended Settings

**SSL/TLS → Overview:**
- Mode: **Full (strict)**

**SSL/TLS → Edge Certificates:**
- Always Use HTTPS: **On**
- Automatic HTTPS Rewrites: **On**
- Minimum TLS Version: **TLS 1.2**

**SSL/TLS → Origin Server:**
- Authenticated Origin Pulls: **Off** (unless using mTLS)

### Troubleshooting SSL Issues

**Problem: ERR_TOO_MANY_REDIRECTS**
- Cause: SSL mode set to "Flexible" but Traefik forces HTTPS
- Fix: Change SSL mode to "Full" or "Full (strict)"

**Problem: 526 Invalid SSL Certificate**
- Cause: SSL mode is "Full (strict)" but origin has no valid cert
- Fix: Wait for Traefik to obtain Let's Encrypt cert (check `docker logs synthstack-traefik`)

**Problem: Let's Encrypt not issuing certs**
- Cause: Cloudflare proxy blocking HTTP-01 challenge
- Fix: Temporarily disable proxy (gray cloud) for root domain, or use DNS-01 challenge

---

## CDN & Caching

### Enable Caching for Static Assets

Go to **Caching** → **Configuration**:

- Caching Level: **Standard**
- Browser Cache TTL: **4 hours** (or respect existing headers)

### Cache Rules (Recommended)

Go to **Rules** → **Cache Rules** → Create rule:

**Rule 1: Cache static assets aggressively**
```
When: URI Path contains /assets/ OR ends with .js .css .png .jpg .svg .woff2
Then: Cache eligibility = Eligible for cache
      Edge TTL = 1 month
      Browser TTL = 1 week
```

**Rule 2: Bypass cache for API**
```
When: Hostname equals api.synthstack.app
Then: Cache eligibility = Bypass cache
```

**Rule 3: Bypass cache for admin**
```
When: Hostname equals admin.synthstack.app
Then: Cache eligibility = Bypass cache
```

### Purge Cache After Deployment

Add to your CI/CD workflow:

```yaml
- name: Purge Cloudflare Cache
  run: |
    curl -X POST "https://api.cloudflare.com/client/v4/zones/${{ secrets.CLOUDFLARE_ZONE_ID }}/purge_cache" \
      -H "Authorization: Bearer ${{ secrets.CLOUDFLARE_API_TOKEN }}" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}'
```

---

## R2 Storage Setup

Cloudflare R2 is S3-compatible object storage with no egress fees.

### 1. Create R2 Bucket

1. Go to **R2** → **Create bucket**
2. Name: `synthstack-uploads` (or your preference)
3. Location: Choose closest to your users

### 2. Create API Token

1. Go to **R2** → **Manage R2 API Tokens**
2. Click **Create API token**
3. Permissions: **Object Read & Write**
4. Specify bucket: `synthstack-uploads`
5. Copy Access Key ID and Secret Access Key

### 3. Configure Environment Variables

Add to your root `.env`:

```bash
# Cloudflare R2 Storage
CLOUDFLARE_R2_ACCESS_KEY=your_access_key_id
CLOUDFLARE_R2_SECRET_KEY=your_secret_access_key
CLOUDFLARE_R2_BUCKET=synthstack-uploads
CLOUDFLARE_R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
CLOUDFLARE_ACCOUNT_ID=your_account_id
```

### 4. Set Up Public Access (Optional)

For public file access without signed URLs:

1. Go to **R2** → Your bucket → **Settings**
2. Enable **Public access**
3. Connect a custom domain (e.g., `cdn.synthstack.app`)

Or use Cloudflare Workers for controlled access.

### 5. GitHub Secrets

```bash
gh secret set CLOUDFLARE_R2_ACCESS_KEY -b "your_access_key"
gh secret set CLOUDFLARE_R2_SECRET_KEY -b "your_secret_key"
gh secret set CLOUDFLARE_R2_BUCKET -b "synthstack-uploads"
gh secret set CLOUDFLARE_ACCOUNT_ID -b "your_account_id"
```

---

## Cloudflare Tunnel (Optional)

Use Tunnel to expose your server without a public IP - perfect for home servers or restricted networks.

### 1. Install cloudflared

```bash
# On your server
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

### 2. Authenticate

```bash
cloudflared tunnel login
```

### 3. Create Tunnel

```bash
cloudflared tunnel create synthstack
```

### 4. Configure Tunnel

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  # Main website
  - hostname: synthstack.app
    service: http://localhost:3050
  - hostname: www.synthstack.app
    service: http://localhost:3050

  # API
  - hostname: api.synthstack.app
    service: http://localhost:3003

  # Admin/CMS
  - hostname: admin.synthstack.app
    service: http://localhost:8099

  # Catch-all
  - service: http_status:404
```

### 5. Route DNS to Tunnel

```bash
cloudflared tunnel route dns synthstack synthstack.app
cloudflared tunnel route dns synthstack www.synthstack.app
cloudflared tunnel route dns synthstack api.synthstack.app
cloudflared tunnel route dns synthstack admin.synthstack.app
```

### 6. Run as Service

```bash
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

### Tunnel + Docker Compose

Alternatively, add Tunnel to your docker-compose:

```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: synthstack-tunnel
    restart: unless-stopped
    command: tunnel run
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    networks:
      - synthstack-network
```

Get your tunnel token from the Cloudflare dashboard.

---

## Security Settings

### Recommended Security Configuration

**Security → Settings:**
- Security Level: **Medium** (or High for sensitive apps)
- Challenge Passage: **30 minutes**
- Browser Integrity Check: **On**

**Security → WAF:**
- Enable managed rulesets (free tier includes basic protection)

**Security → Bots:**
- Bot Fight Mode: **On** (free)

### Firewall Rules

Go to **Security** → **WAF** → **Custom rules**:

**Block known bad actors:**
```
(cf.threat_score gt 30) or (cf.client.bot)
→ Action: Block
```

**Rate limit API:**
```
(http.request.uri.path contains "/api/") and (rate limit: 100 requests per 10 seconds)
→ Action: Challenge
```

### DDoS Protection

Cloudflare provides automatic DDoS protection on all plans. For additional protection:

1. **Security → DDoS** → Enable L7 DDoS protection
2. Consider **Under Attack Mode** during active attacks

---

## Page Rules (Legacy) vs Rules

Cloudflare is migrating from Page Rules to the new Rules system. Use:

- **Cache Rules** for caching behavior
- **Configuration Rules** for settings per-path
- **Redirect Rules** for URL redirects

### Example: Force HTTPS Redirect

Go to **Rules** → **Redirect Rules**:

```
When: SSL/HTTPS is off
Then: Dynamic redirect to https://${host}${uri}
Status: 301
```

---

## Performance Optimization

### Speed → Optimization

- **Auto Minify**: CSS, JavaScript, HTML: **On**
- **Brotli**: **On**
- **Early Hints**: **On**
- **Rocket Loader**: **Off** (can break Vue.js apps)

### Speed → Image Optimization (Pro+)

If on Pro plan or higher:
- **Polish**: Lossless or Lossy
- **WebP**: On
- **Mirage**: On (for mobile)

### Network

- **HTTP/3 (QUIC)**: **On**
- **WebSockets**: **On** (required for real-time features)
- **gRPC**: **On** (if using gRPC services)

---

## Monitoring & Analytics

### Free Analytics

- **Analytics → Traffic**: View requests, bandwidth, threats blocked
- **Analytics → Security**: Attack analysis
- **Analytics → Performance**: Core Web Vitals (with RUM)

### Web Analytics (Recommended)

1. Go to **Analytics → Web Analytics**
2. Add your site
3. Copy the JavaScript snippet to your Vue.js app

In `apps/web/src/index.html`:
```html
<script defer src='https://static.cloudflareinsights.com/beacon.min.js'
        data-cf-beacon='{"token": "YOUR_TOKEN"}'></script>
```

---

## API Token Setup

For CI/CD cache purging and other automation:

### 1. Create API Token

1. Go to **My Profile** → **API Tokens**
2. Click **Create Token**
3. Use template: **Edit zone DNS** or create custom

**Required permissions for SynthStack:**
- Zone → Zone → Read
- Zone → Cache Purge → Purge
- Zone → DNS → Edit (if managing DNS via API)

### 2. Add to GitHub Secrets

```bash
gh secret set CLOUDFLARE_API_TOKEN -b "your_api_token"
gh secret set CLOUDFLARE_ZONE_ID -b "your_zone_id"
```

Find your Zone ID on the domain's Overview page in Cloudflare dashboard.

---

## Troubleshooting

### Common Issues

**1. Site shows Cloudflare error page**
- Check if origin server is running: `curl http://YOUR_SERVER_IP`
- Verify DNS points to correct IP
- Check Traefik logs: `docker logs synthstack-traefik`

**2. Mixed content warnings**
- Enable "Automatic HTTPS Rewrites" in SSL/TLS settings
- Ensure all resources use relative URLs or HTTPS

**3. WebSocket connections failing**
- Ensure WebSockets enabled in Network settings
- Use DNS-only (gray cloud) for WebSocket endpoints
- Check Traefik WebSocket upgrade headers

**4. Slow initial load**
- This is cold start - Cloudflare needs to cache assets
- Second request will be faster (served from edge)

**5. Changes not appearing**
- Purge Cloudflare cache: Dashboard → Caching → Purge Everything
- Check browser cache (Ctrl+Shift+R)

### Debug Mode

Enable **Development Mode** temporarily to bypass cache:
- Caching → Configuration → Development Mode → On
- Automatically turns off after 3 hours

---

## Cost Comparison

| Feature | Free | Pro ($20/mo) | Business ($200/mo) |
|---------|------|--------------|-------------------|
| CDN | Unlimited | Unlimited | Unlimited |
| DDoS Protection | Basic | Enhanced | Advanced |
| WAF Rules | 5 custom | 20 custom | 100 custom |
| Page Rules | 3 | 20 | 50 |
| Image Optimization | No | Yes | Yes |
| Custom SSL Certs | No | Yes | Yes |
| R2 Storage | Pay-as-go | Pay-as-go | Pay-as-go |

**R2 Pricing:**
- Storage: $0.015/GB/month
- Class A ops (writes): $4.50/million
- Class B ops (reads): $0.36/million
- Egress: **Free!** (main advantage over S3)

---

## Summary Checklist

### Basic Setup
- [ ] Domain added to Cloudflare
- [ ] Nameservers updated at registrar
- [ ] DNS records configured (see table above)
- [ ] SSL/TLS mode set to "Full (strict)"
- [ ] Always Use HTTPS enabled

### Recommended
- [ ] Cache rules configured for static assets
- [ ] API/admin on DNS-only (gray cloud)
- [ ] Security level set appropriately
- [ ] Bot Fight Mode enabled

### Optional Enhancements
- [ ] R2 storage configured for uploads
- [ ] Cloudflare Tunnel (if no public IP)
- [ ] Web Analytics added
- [ ] API token for CI/CD cache purging

---

## Related Documentation

- [Deployment Providers Guide](./DEPLOYMENT_PROVIDERS.md) - VPS setup
- [GitHub Secrets](./deployment/GITHUB_SECRETS.md) - All secrets configuration
- [Self-Hosting Guide](./SELF_HOSTING.md) - Full self-hosting setup
- [Cloudflare Docs](https://developers.cloudflare.com/) - Official documentation
