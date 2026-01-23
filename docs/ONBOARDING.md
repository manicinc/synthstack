# SynthStack Onboarding Guide (Community Edition)

Welcome to SynthStack Community — an open-source, cross-platform SaaS boilerplate built with Vue + Quasar and a Fastify API.

## ⚖️ License & Editions

- **Community Edition (this repo)** is MIT licensed. See: `../LICENSE`
- **SynthStack Pro** is a separate codebase with additional features/support under commercial terms: https://synthstack.app/pricing

For a breakdown of features by edition, see:
- [Versions (Lite vs Pro)](./VERSIONS.md)

---

## Getting Started (Local Development)

Start with the guided setup:
- [Quick Start](./QUICK_START.md)

The short version:

```bash
git clone https://github.com/manicinc/synthstack.git
cd synthstack
cp .env.example .env
pnpm install
docker compose -f docker-compose.community.yml up -d
```

### Access Everything

| Service | URL |
|---------|-----|
| Web App | http://localhost:3050 |
| API Docs | http://localhost:3003/docs |
| Admin CMS (Directus) | http://localhost:8099/admin |

---

## Next Steps

- Auth provider choice (Supabase vs Local): [Auth Provider Wizard](./guides/AUTH_PROVIDER_WIZARD.md)
- Production deployment: [Deployment Quick Start](./DEPLOYMENT_QUICK_START.md)
- Branding & configuration: [Branding & Theming](./customization/BRANDING.md)
