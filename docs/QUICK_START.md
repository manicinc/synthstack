# SynthStack - Quick Start Guide

## 🚀 One-Command Setup

```bash
# Clone, install, and start all services
git clone <repo-url> synthstack && cd synthstack
cp .env.example .env
pnpm install
docker compose up -d
```

**That's it!** Open [http://localhost:3050](http://localhost:3050) 🎉

---

## 🔐 Generate Security Keys (IMPORTANT!)

Before deploying to production, generate unique security keys:

```bash
# Generate DIRECTUS_KEY (256-bit hex)
node -e "console.log('DIRECTUS_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate DIRECTUS_SECRET (256-bit hex)
node -e "console.log('DIRECTUS_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT_SECRET (384-bit base64)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(48).toString('base64'))"

# Generate ENCRYPTION_KEY for BYOK (user API key storage)
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

Copy these values into your `.env` file. **Never use the placeholder values in production!**

---

## 📍 Access Everything

### Main Services

| What | Where | When to Use |
|------|-------|-------------|
| **Web App** | [localhost:3050](http://localhost:3050) | Main application interface |
| **API Docs** | [localhost:3003/docs](http://localhost:3003/docs) | View all API endpoints |
| **ML Service Docs** | [localhost:8001/docs](http://localhost:8001/docs) | ML/AI API endpoints |
| **Admin CMS** | [localhost:8099/admin](http://localhost:8099/admin) | Manage content & users |
| **Vector DB** | [localhost:6333/dashboard](http://localhost:6333/dashboard) | Check RAG indexing |
| **Admin Dashboard** | [localhost:3050/admin/llm-costs](http://localhost:3050/admin/llm-costs) | Monitor LLM costs (admin only) |

### AI Copilot (Built-in Chat Assistant)

| How | Action |
|-----|--------|
| 🖱️ **Click** | Robot icon in bottom-right corner |
| ⌨️ **Type** | `⌘K` (Mac) or `Ctrl+K` (Windows/Linux) |
| 📱 **Mobile** | Tap floating button (goes full-screen) |

**Must be logged in to use!**

---

## 🔐 First Login

### Create Account
1. Go to [localhost:3050](http://localhost:3050)
2. Click "Sign Up"
3. Use email or Google/GitHub OAuth
4. Verify email (check console logs in dev mode)

### Default Admin Access
- **Directus**: `admin@synthstack.app` / `Synthstackadmin!`
- **Database**: User `synthstack`, Database `synthstack`

---

## 🤖 Using the AI Copilot

### Open the Copilot
- Press `⌘K` or `Ctrl+K` anywhere
- OR click the 🤖 robot icon (bottom-right)

### Try These Prompts
```
"Explain the RAG architecture"
"How do I customize themes?"
"What are the API endpoints?"
"Show me authentication flow"
"How does billing work?"
```

### Adjust Settings
Click ⚙️ in the input box to configure:
- **Temperature** (0.1-1.0) - Creativity level
- **Max Tokens** (500-4000) - Response length
- **RAG Context** (On/Off) - Include documentation
- **Sources** (1-10) - Number of docs to retrieve

**[Full Copilot Guide →](./features/COPILOT.md)**

---

## 📁 Project Layout

```
synthstack/
├── apps/web/              ← Vue 3 + Quasar frontend
├── packages/api-gateway/  ← Fastify REST API
├── services/directus/     ← CMS configuration
└── docker-compose.yml     ← All backend services
```

---

## 🛠️ Common Commands

### Development
```bash
# Start frontend dev server
pnpm dev:web

# Start API gateway dev server
pnpm dev:api

# Start all Docker services
docker compose up -d

# View Docker logs
docker compose logs -f

# Stop all services
docker compose down
```

### Building
```bash
# Build frontend for production
pnpm build:web

# Build API gateway
pnpm build:api

# Build everything
pnpm build
```

### Testing
```bash
# Run all tests
pnpm test

# Type check
pnpm typecheck

# Lint code
pnpm lint
```

---

## 🔧 Troubleshooting

### Services Won't Start
```bash
# Clean restart
docker compose down -v
docker compose up -d --build
```

### API Gateway Issues
```bash
# Rebuild API
cd packages/api-gateway
pnpm build
docker compose restart api-gateway
```

### Frontend Not Loading
```bash
# Clear cache and reinstall
rm -rf apps/web/.quasar apps/web/node_modules
pnpm install
pnpm dev:web
```

### Copilot Not Working
1. Check you're logged in
2. Visit [localhost:3003/api/v1/copilot/health](http://localhost:3003/api/v1/copilot/health)
3. Check API and Qdrant services are running:
   ```bash
   docker compose ps
   ```

### Database Issues
```bash
# Reset database (WARNING: Deletes all data!)
docker compose down -v
docker compose up -d postgres
# Wait for postgres to initialize
pnpm db:migrate
```

---

## 📊 Service Health Checks

### Quick Status Check
```bash
# Check all Docker services
docker compose ps

# Should see 7 services running:
# - postgres (healthy)
# - redis (healthy)
# - qdrant (healthy)
# - directus (healthy)
# - api-gateway (healthy)
# - ml-service (healthy)
# - web (running)
```

### Manual Health Checks

| Service | Check URL |
|---------|-----------|
| API Gateway | [localhost:3003/health](http://localhost:3003/health) |
| Copilot | [localhost:3003/api/v1/copilot/health](http://localhost:3003/api/v1/copilot/health) |
| Directus | [localhost:8099/server/ping](http://localhost:8099/server/ping) |
| Qdrant | [localhost:6333/](http://localhost:6333/) |

---

## 📚 Next Steps

### Customize Your App
1. **Update Branding**
   - Edit `apps/web/src/i18n/en-US.json`
   - Replace logos in `apps/web/public/logo/`
   - Update colors in `apps/web/quasar.config.js`

2. **Configure AI Models**
   - Edit `.env`: Set `COPILOT_MODEL`, `COPILOT_FALLBACK_MODEL`
   - Add API keys: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`

3. **Enable BYOK (Premium Feature)**
   - BYOK allows Premium/Lifetime users to use their own API keys
   - Navigate to Settings → API Keys in the web app
   - Add your OpenAI or Anthropic API keys
   - Keys are encrypted (AES-256) and stored securely
   - Bypass rate limits and save on AI costs
   - See [FAQ_BYOK.md](./FAQ_BYOK.md) for complete guide

4. **Setup Payments**
   - Add Stripe keys to `.env`
   - Create products in Stripe dashboard
   - Update price IDs in config

5. **Index Documentation**
   - Use copilot `/index` endpoint (admin only)
   - Documents auto-indexed from Directus
   - Check Qdrant dashboard for indexed items

### Deploy to Production

**Required GitHub Secrets** ([full guide](./deployment/GITHUB_SECRETS.md)):

```bash
# Via GitHub CLI (https://cli.github.com/)
gh secret set REMOTE_SSH_KEY < ~/.ssh/id_ed25519_your_server
gh secret set REMOTE_USER -b "root"
gh secret set REMOTE_HOST_PRODUCTION -b "YOUR_SERVER_IP"

# REQUIRED: GitHub PAT for Docker image pulls
# Create at: https://github.com/settings/tokens (select read:packages scope)
gh secret set GH_PAT -b "ghp_your_token_here"
```

Then push to `main` branch - GitHub Actions auto-deploys!

### Learn More
- **[Full Documentation](./README.md)** - Complete setup guide
- **[GitHub Secrets Guide](./deployment/GITHUB_SECRETS.md)** - All deployment secrets
- **[Copilot Guide](./features/COPILOT.md)** - AI assistant features
- **[Web App README](./apps/web/README.md)** - Frontend documentation
- **[API Reference](http://localhost:3003/docs)** - Live API docs (when running)

---

## 🆘 Need Help?

### Ask the AI Copilot
Press `⌘K` and ask:
```
"I'm getting an error with..."
"How do I configure..."
"Where is the code for..."
```

### Check Logs
```bash
# API Gateway logs
docker compose logs -f api-gateway

# All services
docker compose logs -f

# Specific service
docker compose logs -f postgres
```

### Common Solutions

| Problem | Solution |
|---------|----------|
| Port already in use | Change port in `.env` or `docker-compose.yml` |
| Permission denied | Run with `sudo` or fix Docker permissions |
| Out of memory | Increase Docker memory limit |
| Module not found | Run `pnpm install` again |
| TypeScript errors | Run `pnpm typecheck` to see details |

---

**Built with ❤️ - Start coding in 5 minutes! 🚀**
