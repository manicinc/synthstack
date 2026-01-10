# SynthStack Theme System

A comprehensive theming architecture that supports multiple aesthetic presets with independent light/dark mode control.

## Overview

The SynthStack theme system separates **visual style** (theme preset) from **color mode** (light/dark), giving users full control over their experience:

- **10 Built-in Theme Presets** - From minimal to cyberpunk
- **Independent Light/Dark Toggle** - Each preset has both variants
- **Real-time Preview** - See changes instantly
- **Premium Themes** - Exclusive aesthetics for paid tiers
- **Custom CSS Support** - Special effects per preset

```
┌─────────────────────────────────────────────────────────┐
│                    Theme Selection                       │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   │
│  │  ☀️ Light   │   │  🌙 Dark    │   │  💻 System  │   │
│  └─────────────┘   └─────────────┘   └─────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Theme Presets                                       ││
│  │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   ││
│  │ │SynthStack│ │ Minimal │ │Brutalist│ │ Oceanic │   ││
│  │ │ ■ ■ ■   │ │ ■ ■ ■   │ │ ■ ■ ■   │ │ ■ ■ ■   │   ││
│  │ └─────────┘ └─────────┘ └─────────┘ └─────────┘   ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

## Available Theme Presets

| Preset | Description | Style | Premium |
|--------|-------------|-------|---------|
| **SynthStack** | Modern tech aesthetic | Rounded, subtle shadows | ✗ |
| **Minimal** | Clean, airy whitespace | Very rounded, minimal shadows | ✗ |
| **Brutalist** | Raw, bold, high contrast | No radius, hard shadows | ✗ |
| **Oceanic** | Calm blues and teals | Soft shadows, medium radius | ✗ |
| **Cyberpunk** | Neon on dark, futuristic | Sharp corners, glow effects | ✓ |
| **Terminal** | Retro hacker aesthetic | Monospace, scanlines | ✗ |
| **Warm Sepia** | Paper-like, cozy | Soft edges, warm tones | ✗ |
| **Forest** | Natural greens | Organic shapes, earth tones | ✗ |
| **Sunset** | Warm gradients | Gradient accents | ✓ |
| **Neumorphic** | Soft UI, embossed | Inset/outset shadows | ✓ |

## Quick Start

### Using the Theme Switcher

```vue
<template>
  <ThemeSwitcher
    :show-preset-selector="true"
    :show-categories="true"
    @upgrade="handleUpgrade"
  />
</template>

<script setup>
import ThemeSwitcher from '@/components/ui/ThemeSwitcher.vue'
</script>
```

### Programmatic Control

```typescript
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

// Switch preset (keeps current light/dark mode)
themeStore.setPreset('cyberpunk')

// Toggle light/dark mode (keeps current preset)
themeStore.toggleDarkMode()

// Set specific mode
themeStore.setColorMode('light')  // 'light' | 'dark' | 'system'

// Get current state
console.log(themeStore.currentPresetSlug)  // 'cyberpunk'
console.log(themeStore.isDark)              // true/false
console.log(themeStore.currentPreset)       // Full preset object
```

## Architecture

### Key Principle

**Light/Dark mode is a modifier on top of the selected theme preset.** Each preset defines BOTH its light and dark variants. The mode toggle simply switches which variant is active.

```
User Selection          Theme Engine              Output
─────────────          ─────────────            ────────
                       ┌─────────────┐
Preset: "oceanic" ────►│             │
                       │  Generate   │──────► CSS Variables
Mode: "dark" ─────────►│  Variables  │──────► Body Classes
                       │             │──────► Custom CSS
                       └─────────────┘
```

### Data Flow

1. **User selects preset** → Updates `currentPresetSlug`
2. **User toggles mode** → Updates `colorMode` (independent!)
3. **Store resolves** → Combines preset + mode
4. **CSS generated** → Variables applied to `:root`
5. **Custom CSS** → Preset-specific effects injected

### Storage

- **Code Presets**: Defined in `themePresets.ts` (always available)
- **Database Presets**: Stored in Directus `themes` table
- **User Preferences**: Saved to `localStorage`

```typescript
// localStorage format
{
  "presetSlug": "oceanic",
  "colorMode": "dark"
}
```

## Theme Preset Structure

Each preset defines a complete design system:

```typescript
interface ThemePreset {
  // Identity
  id: string
  slug: string
  name: string
  description: string
  category: 'modern' | 'bold' | 'nature' | 'retro' | 'classic' | 'warm'
  isPremium: boolean

  // Mode-specific colors
  light: ThemeModeColors
  dark: ThemeModeColors

  // Shared accent colors
  colors: {
    primary: string
    secondary: string
    accent: string
    success: string
    warning: string
    error: string
    info: string
  }

  // Typography
  typography: {
    fontSans: string
    fontMono: string
    fontDisplay: string
    fontSizeBase: string
  }

  // Style characteristics
  style: {
    borderRadius: { sm, md, lg, xl, full }
    glassOpacity: number
    blur: { sm, md, lg }
  }

  // Transitions
  transitions: {
    fast: string
    normal: string
    slow: string
    easing: string
  }

  // Optional custom CSS
  customCSS?: {
    light?: string
    dark?: string
  }
}
```

## CSS Variables

The theme system generates these CSS variables:

### Background & Surface

```css
--bg-base        /* Main background */
--bg-subtle      /* Slightly elevated */
--bg-muted       /* Cards, inputs */
--bg-elevated    /* Modals, dropdowns */
```

### Text

```css
--text-primary   /* Main text */
--text-secondary /* Secondary text */
--text-tertiary  /* Muted text */
```

### Colors

```css
--color-primary       --color-primary-hover
--color-secondary     --color-secondary-hover
--color-accent        --color-accent-hover
--color-success       --color-warning
--color-error         --color-info
```

### Typography

```css
--font-sans      /* Body text */
--font-mono      /* Code */
--font-display   /* Headings */
--font-size-base /* Base size */
```

### Style

```css
--radius-sm  --radius-md  --radius-lg  --radius-xl  --radius-full
--shadow-sm  --shadow-md  --shadow-lg  --shadow-xl
--blur-sm    --blur-md    --blur-lg
--glass-opacity
```

### Animation

```css
--transition-fast    /* 100-150ms */
--transition-normal  /* 200-300ms */
--transition-slow    /* 350-450ms */
--easing-default
--easing-bounce
```

## Using Theme Variables

### In SCSS

```scss
.my-card {
  background: var(--bg-elevated);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-normal) var(--easing-default);

  &:hover {
    box-shadow: var(--shadow-lg);
  }
}
```

### In Vue Components

```vue
<template>
  <div class="themed-component">
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
  </div>
</template>

<style scoped>
.themed-component {
  background: var(--bg-muted);
  padding: var(--card-padding);
  border-radius: var(--radius-lg);
}

h2 {
  color: var(--color-primary);
  font-family: var(--font-display);
}

p {
  color: var(--text-secondary);
}
</style>
```

## Preset-Specific Styles

Some presets apply special CSS via the `data-preset` attribute:

```scss
/* Brutalist - no animations, hard edges */
[data-preset="brutalist"] {
  * {
    border-radius: 0 !important;
    transition-duration: 0ms !important;
  }
}

/* Terminal - scanlines effect */
[data-preset="terminal"] {
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 255, 0, 0.03) 2px,
      rgba(0, 255, 0, 0.03) 4px
    );
  }
}

/* Cyberpunk - neon glow */
[data-preset="cyberpunk"] {
  .q-btn--primary {
    text-shadow: 0 0 10px currentColor;
    box-shadow: 0 0 20px var(--color-primary);
  }
}
```

## Components

### ThemeSwitcher

Full theme selection UI with mode toggle and preset grid.

```vue
<ThemeSwitcher
  :show-preset-selector="true"   <!-- Show preset grid -->
  :show-categories="true"         <!-- Show category filter -->
  :show-premium-upsell="true"     <!-- Show upgrade prompt -->
  :compact="false"                <!-- Compact card layout -->
  @upgrade="handleUpgrade"
/>
```

### ThemePresetCard

Individual preset preview card.

```vue
<ThemePresetCard
  :preset="preset"
  :is-active="isCurrentPreset"
  @select="handleSelect"
/>
```

### ModeToggle

Simple light/dark toggle button.

```vue
<ModeToggle />
```

## Account Settings Integration

The theme system is integrated into the Account Settings page under the "Appearance" tab:

- **Mode Toggle** - Light/Dark/System selector
- **Preset Grid** - Visual theme selection with previews
- **Category Filter** - Filter by Modern, Bold, Nature, etc.
- **Live Preview** - See current theme in mini preview card
- **Accessibility Options** - Reduce motion, high contrast, compact mode

## Creating Custom Themes

### Via Directus Admin

1. Go to **Content → Themes**
2. Click **Create Item**
3. Fill in all color fields for light and dark modes
4. Set `status` to `published`
5. Theme appears in selector automatically

### Via Code

Add to `apps/web/src/config/themePresets.ts`:

```typescript
export const myCustomPreset: ThemePreset = {
  id: 'my-custom',
  slug: 'my-custom',
  name: 'My Custom Theme',
  description: 'A custom theme for my brand',
  category: 'modern',
  isDefault: false,
  isPremium: false,

  previewColors: {
    primary: '#FF6B35',
    secondary: '#00D4AA',
    accent: '#8B5CF6',
  },

  light: {
    bg: { base: '#FFFFFF', subtle: '#F8FAFC', muted: '#F1F5F9', elevated: '#FFFFFF' },
    text: { primary: '#0F172A', secondary: '#475569', tertiary: '#94A3B8' },
    border: { default: '#E2E8F0', subtle: '#F1F5F9' },
    shadow: { /* ... */ },
  },

  dark: {
    bg: { base: '#09090B', subtle: '#0F0F12', muted: '#18181B', elevated: '#27272A' },
    text: { primary: '#FAFAFA', secondary: '#A1A1AA', tertiary: '#71717A' },
    border: { default: '#27272A', subtle: '#18181B' },
    shadow: { /* ... */ },
  },

  colors: { /* accent colors */ },
  typography: { /* font settings */ },
  style: { /* border radius, blur */ },
  transitions: { /* timing */ },
  components: { /* padding */ },
}

// Add to registry
export const themePresets = {
  // ...existing presets
  'my-custom': myCustomPreset,
}
```

## API Reference

### useThemeStore

```typescript
const themeStore = useThemeStore()

// State
themeStore.currentPresetSlug    // Current preset slug
themeStore.currentPreset        // Current preset object
themeStore.colorMode            // 'light' | 'dark' | 'system'
themeStore.resolvedMode         // Actual 'light' | 'dark'
themeStore.isDark               // Boolean

// Presets
themeStore.presets              // All code-defined presets
themeStore.availablePresets     // Published presets
themeStore.freePresets          // Non-premium presets
themeStore.premiumPresets       // Premium-only presets

// Actions
themeStore.setPreset(slug)      // Change preset
themeStore.setColorMode(mode)   // Change mode
themeStore.toggleDarkMode()     // Toggle light/dark
themeStore.getPresetsByCategory(category)  // Filter by category
```

## Best Practices

1. **Always use CSS variables** - Never hardcode colors
2. **Test both modes** - Ensure your UI works in light AND dark
3. **Respect user preference** - Use `prefers-color-scheme` via 'system' mode
4. **Use semantic variables** - `--text-primary` not `--color-white`
5. **Test all presets** - Especially Brutalist (no radius) and Terminal (monospace)

## Troubleshooting

### Theme not applying?

```typescript
// Ensure store is initialized
const themeStore = useThemeStore()
await themeStore.initialize()
```

### Variables not updating?

Check that you're using `var()` syntax:
```css
/* ✗ Wrong */
color: --text-primary;

/* ✓ Correct */
color: var(--text-primary);
```

### Preset not found?

```typescript
// Check if preset exists
import { getPresetBySlug } from '@/config/themePresets'
const preset = getPresetBySlug('my-preset')
if (!preset) console.error('Preset not found')
```


