# SynthStack Internationalization (i18n) Guide

This guide covers the complete internationalization system in SynthStack, including language switching, translation management, and Directus CMS integration.

## Overview

SynthStack uses [vue-i18n](https://vue-i18n.intlify.dev/) v9 for internationalization with the following features:

- **6 Supported Languages**: English (US), Spanish, French, German, Chinese (Simplified), Japanese
- **Language Switcher UI**: Dropdown component in the site header
- **Persistence**: localStorage for anonymous users, user profile for authenticated users
- **Lazy Loading**: Locale files are loaded on-demand to reduce initial bundle size
- **CMS Overrides**: Directus integration for non-developer translation editing
- **Feature Flag**: `language_switching` flag to enable/disable the language selector

## Architecture

```
apps/web/src/
├── i18n/
│   ├── index.ts              # Locale registry and metadata
│   ├── types.ts              # TypeScript definitions
│   └── locales/
│       ├── en-US.json        # English (US) - default
│       ├── es.json           # Spanish
│       ├── fr.json           # French
│       ├── de.json           # German
│       ├── zh-CN.json        # Chinese (Simplified)
│       └── ja.json           # Japanese
├── stores/
│   └── i18n.ts               # i18n state management
├── boot/
│   └── i18n.ts               # vue-i18n initialization
└── components/
    └── ui/
        └── LanguageSwitcher.vue  # Language dropdown component
```

## Quick Start

### Using Translations in Components

```vue
<template>
  <div>
    <!-- Simple string -->
    <h1>{{ t('landing.hero.title') }}</h1>

    <!-- With parameters -->
    <p>{{ t('common.welcome', { name: user.name }) }}</p>

    <!-- Pluralization -->
    <span>{{ t('items.count', itemCount) }}</span>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>
```

### Using the i18n Store

```typescript
import { useI18nStore } from '@/stores/i18n';

const i18nStore = useI18nStore();

// Get current locale
console.log(i18nStore.currentLocale);

// Change language
await i18nStore.setLocale('es');

// Get all available locales
const locales = i18nStore.availableLocales;
```

## Supported Locales

| Code | Name | Native Name | Direction | Flag |
|------|------|-------------|-----------|------|
| `en-US` | English (US) | English | LTR | 🇺🇸 |
| `es` | Spanish | Español | LTR | 🇪🇸 |
| `fr` | French | Français | LTR | 🇫🇷 |
| `de` | German | Deutsch | LTR | 🇩🇪 |
| `zh-CN` | Chinese (Simplified) | 简体中文 | LTR | 🇨🇳 |
| `ja` | Japanese | 日本語 | LTR | 🇯🇵 |

## Translation Keys Structure

Translations are organized by category/context:

```json
{
  "app": {
    "name": "SynthStack",
    "tagline": "Build faster with AI"
  },
  "nav": {
    "home": "Home",
    "features": "Features",
    "pricing": "Pricing"
  },
  "landing": {
    "hero": {
      "title": "Welcome to SynthStack",
      "subtitle": "Your AI-native SaaS platform"
    }
  },
  "auth": {
    "login": "Log In",
    "signup": "Sign Up",
    "logout": "Log Out"
  },
  "common": {
    "loading": "Loading...",
    "error": "An error occurred",
    "save": "Save",
    "cancel": "Cancel"
  }
}
```

## Adding a New Language

### 1. Create the Locale File

Create a new JSON file in `apps/web/src/i18n/locales/`:

```bash
# Example: Adding Portuguese
touch apps/web/src/i18n/locales/pt-BR.json
```

Copy the structure from `en-US.json` and translate all keys.

### 2. Register the Locale

Update `apps/web/src/i18n/index.ts`:

```typescript
export const locales: LocaleDefinition[] = [
  // ... existing locales
  {
    code: 'pt-BR',
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇧🇷',
    direction: 'ltr',
    dateFormat: 'dd/MM/yyyy',
    quasarLang: 'pt-BR',
  },
];
```

### 3. Add Database Entry

Run SQL or add via Directus admin:

```sql
INSERT INTO supported_locales (code, name, english_name, flag, direction, quasar_lang, is_enabled)
VALUES ('pt-BR', 'Português', 'Portuguese (Brazil)', '🇧🇷', 'ltr', 'pt-BR', true);
```

### 4. Import Quasar Language Pack

Update `apps/web/quasar.config.js` if needed to include the Quasar language pack.

## Language Switcher Component

The `LanguageSwitcher` component is available in two variants:

### Compact (for header)

```vue
<LanguageSwitcher variant="compact" />
```

Shows flag + locale code (e.g., 🇺🇸 EN).

### Full (for settings page)

```vue
<LanguageSwitcher variant="full" />
```

Shows flag + full language name with descriptions.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'compact' \| 'full'` | `'compact'` | Display style |

## Feature Flag

The language switcher is controlled by the `language_switching` feature flag:

- **Flag Key**: `language_switching`
- **Default**: Enabled for all tiers
- **Tier Required**: `community` (free tier)

### Checking the Flag

```typescript
import { useFeaturesStore } from '@/stores/features';

const features = useFeaturesStore();
const showLanguageSwitcher = features.isEnabled('language_switching');
```

## Persistence Strategy

### Anonymous Users

Language preference is stored in localStorage:

```typescript
localStorage.setItem('synthstack-locale', 'es');
```

### Authenticated Users

Language preference is stored in the user profile:

- Database column: `app_users.preferred_locale`
- Synced on login/signup
- Takes precedence over localStorage

### Fallback Chain

1. User profile `preferred_locale` (if authenticated)
2. localStorage `synthstack-locale`
3. Browser language (`navigator.language`)
4. Default locale (`en-US`)

## Directus CMS Integration

### Translation Overrides

Non-developers can edit translations through Directus without modifying JSON files:

1. **Collection**: `translation_overrides`
2. **Fields**:
   - `locale_code`: Target language
   - `translation_key`: The i18n key (e.g., `landing.hero.title`)
   - `value`: The translated string
   - `status`: Approval workflow (draft → pending_review → approved)

### Workflow

1. Content editor creates/edits a translation override in Directus
2. Sets status to `pending_review`
3. Reviewer approves or rejects
4. Approved translations are fetched by the frontend on app load

### API Endpoints

```
GET  /api/v1/i18n/locales              # List enabled locales
GET  /api/v1/i18n/translations/:locale # Get all translations for a locale
POST /api/v1/i18n/translations/:locale # Update translation (admin only)
GET  /api/v1/i18n/user/preference      # Get user's locale preference
PUT  /api/v1/i18n/user/preference      # Update user's locale preference
```

## Best Practices

### 1. Use Namespaced Keys

```json
{
  "module.section.element": "Translation"
}
```

Good: `landing.hero.cta_button`
Bad: `ctaButton`

### 2. Provide Context for Translators

Add comments or use the `context` field in Directus:

```json
{
  "landing.hero.title": "Build Something Amazing",
  "_landing.hero.title_context": "Main headline on landing page, max 50 chars"
}
```

### 3. Handle Pluralization

```json
{
  "items.count": "No items | {count} item | {count} items"
}
```

```typescript
t('items.count', 0)  // "No items"
t('items.count', 1)  // "1 item"
t('items.count', 5)  // "5 items"
```

### 4. Use Named Parameters

```json
{
  "welcome": "Welcome, {name}!",
  "order.status": "Order #{orderId} is {status}"
}
```

```typescript
t('welcome', { name: 'John' })
t('order.status', { orderId: '12345', status: 'shipped' })
```

### 5. Avoid Hardcoded Text

Always use translation keys, even for small strings:

```vue
<!-- Bad -->
<q-btn label="Submit" />

<!-- Good -->
<q-btn :label="t('common.submit')" />
```

## Troubleshooting

### Missing Translation Warning

If you see `[intlify] Not found 'key' key`:

1. Check the key exists in the locale file
2. Verify the locale file is loading correctly
3. Check for typos in the translation key

### Language Not Changing

1. Check localStorage/user profile is being updated
2. Verify the i18n store is being used correctly
3. Check for component caching issues

### RTL Support

For RTL languages (Arabic, Hebrew), the app automatically:

1. Sets `dir="rtl"` on the document
2. Applies RTL-specific CSS classes
3. Uses Quasar's RTL support

## Development Commands

```bash
# Start dev server
pnpm dev

# Extract translation keys (future feature)
pnpm i18n:extract

# Validate translation files
pnpm i18n:validate
```

## Related Documentation

- [Feature Flags](./FEATURE_FLAGS.md)
- [Directus Features](./DIRECTUS_FEATURES.md)
- [Vue i18n Documentation](https://vue-i18n.intlify.dev/)
