# Complete OAuth Setup Guide for SynthStack

Yeah, Supabase doesn't magically provide OAuth - you still need to create OAuth apps yourself. Here's the complete setup.

---

## 1️⃣ Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. **Project name:** `SynthStack`
4. Click **Create**

### Step 2: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. **User Type:** External (select this)
3. Click **Create**

**App information:**
- **App name:** `SynthStack`
- **User support email:** `team@manic.agency`
- **App logo:** (optional - upload your logo)
- **Application home page:** `https://synthstack.app`
- **Application privacy policy:** `https://synthstack.app/privacy`
- **Application terms of service:** `https://synthstack.app/terms`
- **Authorized domains:** Add `synthstack.app`
- **Developer contact:** `team@manic.agency`

Click **Save and Continue**

**Scopes:**
- Click **Add or Remove Scopes**
- Select these scopes:
  - ✅ `../auth/userinfo.email`
  - ✅ `../auth/userinfo.profile`
  - ✅ `openid`
- Click **Update** → **Save and Continue**

**Test users:** (for testing only)
- Add your email: `team@manic.agency`
- Click **Save and Continue**

**Summary:**
- Review and click **Back to Dashboard**

### Step 3: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. **Application type:** Web application
4. **Name:** `SynthStack Production`

**Authorized JavaScript origins:**
```
https://synthstack.app
https://www.synthstack.app
http://localhost:3000
http://localhost:5173
```

**Authorized redirect URIs:**
```
https://insonkkyuhktanzczcde.supabase.co/auth/v1/callback
http://localhost:54321/auth/v1/callback
```

5. Click **Create**

**Copy these:**
- ✅ **Client ID** (looks like: `123456789-abc123def456.apps.googleusercontent.com`)
- ✅ **Client secret** (looks like: `GOCSPX-abc123def456ghi789`)

---

## 2️⃣ GitHub OAuth Setup

### Step 1: Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** tab
3. Click **New OAuth App**

**Register a new OAuth application:**
- **Application name:** `SynthStack`
- **Homepage URL:** `https://synthstack.app`
- **Application description:** `SynthStack - AI-powered SaaS platform`
- **Authorization callback URL:**
  ```
  https://insonkkyuhktanzczcde.supabase.co/auth/v1/callback
  ```

4. Click **Register application**

### Step 2: Generate Client Secret

1. You'll see your **Client ID** (looks like: `Iv1.abc123def456`)
2. Click **Generate a new client secret**
3. **Copy the secret immediately** (looks like: `abc123def456ghi789jkl012mno345`)
   - ⚠️ You can't see it again after you leave this page!

**Copy these:**
- ✅ **Client ID** (looks like: `Iv1.abc123def456`)
- ✅ **Client secret** (looks like: `abc123def456ghi789jkl012mno345`)

---

## 3️⃣ Configure Supabase

### Step 1: Google OAuth

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select project: **synthstack**
3. Go to **Authentication** → **Providers**
4. Find **Google** in the list
5. Toggle **Enable Sign in with Google** to ON

**Configuration:**
- **Client ID (for OAuth):** Paste your Google Client ID
  ```
  123456789-abc123def456.apps.googleusercontent.com
  ```
- **Client Secret (for OAuth):** Paste your Google Client Secret
  ```
  GOCSPX-abc123def456ghi789
  ```
- **Authorized Client IDs:** Leave empty (not needed)
- **Skip nonce check:** Leave unchecked

6. Click **Save**

### Step 2: GitHub OAuth

1. Still in **Authentication** → **Providers**
2. Find **GitHub** in the list
3. Toggle **Enable Sign in with GitHub** to ON

**Configuration:**
- **Client ID (for OAuth):** Paste your GitHub Client ID
  ```
  Iv1.abc123def456
  ```
- **Client Secret (for OAuth):** Paste your GitHub Client Secret
  ```
  abc123def456ghi789jkl012mno345
  ```

4. Click **Save**

### Step 3: Configure Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. **Site URL:**
   ```
   https://synthstack.app
   ```
3. **Redirect URLs:** Add these (one per line):
   ```
   https://synthstack.app/**
   https://www.synthstack.app/**
   http://localhost:3000/**
   http://localhost:5173/**
   ```
4. Click **Save**

---

## 4️⃣ Frontend Implementation

### Install Supabase Client

```bash
cd apps/web
pnpm add @supabase/supabase-js
```

### Create Supabase Client

Create `apps/web/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
```

### Auth Composable

Create `apps/web/src/composables/useAuth.ts`:

```typescript
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'vue-router'

const user = ref(null)
const session = ref(null)
const loading = ref(true)

export function useAuth() {
  const router = useRouter()

  // Initialize session
  async function initAuth() {
    loading.value = true
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    user.value = data.session?.user ?? null
    loading.value = false
  }

  // Listen for auth changes
  supabase.auth.onAuthStateChange((_event, newSession) => {
    session.value = newSession
    user.value = newSession?.user ?? null
  })

  // Email/Password Sign Up
  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { data, error }
  }

  // Email/Password Sign In
  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }

  // Google OAuth
  async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })
    return { data, error }
  }

  // GitHub OAuth
  async function signInWithGitHub() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { data, error }
  }

  // Sign Out
  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      router.push('/login')
    }
    return { error }
  }

  // Computed
  const isAuthenticated = computed(() => !!user.value)

  return {
    user,
    session,
    loading,
    isAuthenticated,
    initAuth,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithGitHub,
    signOut
  }
}
```

### Login Page Component

Create `apps/web/src/pages/LoginPage.vue`:

```vue
<template>
  <div class="login-page">
    <q-card class="login-card">
      <q-card-section>
        <div class="text-h5 text-center">Sign in to SynthStack</div>
      </q-card-section>

      <q-card-section>
        <!-- OAuth Buttons -->
        <q-btn
          unelevated
          color="white"
          text-color="black"
          icon="img:https://www.google.com/favicon.ico"
          label="Continue with Google"
          class="full-width q-mb-md"
          @click="handleGoogleLogin"
          :loading="loading"
        />

        <q-btn
          unelevated
          color="dark"
          icon="img:https://github.githubassets.com/favicons/favicon.svg"
          label="Continue with GitHub"
          class="full-width q-mb-md"
          @click="handleGitHubLogin"
          :loading="loading"
        />

        <div class="text-center q-my-md text-grey">or</div>

        <!-- Email/Password Form -->
        <q-form @submit="handleEmailLogin">
          <q-input
            v-model="email"
            type="email"
            label="Email"
            outlined
            class="q-mb-md"
            :rules="[val => !!val || 'Email is required']"
          />

          <q-input
            v-model="password"
            type="password"
            label="Password"
            outlined
            class="q-mb-md"
            :rules="[val => !!val || 'Password is required']"
          />

          <q-btn
            type="submit"
            unelevated
            color="primary"
            label="Sign in with Email"
            class="full-width"
            :loading="loading"
          />
        </q-form>

        <div class="text-center q-mt-md">
          <router-link to="/signup" class="text-primary">
            Don't have an account? Sign up
          </router-link>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

const router = useRouter()
const $q = useQuasar()
const { signIn, signInWithGoogle, signInWithGitHub } = useAuth()

const email = ref('')
const password = ref('')
const loading = ref(false)

async function handleEmailLogin() {
  loading.value = true
  const { error } = await signIn(email.value, password.value)
  loading.value = false

  if (error) {
    $q.notify({
      type: 'negative',
      message: error.message
    })
  } else {
    router.push('/app')
  }
}

async function handleGoogleLogin() {
  loading.value = true
  const { error } = await signInWithGoogle()
  loading.value = false

  if (error) {
    $q.notify({
      type: 'negative',
      message: error.message
    })
  }
}

async function handleGitHubLogin() {
  loading.value = true
  const { error } = await signInWithGitHub()
  loading.value = false

  if (error) {
    $q.notify({
      type: 'negative',
      message: error.message
    })
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 450px;
}
</style>
```

### Auth Callback Page

Create `apps/web/src/pages/AuthCallbackPage.vue`:

```vue
<template>
  <div class="auth-callback">
    <q-spinner-hourglass size="50px" color="primary" />
    <div class="text-h6 q-mt-md">Completing sign in...</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'

const router = useRouter()

onMounted(async () => {
  // Supabase automatically handles the OAuth callback
  const { data } = await supabase.auth.getSession()

  if (data.session) {
    router.push('/app')
  } else {
    router.push('/login')
  }
})
</script>

<style scoped>
.auth-callback {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
</style>
```

### Update Router

Add to `apps/web/src/router/routes.ts`:

```typescript
const routes = [
  // ... existing routes
  {
    path: '/login',
    component: () => import('pages/LoginPage.vue')
  },
  {
    path: '/signup',
    component: () => import('pages/SignupPage.vue')
  },
  {
    path: '/auth/callback',
    component: () => import('pages/AuthCallbackPage.vue')
  }
]
```

### Add to App.vue

Initialize auth on app mount:

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'

const { initAuth } = useAuth()

onMounted(() => {
  initAuth()
})
</script>
```

---

## 5️⃣ Testing

### Test Email/Password
1. Go to `/signup`
2. Enter email and password
3. Check email for confirmation link
4. Click link → should redirect to `/auth/callback` → redirect to `/app`

### Test Google OAuth
1. Go to `/login`
2. Click "Continue with Google"
3. Select Google account
4. Should redirect back to app and be logged in

### Test GitHub OAuth
1. Go to `/login`
2. Click "Continue with GitHub"
3. Authorize app
4. Should redirect back to app and be logged in

---

## 6️⃣ Production Checklist

**Google OAuth:**
- [ ] Publish OAuth consent screen (remove "Testing" status)
- [ ] Add production domain to authorized domains
- [ ] Update redirect URIs for production

**GitHub OAuth:**
- [ ] Update callback URL for production domain
- [ ] Consider creating separate OAuth app for production

**Supabase:**
- [ ] Update Site URL to production domain
- [ ] Update Redirect URLs for production
- [ ] Test OAuth flow on production domain

---

## Troubleshooting

**"redirect_uri_mismatch" error:**
- Make sure the callback URL in Google/GitHub exactly matches what's in Supabase
- Check for trailing slashes
- Format: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`

**OAuth works locally but not in production:**
- Add production domain to authorized origins in Google
- Update GitHub OAuth app callback URL
- Update Supabase redirect URLs

**User not created in app_users table:**
- Make sure you ran the migration with the trigger
- Check Supabase SQL editor → Database → Triggers
- Manually test: `SELECT * FROM app_users;`

---

Yeah, OAuth setup is a pain. But once it's done, it works smoothly. Let me know if you hit any issues.
