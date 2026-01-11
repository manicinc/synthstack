# Authentication Documentation

## Table of Contents

- [Overview](#overview)
- [Quick Start: Supabase Auth (Default)](#quick-start-supabase-auth-default)
- [Quick Start: Local PostgreSQL Auth](#quick-start-local-postgresql-auth)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Configuration Reference](#configuration-reference)
- [OAuth Setup](#oauth-setup)
- [Security Best Practices](#security-best-practices)
- [API Reference](#api-reference)
- [Comparison: Supabase vs Local PostgreSQL](#comparison-supabase-vs-local-postgresql)
- [Migration Guide](#migration-guide)
- [Troubleshooting](#troubleshooting)

---

## Overview

SynthStack implements a **flexible authentication system** that supports multiple providers through a unified abstraction layer. This allows you to choose the auth provider that best fits your deployment requirements without changing application code.

### Supported Auth Providers

| Provider | Status | Use Case |
|----------|--------|----------|
| **Supabase** | Default, Production-ready | Managed service, fastest setup |
| **Local PostgreSQL** | Production-ready | Self-hosted, no external dependencies |
| **Directus** | Planned | Enterprise deployments |

### Key Features

- **Provider Abstraction** - Switch auth providers via database config (no code changes)
- **Enterprise Security** - Argon2id password hashing (65536 memory cost)
- **JWT Sessions** - Access tokens (1h) + refresh tokens (7d) with rotation
- **OAuth Support** - Google, GitHub, Discord, Microsoft social login
- **Account Protection** - Lockout after failed attempts, email verification
- **Session Management** - Token families detect reuse attacks
- **Audit Trail** - Login history, IP tracking, device identification

---

## Quick Start: Supabase Auth (Default)

**Recommended for:** Most users, fastest setup, managed service

### 1. Create Supabase Project

1. Sign up at [https://supabase.com](https://supabase.com)
2. Create a new project
3. Wait for database provisioning (~2 minutes)

### 2. Get API Credentials

1. Navigate to **Settings → API**
2. Copy the following:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (secret!)

### 3. Configure Environment Variables

**Frontend** (`apps/web/.env`):
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Backend** (`packages/api-gateway/.env`):
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Configure Auth Provider (Optional)

Supabase is the default provider. To explicitly set it:

```sql
UPDATE auth_provider_config
SET
  active_provider = 'supabase',
  supabase_enabled = true;
```

### 5. Configure OAuth Providers in Supabase

1. Go to **Authentication → Providers** in Supabase dashboard
2. Enable desired providers (Google, GitHub, Discord, etc.)
3. Add redirect URL: `https://yourdomain.com/auth/callback`

**Done!** Your app now uses Supabase authentication.

---

## Quick Start: Local PostgreSQL Auth

**Recommended for:** Self-hosted deployments, full data control, no external dependencies

### 1. Generate JWT Secret

Create a secure 256-bit secret for signing tokens:

```bash
openssl rand -base64 32
```

Copy the output (e.g., `x3H7k9mP2vR5wQ8sL1nC4bF6tY0jU9iA3gD5hK7mN2q=`)

### 2. Configure Environment Variables

**Backend** (`packages/api-gateway/.env`):
```bash
# Required for local auth
JWT_SECRET=x3H7k9mP2vR5wQ8sL1nC4bF6tY0jU9iA3gD5hK7mN2q=
DATABASE_URL=postgresql://user:password@localhost:5432/synthstack

# Email Configuration (for password reset & verification emails)
# Option A: Resend API (recommended)
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Option B: SMTP (alternative)
# EMAIL_PROVIDER=smtp
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=your-smtp-user
# SMTP_PASS=your-smtp-password
# EMAIL_FROM=noreply@yourdomain.com

# OAuth Providers (optional)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret

# Optional: Remove Supabase vars if not using
# SUPABASE_URL=...
# SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...
```

**Frontend** (`apps/web/.env`):
```bash
# Remove or comment out Supabase vars
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
```

### 3. Apply Migration

The local auth tables are automatically created via migration `070_local_auth.sql`. If not yet applied:

```bash
# Run migrations
cd services/directus
npm run migrate
```

### 4. Enable Local Auth Provider

Connect to your PostgreSQL database and run:

```sql
UPDATE auth_provider_config
SET
  active_provider = 'local',
  local_enabled = true,
  supabase_enabled = false;
```

### 5. (Optional) Configure OAuth Providers

Local auth now has **full OAuth support** for Google, GitHub, Discord, and Apple. OAuth credentials are configured via environment variables (see step 2).

Enable OAuth providers in the database:

```sql
UPDATE auth_provider_config
SET
  oauth_google_enabled = true,
  oauth_github_enabled = true,
  oauth_discord_enabled = true;
```

See [OAuth Setup](#oauth-setup) for detailed instructions on creating OAuth apps.

### 6. (Optional) Require Email Verification

To require users to verify their email before signing in:

```sql
UPDATE auth_provider_config
SET require_email_verification = true;
```

When enabled:
- New users receive a verification email on signup
- Sign-in fails with `EMAIL_NOT_VERIFIED` error until verified
- Users can request a new verification email

**Done!** Your app now uses local PostgreSQL authentication with full feature parity.

---

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Vue)                          │
│                   apps/web/src/services/auth.ts                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway (Fastify)                        │
│              packages/api-gateway/src/routes/auth.ts            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Auth Service Layer                         │
│          packages/api-gateway/src/services/auth/index.ts        │
│                                                                 │
│   1. Reads auth_provider_config table                          │
│   2. Detects active provider                                   │
│   3. Routes requests to appropriate provider                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │  Supabase  │  │ Local PG   │  │  Directus  │
     │  Provider  │  │  Provider  │  │  Provider  │
     └────────────┘  └────────────┘  └────────────┘
           │              │                 │
           ▼              ▼                 ▼
      Supabase      PostgreSQL          Directus
      Auth API       Database            Users Table
```

### Provider Detection

The system determines which provider to use at **runtime** by reading the `auth_provider_config` table:

```sql
SELECT active_provider FROM auth_provider_config LIMIT 1;
-- Returns: 'supabase' | 'local' | 'directus'
```

This means you can **switch providers without redeploying** by updating a single database row.

### Auth Flow Example (Signin)

1. **User submits login form** → `POST /api/v1/auth/signin`
2. **API Gateway** calls `AuthService.signIn(email, password)`
3. **AuthService** reads `auth_provider_config.active_provider`
4. **Provider router** delegates to appropriate provider:
   - **Supabase:** Calls Supabase Auth API
   - **Local:** Queries `local_auth_credentials`, verifies Argon2id hash
5. **Provider returns** `AuthSession` (user + tokens)
6. **API Gateway** returns session to frontend
7. **Frontend** stores access token, uses for authenticated requests

---

## Database Schema

### local_auth_credentials

Stores password hashes and authentication metadata.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key → `app_users.id` |
| `password_hash` | VARCHAR(255) | **Argon2id** hashed password |
| `password_changed_at` | TIMESTAMPTZ | Last password change |
| `reset_token` | VARCHAR(255) | Password reset token (hashed) |
| `reset_token_expires_at` | TIMESTAMPTZ | Reset token expiration |
| `email_verified` | BOOLEAN | Email verification status |
| `email_verification_token` | VARCHAR(255) | Verification token (hashed) |
| `email_verification_sent_at` | TIMESTAMPTZ | When verification email sent |
| `email_verified_at` | TIMESTAMPTZ | When email was verified |
| `failed_login_attempts` | INTEGER | Counter for account lockout |
| `locked_until` | TIMESTAMPTZ | Account locked until timestamp |
| `last_login_at` | TIMESTAMPTZ | Last successful login |
| `last_login_ip` | INET | IP address of last login |
| `mfa_enabled` | BOOLEAN | Multi-factor auth enabled (future) |
| `mfa_secret` | VARCHAR(255) | TOTP secret (future) |

**Indexes:**
- `idx_local_auth_user` on `user_id`
- `idx_local_auth_reset_token` on `reset_token`
- `idx_local_auth_verification_token` on `email_verification_token`
- `idx_local_auth_locked` on `locked_until`

---

### local_auth_sessions

Tracks active sessions with refresh token management.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key → `app_users.id` |
| `token_hash` | VARCHAR(255) | **SHA-256** hash of refresh token |
| `token_family` | UUID | Token family for rotation detection |
| `ip_address` | INET | IP address of session creation |
| `user_agent` | TEXT | Browser/device user agent |
| `device_name` | VARCHAR(255) | Friendly device name |
| `location` | VARCHAR(255) | Geo-location from IP |
| `issued_at` | TIMESTAMPTZ | When session was created |
| `expires_at` | TIMESTAMPTZ | Session expiration |
| `last_used_at` | TIMESTAMPTZ | Last time token was used |
| `is_active` | BOOLEAN | Session active status |
| `revoked_at` | TIMESTAMPTZ | When session was revoked |
| `revoked_reason` | VARCHAR(100) | Revocation reason |

**Revocation Reasons:**
- `logout` - User logged out
- `password_change` - Password changed
- `admin` - Admin revoked session
- `token_rotation` - Refresh token rotated
- `suspicious` - Suspicious activity detected

**Indexes:**
- `idx_sessions_user` on `(user_id, is_active)`
- `idx_sessions_token` on `token_hash`
- `idx_sessions_expires` on `expires_at`
- `idx_sessions_family` on `token_family`

---

### oauth_connections

Social login connections for OAuth providers.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key → `app_users.id` |
| `provider` | VARCHAR(50) | `google`, `github`, `discord`, `microsoft` |
| `provider_user_id` | VARCHAR(255) | Provider's user ID |
| `provider_email` | VARCHAR(255) | Email from provider |
| `provider_username` | VARCHAR(255) | Username from provider |
| `access_token_encrypted` | TEXT | Encrypted OAuth access token |
| `refresh_token_encrypted` | TEXT | Encrypted OAuth refresh token |
| `token_expires_at` | TIMESTAMPTZ | OAuth token expiration |
| `profile_data` | JSONB | Cached profile data |
| `avatar_url` | VARCHAR(500) | Profile picture URL |
| `scopes` | TEXT[] | Granted OAuth scopes |
| `connected_at` | TIMESTAMPTZ | When connection was created |
| `last_used_at` | TIMESTAMPTZ | Last login via this provider |
| `disconnected_at` | TIMESTAMPTZ | When connection was removed |

**Unique Constraint:** `(provider, provider_user_id)`

---

### auth_provider_config

Global authentication configuration (singleton table).

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `active_provider` | VARCHAR(50) | `supabase` | Active provider: `supabase`, `local`, `directus` |
| `supabase_enabled` | BOOLEAN | `true` | Enable Supabase auth |
| `local_enabled` | BOOLEAN | `false` | Enable local PostgreSQL auth |
| `directus_enabled` | BOOLEAN | `false` | Enable Directus auth |
| **Password Policy** | | | |
| `local_password_min_length` | INTEGER | `8` | Minimum password length |
| `local_password_require_uppercase` | BOOLEAN | `true` | Require uppercase letter |
| `local_password_require_lowercase` | BOOLEAN | `true` | Require lowercase letter |
| `local_password_require_number` | BOOLEAN | `true` | Require number |
| `local_password_require_special` | BOOLEAN | `false` | Require special character |
| **Session Settings** | | | |
| `local_session_duration_hours` | INTEGER | `168` | Session duration (7 days) |
| `local_max_sessions_per_user` | INTEGER | `5` | Max concurrent sessions |
| `local_require_email_verification` | BOOLEAN | `true` | Require email verification |
| **Security** | | | |
| `local_max_failed_login_attempts` | INTEGER | `5` | Max failed logins before lockout |
| `local_lockout_duration_minutes` | INTEGER | `30` | Lockout duration |
| **JWT** | | | |
| `jwt_access_token_expires_minutes` | INTEGER | `60` | Access token lifetime (1 hour) |
| `jwt_refresh_token_expires_days` | INTEGER | `7` | Refresh token lifetime (7 days) |
| **OAuth** | | | |
| `oauth_google_enabled` | BOOLEAN | `false` | Enable Google OAuth |
| `oauth_google_client_id` | VARCHAR(255) | `NULL` | Google OAuth client ID |
| `oauth_github_enabled` | BOOLEAN | `false` | Enable GitHub OAuth |
| `oauth_github_client_id` | VARCHAR(255) | `NULL` | GitHub OAuth client ID |
| `oauth_discord_enabled` | BOOLEAN | `false` | Enable Discord OAuth |
| `oauth_discord_client_id` | VARCHAR(255) | `NULL` | Discord OAuth client ID |
| `oauth_microsoft_enabled` | BOOLEAN | `false` | Enable Microsoft OAuth |
| `oauth_microsoft_client_id` | VARCHAR(255) | `NULL` | Microsoft OAuth client ID |

**Note:** OAuth client **secrets** should be stored in environment variables, not the database.

---

## Configuration Reference

### Viewing Current Configuration

```sql
SELECT * FROM auth_provider_config;
```

### Switching Auth Providers

```sql
-- Switch to Local PostgreSQL
UPDATE auth_provider_config
SET active_provider = 'local', local_enabled = true, supabase_enabled = false;

-- Switch to Supabase
UPDATE auth_provider_config
SET active_provider = 'supabase', supabase_enabled = true, local_enabled = false;

-- Enable both (user chooses during signup)
UPDATE auth_provider_config
SET supabase_enabled = true, local_enabled = true, active_provider = 'supabase';
```

### Customizing Password Policy

```sql
UPDATE auth_provider_config
SET
  local_password_min_length = 12,
  local_password_require_uppercase = true,
  local_password_require_lowercase = true,
  local_password_require_number = true,
  local_password_require_special = true;
```

### Adjusting Session Duration

```sql
-- Increase session lifetime to 30 days
UPDATE auth_provider_config
SET
  local_session_duration_hours = 720,
  jwt_refresh_token_expires_days = 30;

-- Shorter sessions for high-security environments
UPDATE auth_provider_config
SET
  local_session_duration_hours = 24,
  jwt_refresh_token_expires_days = 1,
  jwt_access_token_expires_minutes = 15;
```

### Configuring Account Lockout

```sql
-- Stricter lockout policy
UPDATE auth_provider_config
SET
  local_max_failed_login_attempts = 3,
  local_lockout_duration_minutes = 60;

-- More lenient policy
UPDATE auth_provider_config
SET
  local_max_failed_login_attempts = 10,
  local_lockout_duration_minutes = 15;
```

---

## OAuth Setup

### Google OAuth

#### 1. Create OAuth App

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Navigate to **APIs & Services → OAuth consent screen**
4. Configure consent screen (External or Internal)
5. Go to **Credentials → Create Credentials → OAuth 2.0 Client ID**
6. Application type: **Web application**
7. Authorized redirect URIs:
   ```
   https://api.synthstack.app/api/v1/auth/oauth/callback
   http://localhost:3001/api/v1/auth/oauth/callback (development)
   ```
8. Click **Create** and copy **Client ID** and **Client Secret**

#### 2. Configure in SynthStack

**Database:**
```sql
UPDATE auth_provider_config
SET
  oauth_google_enabled = true,
  oauth_google_client_id = '123456789-abcdef.apps.googleusercontent.com';
```

**Environment Variables** (`packages/api-gateway/.env`):
```bash
OAUTH_GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxx
```

---

### GitHub OAuth

#### 1. Create OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in details:
   - **Application name:** SynthStack
   - **Homepage URL:** `https://synthstack.app`
   - **Authorization callback URL:** `https://api.synthstack.app/api/v1/auth/oauth/callback`
4. Click **Register application**
5. Copy **Client ID**
6. Generate a **Client Secret**

#### 2. Configure in SynthStack

**Database:**
```sql
UPDATE auth_provider_config
SET
  oauth_github_enabled = true,
  oauth_github_client_id = 'Ov23lixxxxxxxxxxxxx';
```

**Environment Variables:**
```bash
OAUTH_GITHUB_CLIENT_SECRET=github_pat_xxxxxxxxxxxxx
```

---

### Discord OAuth

#### 1. Create OAuth App

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Navigate to **OAuth2 → General**
4. Copy **Client ID**
5. Reset **Client Secret** and copy it
6. Add redirect: `https://api.synthstack.app/api/v1/auth/oauth/callback`

#### 2. Configure in SynthStack

**Database:**
```sql
UPDATE auth_provider_config
SET
  oauth_discord_enabled = true,
  oauth_discord_client_id = '123456789012345678';
```

**Environment Variables:**
```bash
OAUTH_DISCORD_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxx
```

---

### Microsoft OAuth

#### 1. Create OAuth App

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory → App registrations**
3. Click **New registration**
4. Set redirect URI: `https://api.synthstack.app/api/v1/auth/oauth/callback`
5. Copy **Application (client) ID**
6. Go to **Certificates & secrets → New client secret**

#### 2. Configure in SynthStack

**Database:**
```sql
UPDATE auth_provider_config
SET
  oauth_microsoft_enabled = true,
  oauth_microsoft_client_id = '12345678-1234-1234-1234-123456789012';
```

**Environment Variables:**
```bash
OAUTH_MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxx
```

---

## Security Best Practices

### JWT Secret Generation

**Never use a weak secret.** Generate a cryptographically secure 256-bit key:

```bash
# macOS/Linux
openssl rand -base64 32

# Alternative
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Token Rotation Strategy

SynthStack implements **refresh token rotation** to detect token theft:

1. Each refresh token belongs to a **token family** (UUID)
2. When refreshing, the old token is invalidated and a new one is issued
3. If an old (already-rotated) token is reused, **all tokens in that family are revoked**
4. This detects token theft and prevents attackers from maintaining access

### Session Expiration Tuning

**Recommendations by environment:**

| Environment | Access Token | Refresh Token | Notes |
|-------------|--------------|---------------|-------|
| **Development** | 60 min | 30 days | Convenience over security |
| **Production** | 15-60 min | 7 days | Balance security and UX |
| **High Security** | 5-15 min | 1-3 days | Banking, healthcare |

### Account Lockout Configuration

- **Max failed attempts:** 3-10 (5 recommended)
- **Lockout duration:** 15-60 minutes (30 recommended)
- **Consider:** Exponential backoff for repeated lockouts

### Email Verification

**Always enable in production:**
```sql
UPDATE auth_provider_config SET local_require_email_verification = true;
```

Prevents:
- Fake account creation
- Email enumeration (with careful error messages)
- Spam/abuse

### HTTPS Only in Production

**Never send JWT tokens over HTTP.** Always use HTTPS in production:

```nginx
# Force HTTPS redirect
server {
    listen 80;
    server_name api.synthstack.app;
    return 301 https://$host$request_uri;
}
```

### Password Hashing (Argon2id)

Local auth uses **Argon2id** with:
- **Memory cost:** 65536 KB (64 MB)
- **Iterations:** 3
- **Parallelism:** 4 threads

This configuration resists GPU/ASIC attacks. Do not reduce these values.

---

## API Reference

All authentication endpoints are prefixed with `/api/v1/auth`.

### POST /api/v1/auth/signup

Register a new user account.

**Request:**
```bash
curl -X POST https://api.synthstack.app/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123",
    "displayName": "John Doe"
  }'
```

**Response (201):**
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

---

### POST /api/v1/auth/signin

Sign in with email and password.

**Request:**
```bash
curl -X POST https://api.synthstack.app/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

**Response (200):** Same as signup

**Error (401):**
```json
{
  "error": "Invalid credentials",
  "code": "AUTH_INVALID_CREDENTIALS"
}
```

**Error (423 - Account Locked):**
```json
{
  "error": "Account locked due to too many failed login attempts",
  "code": "AUTH_ACCOUNT_LOCKED",
  "lockedUntil": "2025-01-06T10:30:00Z"
}
```

---

### POST /api/v1/auth/signout

Sign out and revoke the current session.

**Request:**
```bash
curl -X POST https://api.synthstack.app/api/v1/auth/signout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (200):**
```json
{
  "message": "Signed out successfully"
}
```

---

### POST /api/v1/auth/refresh

Refresh access token using refresh token.

**Request:**
```bash
curl -X POST https://api.synthstack.app/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "a1b2c3d4e5f6..."
  }'
```

**Response (200):**
```json
{
  "session": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "x9y8z7w6...",
    "expiresAt": "2025-01-07T11:00:00Z"
  }
}
```

**Note:** Old refresh token is invalidated (token rotation).

---

### POST /api/v1/auth/reset-password-request

Request password reset email.

**Request:**
```bash
curl -X POST https://api.synthstack.app/api/v1/auth/reset-password-request \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

**Response (200):**
```json
{
  "message": "If an account exists with this email, a reset link has been sent"
}
```

**Note:** Always returns success to prevent email enumeration.

---

### POST /api/v1/auth/reset-password

Complete password reset with token.

**Request:**
```bash
curl -X POST https://api.synthstack.app/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset-token-from-email",
    "newPassword": "NewSecurePass456"
  }'
```

**Response (200):**
```json
{
  "message": "Password reset successful"
}
```

---

### GET /api/v1/auth/providers

Get authentication provider configuration.

**Request:**
```bash
curl https://api.synthstack.app/api/v1/auth/providers
```

**Response (200):**
```json
{
  "activeProvider": "local",
  "availableProviders": ["local", "supabase"],
  "oauthProviders": {
    "google": { "enabled": true, "clientId": "123...apps.googleusercontent.com" },
    "github": { "enabled": true, "clientId": "Ov23li..." },
    "discord": { "enabled": false },
    "microsoft": { "enabled": false }
  },
  "features": {
    "emailVerificationRequired": true,
    "mfaSupported": false
  }
}
```

---

### GET /api/v1/auth/oauth/{provider}

Get OAuth authorization URL.

**Request:**
```bash
curl "https://api.synthstack.app/api/v1/auth/oauth/google?redirect_uri=https://synthstack.app/auth/callback"
```

**Response (200):**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...",
  "state": "random-state-token"
}
```

**Frontend redirects user to `authUrl`.**

---

### POST /api/v1/auth/oauth/callback

Handle OAuth callback (called by OAuth provider redirect).

**Request:**
```bash
curl -X POST https://api.synthstack.app/api/v1/auth/oauth/callback \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "code": "4/0AY0e...",
    "state": "random-state-token"
  }'
```

**Response (200):**
```json
{
  "session": { "accessToken": "...", "refreshToken": "..." },
  "user": { "id": "...", "email": "user@gmail.com", ... }
}
```

---

### GET /api/v1/auth/me

Get current authenticated user profile.

**Request:**
```bash
curl https://api.synthstack.app/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGci..."
```

**Response (200):**
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

---

## Comparison: Supabase vs Local PostgreSQL

| Aspect | Supabase Auth | Local PostgreSQL Auth |
|--------|---------------|----------------------|
| **Setup Complexity** | ⭐⭐⭐⭐⭐ Easy (5 min) | ⭐⭐⭐⭐ Easy (10 min) |
| **External Dependencies** | Yes (Supabase service) | None |
| **OAuth Providers** | Built-in (Google, GitHub, Discord, Apple) | Built-in (Google, GitHub, Discord, Apple) |
| **Cost** | $0-25/month (free: 50k users, 2GB DB) | $0 (included in server) |
| **Data Sovereignty** | Hosted by Supabase | Full control |
| **Scalability** | Auto-scaling | Manual (database scaling) |
| **Email Templates** | Built-in, customizable | Built-in (password reset, verification, welcome) |
| **Admin Dashboard** | Supabase UI | Custom/SQL queries |
| **MFA Support** | Built-in | Prepared (not implemented) |
| **Audit Logs** | Built-in | Built-in (auth_events table) |
| **Password Hashing** | bcrypt | Argon2id (stronger, recommended) |
| **Session Management** | Supabase manages | Full control + refresh token rotation |
| **Account Lockout** | No | Yes (configurable, default 5 attempts) |
| **Migration Effort** | None (default) | Update config + env vars |
| **Lock-in Risk** | Vendor lock-in | No lock-in |

### When to Use Supabase

✅ **Fast setup needed** - Get auth working in 5 minutes
✅ **Managed service preference** - Don't want to manage auth infrastructure
✅ **Built-in OAuth** - Need social login without manual setup
✅ **Admin UI** - Want dashboard for user management
✅ **Small-medium scale** - Under 50k users (free tier)
✅ **Email templates** - Need pre-built auth emails

### When to Use Local PostgreSQL

✅ **Self-hosted requirement** - Must run on your infrastructure
✅ **No external dependencies** - Zero external API calls for auth
✅ **Full data control** - Data sovereignty requirements
✅ **Cost optimization** - High user count (>50k users)
✅ **Custom auth logic** - Need full control over auth flow
✅ **No vendor lock-in** - Own the entire auth stack
✅ **Stronger security** - Argon2id hashing + account lockout
✅ **Full feature parity** - OAuth, email verification, password reset

---

## Migration Guide

### Migrating from Supabase to Local Auth

**1. Export Users from Supabase**

```sql
-- Run in Supabase SQL editor
SELECT
  id, email, created_at, email_confirmed_at
FROM auth.users;
```

Export to CSV.

**2. Switch Auth Provider**

```sql
-- In your SynthStack database
UPDATE auth_provider_config
SET active_provider = 'local', local_enabled = true, supabase_enabled = false;
```

**3. Import Users**

```sql
-- Create users in app_users table
INSERT INTO app_users (id, email, auth_provider, email_verified, email_verified_at, date_created)
VALUES ('uuid-from-supabase', 'user@example.com', 'local', true, '2025-01-01', '2025-01-01');

-- Users must reset passwords (no way to export Supabase password hashes)
```

**4. Send Password Reset Emails**

Notify all users to reset their passwords via the forgot password flow.

---

### Migrating from Local Auth to Supabase

**1. Export Users**

```sql
SELECT u.id, u.email, u.date_created, u.email_verified
FROM app_users u
WHERE u.auth_provider = 'local';
```

**2. Create Users in Supabase**

Use Supabase Admin API:

```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

for (const user of users) {
  await supabase.auth.admin.createUser({
    email: user.email,
    email_confirm: user.email_verified
  });
}
```

**3. Switch Provider**

```sql
UPDATE auth_provider_config
SET active_provider = 'supabase', supabase_enabled = true, local_enabled = false;
```

**4. Update User Records**

```sql
UPDATE app_users
SET auth_provider = 'supabase'
WHERE auth_provider = 'local';
```

---

## Troubleshooting

### JWT Token Validation Fails

**Symptoms:** `401 Unauthorized` errors, "Invalid token" messages

**Causes:**
- JWT_SECRET mismatch between services
- Token expired
- Token format invalid

**Solutions:**
```bash
# 1. Verify JWT_SECRET is identical in all services
grep JWT_SECRET packages/*/\.env

# 2. Check token expiration
# Decode token at https://jwt.io
# Verify 'exp' claim is in the future

# 3. Verify token structure
# Should have format: Authorization: Bearer <token>
```

---

### Account Locked After Failed Logins

**Symptoms:** `423 Account Locked` error

**Cause:** Too many failed login attempts

**Solutions:**
```sql
-- Check lockout status
SELECT email, failed_login_attempts, locked_until
FROM local_auth_credentials
WHERE email = 'user@example.com';

-- Manually unlock account
UPDATE local_auth_credentials
SET
  failed_login_attempts = 0,
  locked_until = NULL
WHERE email = 'user@example.com';
```

**Prevention:**
```sql
-- Increase lockout threshold
UPDATE auth_provider_config
SET local_max_failed_login_attempts = 10;
```

---

### OAuth Redirect Fails

**Symptoms:** Redirect to error page, "redirect_uri_mismatch" error

**Causes:**
- Callback URL not registered with OAuth provider
- CORS issues
- HTTP instead of HTTPS in production

**Solutions:**

**1. Verify callback URL in provider settings:**
```
Google: https://console.cloud.google.com → Credentials
GitHub: https://github.com/settings/developers
```

Expected URL: `https://api.synthstack.app/api/v1/auth/oauth/callback`

**2. Check CORS configuration** (packages/api-gateway/src/index.ts):
```javascript
app.register(cors, {
  origin: ['https://synthstack.app', 'http://localhost:5173'],
  credentials: true
});
```

**3. Force HTTPS in production:**
```nginx
# Nginx config
add_header Strict-Transport-Security "max-age=31536000" always;
```

---

### Password Reset Token Invalid/Expired

**Symptoms:** "Invalid or expired reset token" error

**Cause:** Token expired (1 hour lifetime) or already used

**Solutions:**
```sql
-- Check token expiration
SELECT
  email,
  reset_token,
  reset_token_expires_at,
  reset_token_expires_at > NOW() as is_valid
FROM local_auth_credentials
WHERE reset_token = 'token-from-email';

-- Generate new token (users should request reset again)
-- Tokens are one-time use and auto-expire after 1 hour
```

---

### Email Verification Not Working

**Symptoms:** "Email not verified" errors, verification emails not sending

**Causes:**
- Email service not configured
- Verification disabled
- Token expired (24 hours)

**Solutions:**

**1. Check email service configuration:**
```bash
# Check Resend API key in packages/api-gateway/.env
grep RESEND_API_KEY .env
```

**2. Verify email verification is enabled:**
```sql
SELECT local_require_email_verification
FROM auth_provider_config;

-- Should be TRUE in production
UPDATE auth_provider_config
SET local_require_email_verification = true;
```

**3. Manually verify a user:**
```sql
UPDATE local_auth_credentials
SET
  email_verified = true,
  email_verified_at = NOW()
WHERE user_id = 'user-uuid';

UPDATE app_users
SET
  email_verified = true,
  email_verified_at = NOW()
WHERE id = 'user-uuid';
```

---

### Session Expired Too Quickly

**Symptoms:** Users logged out after short time

**Cause:** Short session duration settings

**Solutions:**
```sql
-- Check current settings
SELECT
  jwt_access_token_expires_minutes,
  jwt_refresh_token_expires_days
FROM auth_provider_config;

-- Increase session duration
UPDATE auth_provider_config
SET
  jwt_access_token_expires_minutes = 120,  -- 2 hours
  jwt_refresh_token_expires_days = 30;     -- 30 days
```

---

## Utility Functions

### Cleanup Expired Sessions

Run this function periodically (via cron job) to purge old sessions:

```sql
SELECT cleanup_expired_sessions();
-- Returns: number of deleted sessions
```

Deletes:
- Sessions expired >7 days ago
- Revoked sessions >30 days old

---

### Revoke All User Sessions

Force logout a user (e.g., after password change or security incident):

```sql
SELECT revoke_all_user_sessions('user-uuid', 'password_change');
-- Returns: number of revoked sessions
```

Revocation reasons:
- `logout` - User logged out
- `password_change` - Password changed
- `admin` - Admin action
- `suspicious` - Security event

---

## Related Documentation

- [Self-Hosting Guide](./SELF_HOSTING.md) - Deployment and configuration
- [Feature Flags](./FEATURE_FLAGS.md) - Auth-related feature flags
- [API Gateway README](../packages/api-gateway/README.md) - API reference
- [Email Service](./EMAIL_SERVICE.md) - Email configuration for auth emails

---

## Support

For issues, questions, or feature requests:
- GitHub Issues: https://github.com/your-repo/synthstack/issues
- Documentation: https://synthstack.app/docs
- Community Discord: https://discord.gg/synthstack
