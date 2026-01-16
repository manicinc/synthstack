# SynthStack Frontend Architecture

## Overview

The SynthStack frontend is built with Vue 3, Quasar Framework, and TypeScript. This document provides a comprehensive guide to the architecture, patterns, and conventions used throughout the codebase.

## Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| Vue 3 | UI Framework | 3.x |
| Quasar | UI Component Library | 2.x |
| TypeScript | Type Safety | 5.x |
| Pinia | State Management | 2.x |
| Vue Router | Routing | 4.x |
| Vitest | Unit Testing | Latest |
| Three.js | 3D Visualization | 0.170.x |

## Why Vue 3 + Quasar?

SynthStack uses Vue 3 with the Quasar Framework to enable true cross-platform development from a single codebase. This choice enables:

- **Cross-Platform Apps**: Build for iOS, Android, macOS, Windows, Linux, and Web from one Vue.js codebase
- **Fast Builds**: Vite-native build system with sub-second HMR (~50ms) and fast production builds (~15s)
- **Flexible Modes**: Switch between SPA, SSR, PWA, Capacitor (mobile), or Electron (desktop) with CLI flags
- **Complete UI Library**: 100+ Material Design components with no extra dependencies

See [Frontend Framework Choices](../../docs/FRONTEND_FRAMEWORK_CHOICES.md) for a detailed comparison with Nuxt, Next.js, and SvelteKit.

## Directory Structure

```
apps/web/src/
├── boot/                 # Quasar boot files (plugins, initialization)
│   ├── analytics.ts     # Analytics + events
│   ├── feature-flags.ts # Feature gating
│   ├── i18n.ts          # Internationalization setup
│   ├── pinia.ts         # State management setup
│   ├── sentry.ts        # Error monitoring
│   ├── supabase.ts      # Auth client initialization
│   └── theme.ts         # Theme management
├── components/          # Reusable Vue components
│   ├── branding/       # Branding + theming UI
│   ├── community/      # Community UI (comments, uploads)
│   ├── landing/        # Landing page sections
│   ├── modals/         # Global dialogs
│   ├── projects/       # Project management UI
│   ├── setup/          # Setup wizards (.env, branding)
│   ├── ui/             # Design system primitives
│   └── workflows/      # Workflow builder UI
├── composables/         # Vue composition functions
│   ├── useApi.ts       # API client wrapper
│   ├── useBreakpoint.ts # Responsive breakpoints
│   ├── useDebounce.ts  # Debouncing utilities
│   ├── useSeo.ts       # SEO meta management
│   └── useToast.ts     # Notifications
├── css/                 # Global styles
│   ├── app.scss        # Main stylesheet
│   ├── animations.scss # Animation library
│   └── quasar.variables.scss # Quasar theme overrides
├── i18n/               # Internationalization files
├── layouts/            # Page layouts
│   ├── AppLayout.vue   # Authenticated app layout
│   ├── AuthLayout.vue  # Login/register layout
│   └── LandingLayout.vue # Public pages layout
├── pages/              # Route pages
│   ├── app/           # Authenticated pages
│   ├── auth/          # Auth pages
│   └── *.vue          # Public pages
├── router/             # Vue Router configuration
│   ├── index.ts       # Router setup
│   └── routes.ts      # Route definitions
├── stores/             # Pinia stores
│   ├── auth.ts        # Authentication state
│   ├── credits.ts     # Credits + usage
│   ├── features.ts    # Feature gating
│   ├── projects.ts    # Project management
│   ├── workflows.ts   # Workflow builder state
│   └── theme.ts       # Theme preferences
└── types/              # TypeScript type definitions
```

## Architectural Patterns

### 1. Composition API

All components use Vue 3's Composition API with `<script setup>` syntax:

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const count = ref(0)
const doubled = computed(() => count.value * 2)
</script>
```

### 2. Pinia Stores

State management follows the Pinia composition store pattern:

```typescript
export const useMyStore = defineStore('my-store', () => {
  // State
  const items = ref<Item[]>([])
  
  // Getters
  const itemCount = computed(() => items.value.length)
  
  // Actions
  function addItem(item: Item) {
    items.value.push(item)
  }
  
  return { items, itemCount, addItem }
})
```

### 3. Composables

Reusable logic is extracted into composables:

```typescript
// composables/useApi.ts
export function useApi() {
  const loading = ref(false)
  const error = ref<Error | null>(null)
  
  async function get<T>(url: string): Promise<T | null> {
    // Implementation
  }
  
  return { loading, error, get }
}
```

### 4. Component Structure

Components follow this structure:

```vue
<template>
  <!-- Template with Quasar components -->
</template>

<script setup lang="ts">
/**
 * ComponentName.vue
 * 
 * Brief description of the component's purpose.
 * 
 * @component
 */
import { ... } from 'vue'

// Props
const props = defineProps<{...}>()

// Emits
const emit = defineEmits<{...}>()

// Composables
const { ... } = useSomeComposable()

// State
const localState = ref(...)

// Computed
const derived = computed(() => ...)

// Methods
function handleAction() { ... }

// Lifecycle
onMounted(() => { ... })
</script>

<style lang="scss" scoped>
/* Scoped styles */
</style>
```

## Design System

### Colors

```scss
// Primary palette
--color-primary: #FF6B35;     // Maker Orange
--color-secondary: #2D9CDB;   // Blueprint Blue
--color-tertiary: #B87333;    // Industrial Copper

// Backgrounds (Dark mode)
--color-bg-primary: #0D0D0D;
--color-bg-secondary: #1A1A1A;
--color-bg-tertiary: #262626;
```

### Typography

```scss
--font-display: 'JetBrains Mono';  // Headings
--font-body: 'Inter';              // Body text
```

### Spacing Scale

```scss
--space-1: 0.25rem;   // 4px
--space-2: 0.5rem;    // 8px
--space-4: 1rem;      // 16px
--space-6: 1.5rem;    // 24px
--space-8: 2rem;      // 32px
```

## Testing Strategy

### Unit Tests

Located alongside source files with `.spec.ts` extension:

```typescript
// stores/projects.spec.ts
import { describe, it, expect } from 'vitest'
import { useProjectsStore } from './projects'

describe('Projects Store', () => {
  it('initializes with an empty list', () => {
    const store = useProjectsStore()
    expect(store.projects.length).toBe(0)
  })
})
```

### Running Tests

```bash
# Run all tests
pnpm --filter @synthstack/web test

# Watch mode
pnpm --filter @synthstack/web test:watch
```

## SEO Considerations

- All public pages include meta descriptions
- Dynamic `<title>` tags via `useSeo` composable
- Open Graph and Twitter Card meta tags
- JSON-LD structured data for rich snippets
- Semantic HTML structure

## Performance Optimizations

1. **Code Splitting**: Routes are lazy-loaded
2. **Tree Shaking**: Only used Quasar components are bundled
3. **Image Optimization**: SVG icons, WebP images where appropriate
4. **CSS Variables**: Efficient theme switching
5. **Debouncing**: Search inputs and API calls are debounced

## Accessibility (a11y)

- Focus-visible outlines on all interactive elements
- Skip link for keyboard navigation
- ARIA labels on icon-only buttons
- Color contrast ratios meet WCAG AA
- Reduced motion support via `prefers-reduced-motion`

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and contribution guidelines.




