# SynthStack Design System
## Comprehensive Brand & Visual Guidelines

> **See also:** [Theme System Documentation](./docs/features/THEME_SYSTEM.md) for the complete theme presets implementation.

---

## Theme Presets

SynthStack supports **10 built-in theme presets** with independent light/dark mode control:

| Preset | Style | Premium |
|--------|-------|---------|
| SynthStack | Modern tech, rounded corners | ✗ |
| Minimal | Clean, airy whitespace | ✗ |
| Brutalist | Raw, bold, no radius | ✗ |
| Oceanic | Calm blues and teals | ✗ |
| Cyberpunk | Neon glow effects | ✓ |
| Terminal | Retro hacker, scanlines | ✗ |
| Warm Sepia | Paper-like, cozy | ✗ |
| Forest | Natural greens | ✗ |
| Sunset | Warm gradients | ✓ |
| Neumorphic | Soft UI, embossed | ✓ |

Each preset defines complete light AND dark mode variants. Users can switch presets and toggle light/dark independently.

---

## 1. Brand Identity

### 1.1 Brand Essence

**SynthStack** embodies the spirit of the modern maker movement—where precision engineering meets creative craft. Our visual identity bridges the gap between vintage workshop aesthetics and cutting-edge technology, creating a **retro-futuristic** experience that feels both trustworthy and innovative.

### 1.2 Brand Attributes

| Attribute | Expression |
|-----------|------------|
| **Precise** | Technical typography, grid systems, exact measurements |
| **Robust** | Strong contrasts, bold weights, solid foundations |
| **Crafted** | Attention to detail, quality materials metaphors |
| **Accessible** | Clear hierarchy, intuitive patterns, helpful guidance |
| **Innovative** | Modern interactions, smart defaults, AI-powered |

### 1.3 Brand Voice

- **Confident but not arrogant** — We know our stuff, but we're here to help
- **Technical but approachable** — Precise language without jargon overload
- **Encouraging** — Celebrate successes, guide through failures
- **Concise** — Respect users' time, get to the point

---

## 2. Color System

### 2.1 Base Palette (Monochromatic)

The foundation is a warm-tinted grayscale that evokes workshop environments—concrete floors, metal surfaces, worn wood.

```css
/* Backgrounds */
--color-bg-primary: #0D0D0D;      /* Deep workshop black */
--color-bg-secondary: #1A1A1A;    /* Elevated surfaces */
--color-bg-tertiary: #262626;     /* Cards, inputs */
--color-bg-elevated: #333333;     /* Dropdowns, modals */

/* Surfaces (Light mode) */
--color-surface-light: #F5F3EF;   /* Warm paper white */
--color-surface-medium: #E8E6E1;  /* Subtle depth */
--color-surface-dark: #D4D2CD;    /* Borders, dividers */

/* Text */
--color-text-primary: #F5F3EF;    /* Primary text (dark mode) */
--color-text-secondary: #A3A3A3;  /* Secondary text */
--color-text-muted: #737373;      /* Disabled, hints */
--color-text-inverse: #0D0D0D;    /* Text on light backgrounds */
```

### 2.2 Accent Colors (Bursts of Color)

Strategic color accents that pop against the monochromatic base. Used sparingly for emphasis, actions, and feedback.

```css
/* Primary - Maker Orange */
--color-primary: #FF6B35;         /* Main CTA, key actions */
--color-primary-hover: #FF8555;   /* Hover state */
--color-primary-active: #E55A2B;  /* Active/pressed */
--color-primary-muted: #FF6B3520; /* Backgrounds, badges */

/* Secondary - Blueprint Blue */
--color-secondary: #2D9CDB;       /* Links, secondary actions */
--color-secondary-hover: #4DB0E8;
--color-secondary-active: #2588C2;
--color-secondary-muted: #2D9CDB20;

/* Tertiary - Industrial Copper */
--color-tertiary: #B87333;        /* Accents, icons */
--color-tertiary-hover: #D4894A;
--color-tertiary-active: #9E632C;
```

### 2.3 Semantic Colors

```css
/* Success - Shop Green */
--color-success: #2ECC71;
--color-success-bg: #2ECC7115;
--color-success-border: #2ECC7140;

/* Warning - Caution Yellow */
--color-warning: #F1C40F;
--color-warning-bg: #F1C40F15;
--color-warning-border: #F1C40F40;

/* Error - Safety Red */
--color-error: #E74C3C;
--color-error-bg: #E74C3C15;
--color-error-border: #E74C3C40;

/* Info - Blueprint Blue */
--color-info: #2D9CDB;
--color-info-bg: #2D9CDB15;
--color-info-border: #2D9CDB40;
```

### 2.4 Color Usage Guidelines

| Element | Color | Usage |
|---------|-------|-------|
| Primary CTAs | `--color-primary` | Sign up, Generate, Export |
| Secondary CTAs | `--color-secondary` | Learn more, View details |
| Navigation active | `--color-primary` | Current page indicator |
| Links | `--color-secondary` | Inline text links |
| Icons (decorative) | `--color-tertiary` | Feature icons, illustrations |
| Badges (new) | `--color-primary` | New features, hot items |
| Success states | `--color-success` | Completed, saved, success |
| Warning states | `--color-warning` | Caution, pending review |
| Error states | `--color-error` | Failed, invalid, danger |

---

## 3. Typography

### 3.1 Font Stack

```css
/* Display & Headings - Technical, precise */
--font-display: 'JetBrains Mono', 'SF Mono', 'Consolas', monospace;

/* Body Text - Clean, readable */
--font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Monospace - Code, data, technical values */
--font-mono: 'JetBrains Mono', 'SF Mono', 'Consolas', monospace;
```

### 3.2 Type Scale

```css
/* Display sizes */
--text-display-xl: 4rem;      /* 64px - Hero headlines */
--text-display-lg: 3rem;      /* 48px - Page titles */
--text-display-md: 2.25rem;   /* 36px - Section headers */
--text-display-sm: 1.75rem;   /* 28px - Card titles */

/* Body sizes */
--text-body-xl: 1.25rem;      /* 20px - Lead paragraphs */
--text-body-lg: 1.125rem;     /* 18px - Emphasized body */
--text-body-md: 1rem;         /* 16px - Default body */
--text-body-sm: 0.875rem;     /* 14px - Secondary text */
--text-body-xs: 0.75rem;      /* 12px - Captions, labels */

/* Line heights */
--leading-tight: 1.2;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### 3.3 Type Styles

```css
/* H1 - Page Title */
.text-h1 {
  font-family: var(--font-display);
  font-size: var(--text-display-lg);
  font-weight: 700;
  line-height: var(--leading-tight);
  letter-spacing: -0.02em;
}

/* H2 - Section Header */
.text-h2 {
  font-family: var(--font-display);
  font-size: var(--text-display-md);
  font-weight: 600;
  line-height: var(--leading-tight);
  letter-spacing: -0.01em;
}

/* H3 - Subsection */
.text-h3 {
  font-family: var(--font-display);
  font-size: var(--text-display-sm);
  font-weight: 600;
  line-height: var(--leading-tight);
}

/* Body */
.text-body {
  font-family: var(--font-body);
  font-size: var(--text-body-md);
  font-weight: 400;
  line-height: var(--leading-normal);
}

/* Technical/Data */
.text-mono {
  font-family: var(--font-mono);
  font-size: var(--text-body-sm);
  font-weight: 400;
  line-height: var(--leading-normal);
}
```

---

## 4. Spacing & Layout

### 4.1 Spacing Scale

Based on 4px base unit for precision.

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

### 4.2 Container Widths

```css
--container-xs: 20rem;    /* 320px - Mobile */
--container-sm: 24rem;    /* 384px - Small cards */
--container-md: 28rem;    /* 448px - Medium cards */
--container-lg: 32rem;    /* 512px - Large cards */
--container-xl: 36rem;    /* 576px - Forms */
--container-2xl: 42rem;   /* 672px - Content */
--container-3xl: 48rem;   /* 768px - Wide content */
--container-4xl: 56rem;   /* 896px - Dashboard */
--container-5xl: 64rem;   /* 1024px - Desktop */
--container-6xl: 72rem;   /* 1152px - Wide desktop */
--container-7xl: 80rem;   /* 1280px - Max width */
```

### 4.3 Grid System

12-column grid with 24px gutters.

```css
.container {
  max-width: var(--container-7xl);
  margin: 0 auto;
  padding: 0 var(--space-6);
}

.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-6);
}
```

---

## 5. Components

### 5.1 Buttons

```css
/* Base button */
.btn {
  font-family: var(--font-display);
  font-size: var(--text-body-sm);
  font-weight: 600;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  transition: all 150ms ease;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

/* Primary - Maker Orange */
.btn-primary {
  background: var(--color-primary);
  color: white;
  border: 2px solid var(--color-primary);
}

.btn-primary:hover {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--color-primary-muted);
}

/* Secondary - Outlined */
.btn-secondary {
  background: transparent;
  color: var(--color-text-primary);
  border: 2px solid var(--color-bg-elevated);
}

.btn-secondary:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* Ghost */
.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border: 2px solid transparent;
}

.btn-ghost:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}
```

### 5.2 Cards

```css
.card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-bg-elevated);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  transition: all 200ms ease;
}

.card:hover {
  border-color: var(--color-bg-elevated);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transform: translateY(-2px);
}

.card-elevated {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}
```

### 5.3 Inputs

```css
.input {
  font-family: var(--font-body);
  font-size: var(--text-body-md);
  background: var(--color-bg-tertiary);
  border: 2px solid var(--color-bg-elevated);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  color: var(--color-text-primary);
  transition: all 150ms ease;
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-muted);
}

.input::placeholder {
  color: var(--color-text-muted);
}
```

### 5.4 Border Radius

```css
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-2xl: 24px;
--radius-full: 9999px;
```

---

## 6. Visual Elements

### 6.1 Grid Pattern Background

Subtle blueprint-style grid for backgrounds.

```css
.bg-grid {
  background-image: 
    linear-gradient(rgba(255, 107, 53, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 107, 53, 0.03) 1px, transparent 1px);
  background-size: 24px 24px;
}

.bg-grid-dense {
  background-image: 
    linear-gradient(rgba(255, 107, 53, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 107, 53, 0.05) 1px, transparent 1px);
  background-size: 8px 8px;
}
```

### 6.2 Layer Lines Pattern

3D printing layer aesthetic.

```css
.bg-layers {
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(255, 107, 53, 0.03) 2px,
    rgba(255, 107, 53, 0.03) 4px
  );
}
```

### 6.3 Shadows

Workshop-inspired depth with warm undertones.

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
--shadow-md: 0 4px 8px rgba(0, 0, 0, 0.25);
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.3);
--shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.4);

/* Glow for accent elements */
--shadow-glow-primary: 0 0 20px rgba(255, 107, 53, 0.3);
--shadow-glow-secondary: 0 0 20px rgba(45, 156, 219, 0.3);
```

---

## 7. Iconography

### 7.1 Icon Style

- **Stroke-based** with 1.5-2px weight
- **Rounded caps** for friendly feel
- **Consistent 24x24px** base size
- Use **Lucide Icons** or **Phosphor Icons**

### 7.2 Custom Icons

Create custom icons for:
- 3D printer nozzle
- Layer lines
- STL file type
- Slicer export
- Print profile

---

## 8. Motion & Animation

### 8.1 Timing Functions

```css
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### 8.2 Durations

```css
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 400ms;
--duration-slower: 600ms;
```

### 8.3 Standard Animations

```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up */
@keyframes slideUp {
  from { 
    opacity: 0; 
    transform: translateY(16px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}

/* Scale in */
@keyframes scaleIn {
  from { 
    opacity: 0; 
    transform: scale(0.95); 
  }
  to { 
    opacity: 1; 
    transform: scale(1); 
  }
}

/* Pulse glow */
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 var(--color-primary-muted); }
  50% { box-shadow: 0 0 0 8px transparent; }
}
```

---

## 9. Logo Specifications

### 9.1 Concept

The SynthStack logo combines:
- **Geometric "P"** — Strong, technical, memorable
- **Layer lines** — Horizontal lines through the letterform representing 3D print layers
- **Precision feel** — Clean edges, exact proportions

### 9.2 Construction

```
┌─────────────────────────┐
│  ████████████           │
│  ██        ██           │
│  ██ ══════ ██████       │  ← Layer lines
│  ██        ██   ██      │
│  ██ ══════ ██   ██      │  ← Layer lines  
│  ██        ██████       │
│  ██ ══════               │  ← Layer lines
│  ██                      │
│  ████████████           │
└─────────────────────────┘
```

### 9.3 Usage

| Context | Version |
|---------|---------|
| Header/Nav | Logo mark + wordmark (horizontal) |
| Favicon | Logo mark only (simplified) |
| OG Images | Full logo on brand background |
| Loading | Animated logo mark |
| Footer | Logo mark + wordmark (small) |

### 9.4 Clear Space

Minimum clear space = height of the "P" character on all sides.

### 9.5 Minimum Sizes

- Logo mark only: 24px minimum
- Full logo: 120px minimum width

---

## 10. Dark/Light Mode

### 10.1 Default: Dark Mode

SynthStack defaults to dark mode—it's a workshop at night, focused and productive.

### 10.2 Light Mode Adjustments

```css
[data-theme="light"] {
  --color-bg-primary: #F5F3EF;
  --color-bg-secondary: #FFFFFF;
  --color-bg-tertiary: #F0EDE8;
  --color-bg-elevated: #E8E6E1;
  
  --color-text-primary: #0D0D0D;
  --color-text-secondary: #525252;
  --color-text-muted: #737373;
  
  /* Accent colors stay the same */
}
```

---

## 11. Responsive Breakpoints

```css
--breakpoint-sm: 640px;   /* Mobile landscape */
--breakpoint-md: 768px;   /* Tablet */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Large desktop */
--breakpoint-2xl: 1536px; /* Ultra-wide */
```

---

## 12. Accessibility

### 12.1 Color Contrast

All text meets WCAG 2.1 AA standards:
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- UI components: 3:1 minimum

### 12.2 Focus States

```css
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

### 12.3 Touch Targets

Minimum 44x44px touch targets for all interactive elements.

---

*Design System Version: 1.0 | Created: December 2024*

