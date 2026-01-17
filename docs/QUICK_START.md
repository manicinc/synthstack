# SynthStack Community — Quick Start

Get running locally with Docker in a few minutes.

## 🚀 One-Command Setup

```bash
git clone https://github.com/manicinc/synthstack.git
cd synthstack
pnpm install
pnpm generate:env --edition lite   # Generate .env from config.json
docker compose -f docker-compose.community.yml up -d
```

Open: http://localhost:3050

> **Alternative:** You can also copy `cp .env.example .env` and fill in values manually.

---

## 🔐 Security Keys

The `generate:env` script automatically generates secure cryptographic keys for:
- `DIRECTUS_KEY` / `DIRECTUS_SECRET`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `ADMIN_SECRET`

If you copied `.env.example` manually, generate keys with:

```bash
node -e "console.log('DIRECTUS_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('DIRECTUS_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(48).toString('base64'))"
```

Copy the outputs into your `.env` file.

---

## 📍 Access Everything

| What | Where |
|------|-------|
| Web App | http://localhost:3050 |
| API Docs | http://localhost:3003/docs |
| Admin CMS (Directus) | http://localhost:8099/admin |

---

## 🔐 First Login

1. Go to http://localhost:3050
2. Click “Sign Up”
3. Sign up with email/password (OAuth requires Supabase Auth)

Auth setup (Supabase vs Local):
- [Auth Provider Wizard](./guides/AUTH_PROVIDER_WIZARD.md)

---

## 🛠️ Common Commands

```bash
# Start/stop the Community docker stack
docker compose -f docker-compose.community.yml up -d
docker compose -f docker-compose.community.yml down

# View logs
docker compose -f docker-compose.community.yml logs -f

# Type check / tests
pnpm typecheck
pnpm test
```

---

## 🔧 Troubleshooting

### Clean Restart

```bash
docker compose -f docker-compose.community.yml down -v
docker compose -f docker-compose.community.yml up -d
```

### Check Service Status

```bash
docker compose -f docker-compose.community.yml ps
```

---

## 📚 Next Steps

- Production deployment: [Deployment Quick Start](./DEPLOYMENT_QUICK_START.md)
- Full auth setup: [Authentication Guide](./AUTHENTICATION.md)
- Branding: [Branding & Theming](./customization/BRANDING.md)

