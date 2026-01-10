# SynthStack Web Application

Modern AI-native SaaS boilerplate built with Vue 3, Quasar, and TypeScript.

## 🚀 Quick Links

| Resource | URL | Description |
|----------|-----|-------------|
| **Local Dev** | [http://localhost:3050](http://localhost:3050) | Development server |
| **API Gateway** | [http://localhost:3003](http://localhost:3003) | Backend API |
| **API Docs** | [http://localhost:3003/docs](http://localhost:3003/docs) | Swagger documentation |
| **Directus CMS** | [http://localhost:8099/admin](http://localhost:8099/admin) | Content management |
| **Qdrant Dashboard** | [http://localhost:6333/dashboard](http://localhost:6333/dashboard) | Vector database UI |

## ✨ Features

### 🤖 AI Copilot
**Access the AI Copilot in 3 ways:**

| Method | How to Access | Available When |
|--------|---------------|----------------|
| 🔘 **FAB Button** | Click the robot icon in bottom-right corner | Logged in, on any page |
| ⌨️ **Keyboard** | Press `⌘K` (Mac) or `Ctrl+K` (Windows/Linux) | Logged in, anytime |
| 📱 **Mobile** | Tap floating button (full-screen mode) | Logged in, on any page |

**Copilot Features:**
- 💬 Real-time streaming responses
- 📝 Markdown & code syntax highlighting
- 🎯 RAG-powered context from documentation
- ⚙️ Customizable settings (temperature, tokens, RAG)
- 💾 Persistent conversation history
- 🌓 Dark/light theme support

**[Full Copilot Guide](../../docs/features/COPILOT.md)**

**Demo Credit System:**
- **5 Free Messages** - Guest users get 5 AI copilot messages per session
- **Session-Based** - Credits tracked via localStorage, persist across refreshes
- **Visual Feedback** - Warning banner at 1 credit, modal when depleted
- **24-Hour Cooldown** - After depletion, wait 24 hours or upgrade
- **[Demo Credit System Guide](../../docs/DEMO_CREDIT_SYSTEM.md)**

### 🎨 UI Framework
- **Quasar 2.18+** - Vue 3 component framework
- **Neumorphic Design** - Modern, futuristic aesthetic
- **Dark/Light Modes** - System preference detection
- **Responsive** - Mobile-first design
- **PWA Ready** - Installable web app

### 🔐 Authentication
- **Supabase Auth** - Email, Google, GitHub OAuth
- **JWT Tokens** - Secure session management
- **Protected Routes** - Route guards with auto-redirect
- **Persistent Sessions** - Remember me functionality

### 💳 Billing & Subscriptions
- **Stripe Integration** - One-time and recurring payments
- **Lifetime Licenses** - Maker ($297), Pro ($597), Unlimited ($1,497)
- **Credit System** - Pay-per-use AI features
- **Subscription Tiers** - Free, Maker, Pro plans

### 🎯 Content Management
- **Directus Integration** - Headless CMS
- **Dynamic Pages** - Content-driven routing
- **Blog System** - Articles with SEO metadata
- **Media Library** - Image optimization & CDN

## 📁 Project Structure

```
apps/web/
├── src/
│   ├── boot/                  # App initialization
│   │   ├── supabase.ts       # Auth setup
│   │   └── stripe.ts         # Payment setup
│   ├── components/            # Vue components
│   │   ├── billing/          # Payment components
│   │   ├── copilot/          # AI chat components
│   │   │   ├── ChatInput.vue
│   │   │   ├── ChatMessage.vue
│   │   │   └── CopilotWidget.vue
│   │   ├── forms/            # Input components
│   │   ├── gdpr/             # Cookie consent
│   │   └── layout/           # Header, footer
│   ├── composables/           # Reusable logic
│   │   ├── useApi.ts         # HTTP client
│   │   ├── useCopilot.ts     # AI chat logic
│   │   ├── useToast.ts       # Notifications
│   │   └── index.ts          # Exports
│   ├── layouts/               # Page layouts
│   │   ├── AppLayout.vue     # Main layout (with Copilot)
│   │   ├── LandingLayout.vue # Public pages
│   │   └── AuthLayout.vue    # Login/register
│   ├── pages/                 # Route pages
│   │   ├── app/              # Authenticated pages
│   │   ├── auth/             # Login/register
│   │   ├── examples/         # AI use cases
│   │   └── *.vue             # Public pages
│   ├── router/                # Vue Router
│   │   └── routes.ts         # Route definitions
│   ├── services/              # API services
│   │   ├── api.ts            # Base API client
│   │   └── copilot.ts        # AI endpoints
│   ├── stores/                # Pinia state
│   │   ├── auth.ts           # Authentication
│   │   ├── copilot.ts        # Chat state
│   │   ├── subscription.ts   # Billing state
│   │   └── theme.ts          # UI preferences
│   ├── css/                   # Styles
│   │   ├── app.scss          # Global styles
│   │   ├── theme.scss        # Design tokens
│   │   └── animations.scss   # Keyframes
│   └── i18n/                  # Translations
│       └── en-US.json        # English locale
├── public/                    # Static assets
│   ├── logo/                 # Brand assets
│   └── icons/                # App icons
└── quasar.config.js          # Quasar configuration
```

## 🛠️ Development

### Prerequisites
```bash
node >= 20.0.0
pnpm >= 8.0.0
```

### Install Dependencies
```bash
pnpm install
```

### Environment Variables
Create `.env` in project root:

```env
# API Gateway
VITE_API_URL=http://localhost:3003

# Supabase
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# Stripe (Public Keys Only)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Feature Flags
VITE_ENABLE_COPILOT=true
VITE_ENABLE_BILLING=true
```

### Development Server
```bash
# Start dev server (http://localhost:3050)
pnpm dev

# Start with HTTPS (Quasar CLI flag)
pnpm dev -- --https

# Start with specific port
pnpm dev -- --port 3050
```

### Build
```bash
# Production build
pnpm build

# Build with type checking
pnpm build --mode production

# Preview production build
pnpm preview
```

### Testing
```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test ChatMessage.spec.ts

# Watch mode
pnpm test:watch

# Run E2E tests (requires app running at localhost:9000)
pnpm test:e2e
```

**Test Coverage:**
- ✅ **Unit Tests**: Pinia stores (`demoCredits.spec.ts`)
- ✅ **Component Tests**: Vue components (`CreditsBanner.spec.ts`)
- ✅ **E2E Tests**: Demo credit flow (`demo-copilot-credits.spec.ts`)

### Linting
```bash
# Lint all files
pnpm lint

# Auto-fix issues
pnpm lint:fix

# Type check
pnpm typecheck
```

## 🎨 Styling

### CSS Variables
Theme colors and design tokens:
```scss
// In your components
.my-component {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
```

### Quasar Customization
Edit `quasar.config.js`:
```javascript
css: [
  'app.scss'  // Global styles
],
framework: {
  config: {
    brand: {
      primary: '#2D9CDB',
      secondary: '#00D4AA',
      accent: '#6C63FF'
    }
  }
}
```

## 🔌 API Integration

### Using the API Service
```typescript
import { get, post } from '@/services/api'

// GET request
const data = await get<User>('/api/v1/users/me')

// POST request
const result = await post<Response>('/api/v1/data', {
  key: 'value'
})
```

### Using Copilot API
```typescript
import { copilot } from '@/services/copilot'

// Check health
const health = await copilot.checkHealth()

// Stream chat
for await (const chunk of copilot.streamChat(messages, options)) {
  console.log(chunk) // Token-by-token
}
```

### Using Composables
```typescript
import { useCopilot } from '@/composables'

const {
  sendStreamingMessage,
  loading,
  error
} = useCopilot()

await sendStreamingMessage('Hello AI!')
```

## 📦 Dependencies

### Core
| Package | Version | Purpose |
|---------|---------|---------|
| `vue` | 3.5.13 | Framework |
| `quasar` | 2.17.4 | UI library |
| `pinia` | 2.3.1 | State management |
| `vue-router` | 4.5.0 | Routing |

### AI & Markdown
| Package | Version | Purpose |
|---------|---------|---------|
| `marked` | 17.0.1 | Markdown parser |
| `highlight.js` | 11.11.1 | Code highlighting |
| `dompurify` | 3.3.1 | XSS protection |

### Services
| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | 2.45.0 | Authentication |
| `@stripe/stripe-js` | 4.10.0 | Payments |
| `axios` | 1.7.2 | HTTP client |

## 🚢 Deployment

### Build for Production
```bash
# Create optimized build
pnpm build

# Output directory: dist/spa/
# Deploy contents to CDN/static host
```

### Environment Setup
Production environment variables:
```env
VITE_API_URL=https://api.synthstack.app
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Static Hosting
Compatible with:
- **Vercel** - Automatic deployment from Git
- **Netlify** - Drag & drop or Git integration
- **AWS S3 + CloudFront** - Static hosting + CDN
- **Firebase Hosting** - Google Cloud integration
- **GitHub Pages** - Free hosting for public repos

### Configuration
```bash
# For history mode routing, configure redirects:
# _redirects (Netlify)
/*    /index.html   200

# vercel.json (Vercel)
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

## 🔧 Configuration

### Quasar Config
Key settings in `quasar.config.js`:

```javascript
{
  // App metadata
  APP_NAME: 'SynthStack',

  // Build target
  mode: 'spa', // or 'pwa', 'ssr'

  // Development server
  devServer: {
    port: 3050,
    open: true
  },

  // Build optimization
  build: {
    vueRouterMode: 'history',
    minify: true,
    gzip: true
  }
}
```

## 📚 Learn More

### Documentation
- [Copilot Guide](../../docs/features/COPILOT.md) - AI assistant documentation
- [Demo Credit System](../../docs/DEMO_CREDIT_SYSTEM.md) - Guest user free trial system
- [Client Portal Guide](../../docs/CLIENT_PORTAL_GUIDE.md) - Client portal user documentation
- [API Reference](../../docs/API.md) - Backend endpoints
- [Component Library](../../docs/COMPONENTS.md) - UI components
- [State Management](../../docs/STATE.md) - Pinia stores

### External Resources
- [Vue 3 Docs](https://vuejs.org/)
- [Quasar Docs](https://quasar.dev/)
- [Pinia Docs](https://pinia.vuejs.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Code Standards
- ✅ TypeScript strict mode
- ✅ ESLint configuration
- ✅ Prettier formatting
- ✅ Component composition API
- ✅ Functional composables

## 📄 License

This project is licensed under the **MIT License** (Community Edition) or **Commercial License** (Pro Edition).

See [LICENSE](../../LICENSE) for details.

---

**Built with ❤️ using Vue 3, Quasar, and TypeScript**

**Need help?** Open the AI Copilot with `⌘K` and ask anything!
