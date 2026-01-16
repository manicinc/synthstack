# OAuth Setup (Supabase)

This guide configures **Google/GitHub OAuth** for SynthStack when using **Supabase Auth** (default).

> Local PostgreSQL auth does **not** support OAuth yet.

## How OAuth Works Here

- The OAuth provider callback is handled by **Supabase**.
- Your app redirects back to **your frontend** at: `https://YOUR_APP_DOMAIN/auth/callback`
- Your OAuth app’s callback/redirect URL must be the Supabase callback:
  - `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`

Supabase docs: https://supabase.com/docs/guides/auth/social-login

---

## 0) Prerequisites

- Supabase project created
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` configured in the web app
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` configured in the API

If you haven’t done this yet, start with:
- [Supabase Auth Setup (Wizard)](./SUPABASE_AUTH_SETUP.md)

---

## 1) Configure Supabase URL Settings

In Supabase: **Authentication → URL Configuration**

- **Site URL:** `https://YOUR_APP_DOMAIN`
- **Redirect URLs:** add:
  - `https://YOUR_APP_DOMAIN/**`
  - `http://localhost:3050/**` (local dev)

Docs: https://supabase.com/docs/guides/auth/redirect-urls

---

## 2) Google OAuth

### Create Google OAuth Credentials

1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Create/select a project
3. Create an OAuth client (Web application)
4. Set **Authorized redirect URIs** to your Supabase callback:

```
https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
```

Copy:
- Client ID
- Client secret

### Enable Google Provider in Supabase

In Supabase: **Authentication → Providers → Google**

- Enable provider
- Paste Client ID + Client secret
- Save

---

## 3) GitHub OAuth

### Create GitHub OAuth App

1. Go to GitHub Developer Settings: https://github.com/settings/developers
2. Create a new OAuth app
3. Set **Authorization callback URL** to your Supabase callback:

```
https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
```

Copy:
- Client ID
- Client secret

### Enable GitHub Provider in Supabase

In Supabase: **Authentication → Providers → GitHub**

- Enable provider
- Paste Client ID + Client secret
- Save

---

## 4) Test

1. Start SynthStack
2. Click “Sign in with Google/GitHub”
3. You should return to: `https://YOUR_APP_DOMAIN/auth/callback`

If you see **redirect mismatch** errors:
- Confirm your OAuth app callback URL matches Supabase’s callback exactly
- Confirm Supabase URL Configuration includes your domain + localhost redirects

