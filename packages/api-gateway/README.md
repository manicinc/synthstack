# SynthStack API Gateway

FastifyJS-based API Gateway providing secure, high-performance endpoints for authentication, content management, AI copilot, and billing.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

**Server URLs:**
- Development: `http://localhost:3003`
- API Docs (Swagger): `http://localhost:3003/docs`
- Health Check: `http://localhost:3003/health`

---

## 📁 Project Structure

```
packages/api-gateway/
├── src/
│   ├── config/              # Configuration
│   │   └── index.ts        # Environment variables
│   ├── middleware/          # Request middleware
│   │   └── auth.ts         # JWT authentication
│   ├── routes/              # API endpoints
│   │   ├── auth.ts         # Authentication routes
│   │   ├── demo.ts         # Demo credit system ⭐ NEW
│   │   ├── portal-copilot.ts  # Client portal AI ⭐ NEW
│   │   ├── client-portal.ts   # Portal data endpoints
│   │   ├── copilot.ts      # Global AI copilot
│   │   ├── i18n.ts         # Translations
│   │   └── serp.ts         # SEO tracking
│   ├── services/            # Business logic
│   │   ├── auth/           # Auth services
│   │   ├── contextBuilder.ts  # RAG context builder ⭐ NEW
│   │   ├── rateLimiter.ts     # Rate limiting ⭐ NEW
│   │   ├── usageLogger.ts     # Usage tracking ⭐ NEW
│   │   └── serpapi.ts      # SERP integration
│   └── index.ts            # App entry point
├── dist/                    # Build output
├── .env.example            # Example environment variables
├── package.json            # Dependencies & scripts
└── Dockerfile              # Container configuration
```

---

## 🔌 API Endpoints

### Authentication (`/api/v1/auth`)

The API Gateway supports multiple authentication providers configurable at runtime:
- **Supabase Auth** (default)
- **Local PostgreSQL Auth** (self-hosted)
- **Directus Auth** (enterprise)

#### Auth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/signup` | Register new user |
| POST | `/api/v1/auth/signin` | Login with credentials |
| POST | `/api/v1/auth/signout` | Logout and revoke session |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/reset-password-request` | Request password reset email |
| POST | `/api/v1/auth/reset-password` | Complete password reset |
| GET | `/api/v1/auth/providers` | Get auth config |
| GET | `/api/v1/auth/oauth/{provider}` | Get OAuth redirect URL |
| POST | `/api/v1/auth/oauth/callback` | Handle OAuth callback |
| GET | `/api/v1/auth/me` | Get authenticated user |

#### Signup

```bash
curl -X POST https://api.synthstack.app/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123",
    "displayName": "John Doe"
  }'
```

**Response:**
```json
{
  "session": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4e5f6...",
    "expiresAt": "2025-01-07T10:00:00Z",
    "provider": "local"
  },
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "displayName": "John Doe",
    "emailVerified": false,
    "createdAt": "2025-01-06T09:00:00Z"
  }
}
```

#### Signin

```bash
curl -X POST https://api.synthstack.app/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

**Response:** Same as signup

#### Get Authenticated User

```bash
curl https://api.synthstack.app/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGci..."
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "displayName": "John Doe",
  "avatarUrl": "https://...",
  "emailVerified": true,
  "authProvider": "local",
  "createdAt": "2025-01-06T09:00:00Z"
}
```

#### Configuration

Set active provider via database:

```sql
-- Use Local PostgreSQL Auth
UPDATE auth_provider_config
SET active_provider = 'local', local_enabled = true, supabase_enabled = false;

-- Use Supabase Auth
UPDATE auth_provider_config
SET active_provider = 'supabase', supabase_enabled = true, local_enabled = false;
```

See [Authentication Documentation](../../docs/AUTHENTICATION.md) for full configuration options.

---

### Demo Credit System (`/api/v1/demo`) ⭐ NEW

Guest users receive 5 free AI copilot messages per session.

#### POST `/demo/session`
Create or restore demo session with 5 copilot credits.

**Request (optional):**
```json
{
  "fingerprint": "optional-browser-fingerprint"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "abc123def456",
  "copilot_credits_remaining": 5,
  "copilot_credits_used": 0,
  "expires_at": "2026-01-13T10:00:00Z",
  "expiresIn": "7 days"
}
```

**Session Restoration:**
- If `X-Demo-Session: <session_id>` header provided, restores existing session
- If session ID invalid or expired, creates new session
- Sessions expire after 7 days of inactivity

#### GET `/demo/session/:sessionId`
Get current session status and remaining credits.

**Response:**
```json
{
  "success": true,
  "sessionId": "abc123def456",
  "copilot_credits_remaining": 3,
  "copilot_credits_used": 2,
  "copilot_last_used_at": "2026-01-06T15:30:00Z",
  "copilot_blocked_until": null,
  "expires_at": "2026-01-13T10:00:00Z"
}
```

**Error (404 - Session Not Found):**
```json
{
  "success": false,
  "error": "Session not found or expired"
}
```

#### POST `/demo/deduct-credit`
Deduct one credit from the session (called before each AI message).

**Request:**
```json
{
  "sessionId": "abc123def456",
  "feature": "copilot_messages"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "creditsRemaining": 4,
  "creditsUsed": 1
}
```

**Depleted Response (429 - No Credits Remaining):**
```json
{
  "success": false,
  "error": "No credits remaining",
  "blockedUntil": "2026-01-07T15:30:00Z",
  "message": "All 5 demo messages used. Upgrade to continue."
}
```

**Blocked Response (429 - Rate Limited):**
```json
{
  "success": false,
  "error": "Rate limited",
  "blockedUntil": "2026-01-07T15:30:00Z",
  "message": "Demo credits depleted. Please upgrade for unlimited access."
}
```

**Error (400 - Missing sessionId):**
```json
{
  "success": false,
  "error": "Missing sessionId"
}
```

**Error (404 - Session Not Found):**
```json
{
  "success": false,
  "error": "Session not found or expired"
}
```

**📖 [Full Documentation](../../docs/DEMO_CREDIT_SYSTEM.md)**

---

### Portal Copilot (`/api/v1/portal/copilot`) ⭐ NEW

AI assistant for client portal users with project-scoped RAG context.

**Authentication Required:** All endpoints require JWT authentication with `contact_id`.

#### POST `/portal/copilot/chat`
Process AI chat message with project-scoped context.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "What is the status of my projects?" }
  ],
  "chatId": "optional-chat-uuid",
  "projectId": "optional-project-uuid-to-scope-context",
  "options": {
    "temperature": 0.7,
    "maxTokens": 2048
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Your Website Redesign project is currently in progress...",
    "model": "gpt-4",
    "tokensUsed": 342
  },
  "context": [
    {
      "source": "Project: Website Redesign",
      "relevance": 0.95,
      "type": "project"
    },
    {
      "source": "Task: Homepage mockup review",
      "relevance": 0.87,
      "type": "task"
    }
  ],
  "rateLimit": {
    "tier": "subscriber",
    "dailyLimit": 500,
    "used": 12,
    "remaining": 488,
    "resetAt": "2026-01-07T00:00:00Z"
  }
}
```

**Rate Limit Response (429):**
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "rateLimit": {
    "tier": "community",
    "dailyLimit": 100,
    "used": 100,
    "remaining": 0,
    "resetAt": "2026-01-07T00:00:00Z"
  },
  "message": "You've reached your daily limit of 100 messages. Upgrade to Premium for more."
}
```

**Forbidden Response (403):**
```json
{
  "success": false,
  "error": "Portal access required"
}
```

#### GET `/portal/copilot/usage`
Get current usage statistics and rate limits for authenticated user.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "tier": "subscriber",
    "usage": {
      "requestsToday": 45,
      "tokensToday": 12450,
      "errorCount": 2
    },
    "limits": {
      "dailyRequests": 500,
      "maxTokensPerRequest": 4096,
      "remaining": 455
    },
    "resetAt": "2026-01-07T00:00:00Z"
  }
}
```

**Tier Limits:**

| Tier | Requests/Day | Max Tokens/Request |
|------|--------------|---------------------|
| **Community** | 100 | 2,048 |
| **Subscriber** | 500 | 4,096 |
| **Premium** | 2,000 | 8,192 |
| **Lifetime** | 10,000 | 8,192 |
| **BYOK** | Unlimited | 16,384 |
| **Admin** | Unlimited | 16,384 |

**📖 [Architecture Documentation](../../docs/PORTAL_COPILOT_ARCHITECTURE.md)**

---

### Client Portal (`/api/v1/portal`)

#### GET `/portal/projects`
Get all accessible projects for authenticated portal user.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Website Redesign",
      "description": "Complete redesign of company website",
      "status": "in_progress",
      "started_at": "2026-01-15T00:00:00Z"
    }
  ]
}
```

#### GET `/portal/projects/:id/tasks`
Get client-visible tasks for a project.

#### GET `/portal/conversations`
Get conversations where user is participant.

#### GET `/portal/invoices`
Get invoices for user's organization.

---

### Global Copilot (`/api/v1/copilot`)

AI assistant for authenticated app users (not portal-specific).

#### POST `/copilot/chat`
Process chat message with global context.

#### GET `/copilot/health`
Check copilot service health.

---

### Internationalization (`/api/v1/i18n`)

#### GET `/i18n/translations/:locale`
Get translations for a specific locale.

**Response:**
```json
{
  "success": true,
  "locale": "en-US",
  "translations": {
    "common": {
      "welcome": "Welcome to SynthStack",
      "logout": "Logout"
    }
  }
}
```

---

### SERP Tracking (`/api/v1/serp`)

#### POST `/serp/track`
Track search engine ranking position.

**Request:**
```json
{
  "url": "https://synthstack.app",
  "keyword": "ai saas boilerplate",
  "engine": "google"
}
```

---

## 🔐 Authentication

### JWT Token Format

```typescript
interface JWTPayload {
  id: string              // user_id or contact_id
  email: string
  contactId?: string      // For portal users
  organizationId?: string // For portal users
  role: 'authenticated' | 'portal_user' | 'admin'
  iat: number            // Issued at
  exp: number            // Expires at (24 hours default)
}
```

### Middleware

**`authenticate`**: Verifies JWT token and attaches `request.user`.

**`requirePortalAccess`**: Ensures user has `contact_id` (is portal user).

**Usage:**
```typescript
fastify.post(
  '/portal/copilot/chat',
  {
    preHandler: [authenticate, requirePortalAccess]
  },
  async (request, reply) => {
    const contactId = request.user.contactId
    // ... handler logic
  }
)
```

---

## ⚙️ Configuration

### Environment Variables

Create `.env` file in `/packages/api-gateway/`:

```env
# Server
PORT=3003
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/synthstack

# JWT Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=24h

# LLM API (for copilot)
OPENAI_API_KEY=sk-...
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_MODEL=gpt-4

# Redis (for caching & rate limiting)
REDIS_URL=redis://localhost:6379

# Feature Flags
ENABLE_PORTAL_COPILOT=true
ENABLE_DEMO_CREDITS=true
DEFAULT_PORTAL_TIER=community

# Demo Credit Settings
DEMO_CREDITS_INITIAL=5
DEMO_SESSION_DURATION_DAYS=7
DEMO_BLOCK_DURATION_HOURS=24
```

---

## 🧪 Testing

![Tests](https://img.shields.io/badge/tests-551%20passing-brightgreen)

| Metric | Count |
|--------|-------|
| Passing | 551 |
| Skipped | 49 |
| Total | 600 |

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test
pnpm test demo.spec.ts
```

### Integration Tests

Integration tests (demo, portal-copilot, dashboard-analytics) are skipped by default
and require a running server + database.

```bash
# Start test database
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
pnpm test:integration
```

**Test Coverage:**
- `src/middleware/__tests__/` - Auth, validation, rate limiting
- `src/services/__tests__/` - Stripe, referral, BYOK, encryption, gamification, feature flags, credits, audit
- `src/services/gdpr/__tests__/` - PII redaction
- `src/services/email/__tests__/` - Mailer
- `src/routes/*.spec.ts` - Route handlers

---

## 🚀 Deployment

### Build

```bash
# Production build
pnpm build

# Output: dist/ directory
```

### Run Production Server

```bash
# Start with Node.js
NODE_ENV=production node dist/index.js

# Or use PM2 for process management
pm2 start dist/index.js --name api-gateway

# Or use Docker
docker build -t synthstack-api .
docker run -p 3003:3003 --env-file .env synthstack-api
```

### Health Checks

```bash
# Basic health check
curl http://localhost:3003/health

# Detailed health check (authenticated)
curl -H "Authorization: Bearer <token>" http://localhost:3003/health/detailed
```

---

## 📊 Monitoring

### Metrics

The API Gateway exposes Prometheus metrics at `/metrics`:

- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request duration histogram
- `copilot_requests_total` - Total copilot requests
- `demo_credits_depleted_total` - Total credit depletions
- `rate_limit_exceeded_total` - Total rate limit hits

### Logging

Structured JSON logs with Pino:

```json
{
  "level": "info",
  "time": "2026-01-06T12:00:00.000Z",
  "pid": 1234,
  "hostname": "api-gateway",
  "req": {
    "method": "POST",
    "url": "/api/v1/portal/copilot/chat",
    "headers": { ... }
  },
  "res": {
    "statusCode": 200
  },
  "responseTime": 342,
  "msg": "request completed"
}
```

---

## 🔧 Development

### Hot Reload

```bash
# Start with auto-restart on file changes
pnpm dev

# Uses tsx for TypeScript hot reload
```

### Debugging

```bash
# Start with inspector
pnpm dev:debug

# Attach debugger to localhost:9229
```

### Database Migrations

```bash
# Run migrations
pnpm migrate

# Rollback last migration
pnpm migrate:rollback

# Create new migration
pnpm migrate:create migration_name
```

---

## 📚 Documentation

- **[Demo Credit System](../../docs/DEMO_CREDIT_SYSTEM.md)** - Guest user free trial documentation
- **[Portal Copilot Architecture](../../docs/PORTAL_COPILOT_ARCHITECTURE.md)** - Technical architecture guide
- **[Client Portal Guide](../../docs/CLIENT_PORTAL_GUIDE.md)** - User-facing portal documentation

---

## 🛡️ Security

### Rate Limiting

- **Per-minute limits**: Prevent abuse (5-20 req/min based on tier)
- **Per-day limits**: Control costs (100-10,000 req/day based on tier)
- **IP-based**: Additional protection for unauthenticated endpoints
- **Distributed**: Redis-backed for multi-instance deployments

### Data Isolation

- **Row-Level Security (RLS)**: PostgreSQL policies enforce data access
- **JWT Verification**: Every request validates token signature
- **Organization Filtering**: Queries automatically filter by `organization_id`
- **Contact-Based Access**: Portal users only see their linked projects

### Input Validation

- **JSON Schema**: Request body validation
- **Parameter Sanitization**: SQL injection prevention
- **XSS Protection**: Output encoding for user-generated content
- **CORS**: Configurable origin whitelist

---

## 📄 License

Community License (modified MIT, non-commercial) / Commercial License (Pro Edition)

See [LICENSE](../../LICENSE) for details.

---

**Built with Fastify, PostgreSQL, and TypeScript**

**Need help?** Check the [API documentation](../../docs/) or open an issue.
