# Multilingual Content Guide

This guide explains how to set up and manage multilingual content in SynthStack using Directus CMS and the i18n system.

## Overview

SynthStack provides a comprehensive internationalization (i18n) system that supports:

- **UI Translations**: Frontend strings in multiple languages
- **CMS Content Translations**: Directus-managed content in multiple languages
- **User Preferences**: Per-user language settings
- **RTL Support**: Right-to-left language support (Arabic, Hebrew)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Vue/Quasar)                    │
├─────────────────────────────────────────────────────────────┤
│  vue-i18n          │  Locale Store    │  Language Switcher  │
│  (UI strings)      │  (persistence)   │  (component)        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway (Fastify)                    │
├─────────────────────────────────────────────────────────────┤
│  /api/v1/i18n/locales      │  Get supported locales         │
│  /api/v1/i18n/translations │  Get translation overrides     │
│  /api/v1/i18n/content      │  Get translated CMS content    │
│  /api/v1/i18n/user         │  User locale preferences       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Database (PostgreSQL)                    │
├─────────────────────────────────────────────────────────────┤
│  supported_locales         │  Available languages           │
│  translation_overrides     │  CMS string overrides          │
│  content_translations      │  Translated CMS content        │
│  app_users.preferred_locale│  User preferences              │
└─────────────────────────────────────────────────────────────┘
```

## Supported Languages

SynthStack supports 6 languages out of the box:

| Code    | Language            | Direction | Status  |
|---------|---------------------|-----------|---------|
| en-US   | English (US)        | LTR       | Default |
| es      | Spanish             | LTR       | Enabled |
| fr      | French              | LTR       | Enabled |
| de      | German              | LTR       | Enabled |
| zh-CN   | Chinese (Simplified)| LTR       | Enabled |
| ja      | Japanese            | LTR       | Enabled |

## Quick Start

### 1. Enable Language Switching

The language switcher is controlled by a feature flag:

```sql
-- Enable language switching (already enabled by default)
UPDATE feature_flags 
SET is_enabled = true 
WHERE key = 'language_switching';
```

### 2. Using Translations in Vue Components

```vue
<template>
  <div>
    <h1>{{ t('landing.hero.title') }}</h1>
    <p>{{ t('landing.hero.subtitle') }}</p>
    <q-btn :label="t('common.save')" @click="save" />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();

// Change language programmatically
function changeLanguage(newLocale: string) {
  locale.value = newLocale;
}
</script>
```

### 3. Adding the Language Switcher

```vue
<template>
  <LanguageSwitcher />
</template>

<script setup lang="ts">
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher.vue';
</script>
```

## CMS Content Translations

### Setting Up Translatable Collections

1. **Define Translatable Fields** in Directus:

```sql
-- Add collection to translatable list
INSERT INTO translatable_collections (
  collection_name, 
  display_name, 
  translatable_fields
) VALUES (
  'blog_posts',
  'Blog Posts',
  '["title", "excerpt", "content", "meta_title", "meta_description"]'::jsonb
);
```

2. **Create Translations** via API:

```typescript
// Create a Spanish translation for a blog post
const response = await fetch('/api/v1/i18n/content/posts/post-uuid', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    locale: 'es',
    field: 'title',
    value: 'Título del artículo en español'
  })
});
```

3. **Fetch Translated Content**:

```typescript
// Get Spanish translation
const response = await fetch('/api/v1/i18n/content/posts/post-uuid?locale=es');
const { translations } = await response.json();

// Apply translations to content
const translatedPost = {
  ...originalPost,
  title: translations.title || originalPost.title,
  content: translations.content || originalPost.content
};
```

### Translation Workflow

Translations follow an approval workflow:

1. **Draft**: Initial translation created
2. **Pending Review**: Submitted for review
3. **Approved**: Ready for production
4. **Rejected**: Needs revision

```typescript
// Approve a translation
await fetch('/api/v1/i18n/content/posts/post-uuid/approve', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ADMIN_TOKEN' },
  body: JSON.stringify({
    locale: 'es',
    field: 'title'
  })
});
```

## Directus Admin UI

### Managing Translations in Directus

1. Navigate to **Settings → Translations** in Directus admin
2. Select the collection to translate
3. Choose the target language
4. Enter translations for each field
5. Submit for review or publish directly

### Translation Override Module

The SynthStack Directus extension includes a translation management module:

```
Directus Admin
└── Extensions
    └── SynthStack
        └── Translations
            ├── Locales (manage languages)
            ├── UI Strings (override app text)
            ├── Content (translate collections)
            └── Statistics (coverage reports)
```

## Frontend Integration

### Locale Store

```typescript
// stores/locale.ts
import { defineStore } from 'pinia';
import { useI18n } from 'vue-i18n';

export const useLocaleStore = defineStore('locale', {
  state: () => ({
    currentLocale: 'en-US',
    availableLocales: []
  }),

  actions: {
    async setLocale(locale: string) {
      const { locale: i18nLocale } = useI18n();
      
      // Update vue-i18n
      i18nLocale.value = locale;
      
      // Persist to localStorage
      localStorage.setItem('locale', locale);
      
      // Update user preference (if logged in)
      await this.updateUserPreference(locale);
      
      // Load Quasar language pack
      await loadQuasarLang(locale);
      
      this.currentLocale = locale;
    },

    async fetchOverrides(locale: string) {
      const response = await fetch(`/api/v1/i18n/translations/${locale}`);
      const { data } = await response.json();
      
      // Merge overrides into vue-i18n messages
      const { mergeLocaleMessage } = useI18n();
      mergeLocaleMessage(locale, unflattenObject(data));
    }
  }
});
```

### Fetching Translated Content

```typescript
// composables/useTranslatedContent.ts
import { ref, watch } from 'vue';
import { useLocaleStore } from '@/stores/locale';

export function useTranslatedContent(collection: string, itemId: string) {
  const localeStore = useLocaleStore();
  const content = ref(null);
  const loading = ref(false);

  async function fetchContent() {
    loading.value = true;
    try {
      // Fetch base content
      const baseResponse = await fetch(`/items/${collection}/${itemId}`);
      const baseContent = await baseResponse.json();

      // Fetch translations
      const transResponse = await fetch(
        `/api/v1/i18n/content/${collection}/${itemId}?locale=${localeStore.currentLocale}`
      );
      const { translations } = await transResponse.json();

      // Merge translations
      content.value = {
        ...baseContent.data,
        ...translations
      };
    } finally {
      loading.value = false;
    }
  }

  // Refetch when locale changes
  watch(() => localeStore.currentLocale, fetchContent, { immediate: true });

  return { content, loading, refetch: fetchContent };
}
```

## Adding a New Language

### 1. Add Locale Configuration

```sql
INSERT INTO supported_locales (
  code, name, english_name, flag, direction, 
  date_format, quasar_lang, is_enabled, sort_order
) VALUES (
  'pt-BR', 'Português', 'Portuguese (Brazil)', '🇧🇷', 'ltr',
  'dd/MM/yyyy', 'pt-BR', true, 7
);
```

### 2. Create Locale File

Create `apps/web/src/i18n/locales/pt-BR.json`:

```json
{
  "app": {
    "name": "SynthStack",
    "tagline": "Boilerplate SaaS Full-Stack com IA Nativa"
  },
  "nav": {
    "home": "Início",
    "features": "Recursos",
    "pricing": "Preços"
  },
  "landing": {
    "hero": {
      "title": "Construa SaaS 10x Mais Rápido",
      "subtitle": "Boilerplate full-stack com IA integrada"
    }
  }
}
```

### 3. Register in i18n Config

```typescript
// apps/web/src/i18n/index.ts
import ptBR from './locales/pt-BR.json';

export const SUPPORTED_LOCALES = [
  // ... existing locales
  { 
    code: 'pt-BR', 
    name: 'Português', 
    englishName: 'Portuguese (Brazil)',
    flag: '🇧🇷',
    direction: 'ltr',
    quasarLang: 'pt-BR',
    dateFormat: 'dd/MM/yyyy',
    enabled: true 
  },
];

export const messages = {
  // ... existing messages
  'pt-BR': ptBR,
};
```

### 4. Add Quasar Language Pack

```typescript
// apps/web/src/i18n/index.ts
export const QUASAR_LANG_IMPORTS = {
  // ... existing imports
  'pt-BR': () => import('quasar/lang/pt-BR'),
};
```

## Best Practices

### Translation Keys

Use descriptive, hierarchical keys:

```json
{
  "landing": {
    "hero": {
      "title": "...",
      "subtitle": "...",
      "cta": "..."
    },
    "features": {
      "title": "...",
      "item1": {
        "title": "...",
        "description": "..."
      }
    }
  }
}
```

### Interpolation

Use named parameters for dynamic content:

```json
{
  "greeting": "Hello, {name}!",
  "items": "{count} items found",
  "price": "Price: {amount}"
}
```

```vue
<template>
  <p>{{ t('greeting', { name: user.name }) }}</p>
  <p>{{ t('items', { count: results.length }) }}</p>
</template>
```

### Pluralization

Use vue-i18n pluralization:

```json
{
  "messages": "No messages | 1 message | {count} messages"
}
```

```vue
<template>
  <p>{{ t('messages', messageCount) }}</p>
</template>
```

### Date/Number Formatting

Use locale-aware formatting:

```typescript
const { d, n } = useI18n();

// Format date
const formattedDate = d(new Date(), 'long');

// Format number
const formattedPrice = n(99.99, 'currency');
```

## API Reference

### GET /api/v1/i18n/locales

Returns all enabled locales.

```json
{
  "locales": [
    {
      "code": "en-US",
      "name": "English",
      "englishName": "English (US)",
      "flag": "🇺🇸",
      "direction": "ltr",
      "dateFormat": "MM/dd/yyyy",
      "isDefault": true
    }
  ],
  "defaultLocale": "en-US"
}
```

### GET /api/v1/i18n/translations/:locale

Returns translation overrides for a locale.

```json
{
  "locale": "es",
  "data": {
    "landing.hero.title": "Construye SaaS 10x Más Rápido",
    "common.save": "Guardar"
  },
  "count": 150
}
```

### GET /api/v1/i18n/content/:collection/:id

Returns translated content for a CMS item.

```json
{
  "collection": "posts",
  "id": "abc-123",
  "locale": "es",
  "translations": {
    "title": "Título en español",
    "content": "Contenido traducido..."
  },
  "hasTranslations": true
}
```

### PUT /api/v1/i18n/user/preference

Sets user's preferred locale.

```json
// Request
{ "locale": "es" }

// Response
{ "success": true, "locale": "es" }
```

## Troubleshooting

### Translations Not Loading

1. Check if locale is enabled in `supported_locales` table
2. Verify locale file exists in `apps/web/src/i18n/locales/`
3. Check browser console for i18n errors
4. Clear localStorage and reload

### Missing Keys

1. Add missing key to all locale files
2. Use fallback locale (en-US) for missing keys
3. Check for typos in translation key path

### RTL Issues

1. Ensure `direction: 'rtl'` is set in locale config
2. Use Quasar RTL-aware components
3. Test with actual RTL content

## Related Documentation

- [I18N_GUIDE.md](../I18N_GUIDE.md) - Frontend i18n setup
- [Directus Documentation](https://docs.directus.io/) - CMS configuration
- [vue-i18n Documentation](https://vue-i18n.intlify.dev/) - Translation library


