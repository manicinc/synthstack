# SynthStack CRM & Business Management - Complete Feature Set

This document outlines the complete business management system integrated into SynthStack's Directus backend, including CRM, projects, invoicing, proposals, and client portal features.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Phase 1: Database Schema](#phase-1-database-schema)
- [Phase 2: Auth Provider Abstraction](#phase-2-auth-provider-abstraction)
- [Phase 3: API Gateway Routes](#phase-3-api-gateway-routes)
- [Phase 4: Frontend Components](#phase-4-frontend-components)
- [Phase 5: Backend Improvements](#phase-5-backend-improvements)
- [Phase 6: UI/UX Enhancements](#phase-6-uiux-enhancements)
- [Mobile Optimization](#mobile-optimization)
- [SEO Implementation](#seo-implementation)
- [Usage Guide](#usage-guide)

## Overview

SynthStack's business management system brings comprehensive features for running an agency or service business:

- **CRM & Sales**: Deal pipeline, contact management, activity tracking
- **Client Projects**: Project management, tasks, templates, client portal visibility
- **Billing & Invoicing**: Automated invoice calculations, payment tracking, expense management
- **Proposals & Quotes**: Content blocks, e-signatures, version control
- **Client Portal**: Project visibility, task tracking, file management, messaging
- **Help Center**: Documentation, search, feedback system
- **Flexible Auth**: Supabase, Local PostgreSQL, or Directus with feature flags

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Vue 3 + Quasar)            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Client Portal│  │  Proposals   │  │     CRM      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│               API Gateway (Fastify)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Validation  │  │Rate Limiting │  │ Error Handler │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
│  ┌─────────────────────────────────────────────────┐    │
│  │          Auth Provider Abstraction              │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │    │
│  │  │ Supabase │  │  Local   │  │ Directus │      │    │
│  │  └──────────┘  └──────────┘  └──────────┘      │    │
│  └─────────────────────────────────────────────────┘    │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│              PostgreSQL + Directus 11.x                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Schema: projects, proposals, invoices, CRM      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Phase 1: Database Schema

### Migrations Created (071-080)

All migrations located in: `services/directus/migrations/`

#### 071_agencyos_foundation.sql
- Foundation lookup tables (deal stages, payment terms, tax rates, email templates)
- Default data for each table
- PostgreSQL UUID primary keys
- Status and sort fields

#### 072_agencyos_extend_core.sql
- Extends existing `organizations` table with branding, billing, payment terms
- Extends existing `contacts` table with notes and status
- Creates `organizations_contacts` M2M junction table
- Preserves all existing data

#### 073_agencyos_projects.sql
- Client service projects (`os_projects`)
- Project tasks (`os_tasks`) with client visibility flag
- Project templates (`os_project_templates`)
- Junction tables for contacts and files
- JSONB billing configuration

#### 074_agencyos_invoicing.sql
- **DEPRECATED/REMOVED** legacy billing tables (`os_*`)
- Canonical billing is handled by:
  - `invoices`, `invoice_items`, `payments`, `payment_sessions`, `items`, `tax_rates`, `expenses`
- Legacy `os_*` invoicing tables are dropped by `services/directus/migrations/132_drop_agencyos_invoicing.sql`

#### 075_agencyos_proposals.sql
- Deals (`os_deals`) with pipeline stages
- Proposals (`os_proposals`) with content blocks
- Proposal approvals (`os_proposal_approvals`) for e-signatures
- Activities (`os_activities`) for CRM tracking
- Subscriptions (`os_subscriptions`)
- Multiple M2M junction tables

#### 076_agencyos_help.sql
- Help collections (`help_collections`) for categorization
- Help articles (`help_articles`) with Markdown content
- Help feedback (`help_feedback`) for ratings
- Inbox (`inbox`) for form submissions

#### 077_agencyos_blocks.sql
- 15+ content block types (hero, CTA, FAQ, gallery, etc.)
- Supports both pages and proposals
- Hidden junction tables for complex blocks
- JSONB configuration fields

#### 078_agencyos_flows.sql
- **DEPRECATED/REMOVED** automation for legacy `os_*` invoicing tables
- Canonical invoice automation is provided by:
  - `services/directus/migrations/135_invoice_automation_triggers.sql`
  - (Optional) Directus flow scripts in `services/directus/extensions/flows/`

#### 079_agencyos_metadata.sql
- Collection icons, colors, and notes
- Display templates for better UX
- Archive field configuration
- Sort orders within groups

#### 080_fix_groups_rename.sql
- Creates collection groups with `synthstack_` prefix
- Organizes collections into 14 logical groups
- Fixes naming conflicts with existing collections
- Makes groups visible in sidebar

## Phase 2: Auth Provider Abstraction

### Backend Auth Service

Files:
- `packages/api-gateway/src/services/auth/types.ts` - Auth types and interfaces
- `packages/api-gateway/src/services/auth/index.ts` - AuthService factory
- `packages/api-gateway/src/services/auth/providers/supabase.ts` - Supabase provider
- `packages/api-gateway/src/services/auth/providers/local.ts` - Local PostgreSQL provider

Features:
- Runtime provider switching via feature flags
- Unified IAuthProvider interface
- Argon2id password hashing
- JWT with refresh tokens
- Account lockout after failed attempts
- Session management

### Frontend Auth Service

Files:
- `apps/web/src/services/auth.ts` - Frontend auth service
- `apps/web/src/stores/auth.ts` - Pinia auth store

Features:
- Provider-agnostic auth API
- Token management
- Automatic refresh
- Persistent sessions

## Phase 3: API Gateway Routes

All routes in: `packages/api-gateway/src/routes/`

### Auth Routes (`auth.ts`)
- `POST /auth/login` - Login with email/password
- `POST /auth/register` - Register new user
- `POST /auth/logout` - Logout
- `POST /auth/refresh` - Refresh access token
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token
- `POST /auth/change-password` - Change password (authenticated)

### Client Portal Routes (`client-portal.ts`)
- `GET /portal/dashboard` - Dashboard stats and activity
- `GET /portal/projects` - List client projects
- `GET /portal/projects/:id` - Project details
- `GET /portal/projects/:id/tasks` - Project tasks
- `GET /portal/projects/:id/files` - Project files
- `POST /portal/files/upload` - Upload file
- `GET /portal/invoices` - List invoices
- `GET /portal/invoices/:id` - Invoice details
- `GET /portal/conversations` - List conversations
- `GET /portal/conversations/:id/messages` - Conversation messages
- `POST /portal/conversations/:id/messages` - Send message
- `GET /portal/account` - Account info
- `PUT /portal/account` - Update account

### Proposals Routes (`proposals.ts`)
- `GET /proposals` - List proposals
- `POST /proposals` - Create proposal
- `GET /proposals/:id` - Proposal details
- `PUT /proposals/:id` - Update proposal
- `DELETE /proposals/:id` - Delete proposal
- `POST /proposals/:id/blocks` - Add content block
- `PUT /proposals/:id/blocks/:blockId` - Update block
- `DELETE /proposals/:id/blocks/:blockId` - Remove block
- `POST /proposals/:id/sign` - E-sign proposal
- `POST /proposals/:id/send` - Send to client
- `GET /proposals/:id/pdf` - Download PDF

### Activities Routes (`activities.ts`)
- `GET /activities` - List activities
- `POST /activities` - Create activity
- `GET /activities/:id` - Activity details
- `PUT /activities/:id` - Update activity
- `DELETE /activities/:id` - Delete activity
- `GET /contacts/:id/activities` - Contact activity timeline
- `GET /projects/:id/activities` - Project activity timeline

### Help Center Routes (`help.ts`)
- `GET /help/collections` - Help collections
- `GET /help/collections/:id/articles` - Articles in collection
- `GET /help/articles/:id` - Article details
- `GET /help/search` - Search articles
- `POST /help/feedback` - Submit feedback

### i18n Routes (`i18n.ts`)
- `GET /i18n/locales` - Available locales
- `GET /i18n/translations/:locale` - Translations for locale
- `POST /i18n/translations` - Add translation

### SERP Tracking Routes (`serp.ts`)
- `GET /serp/keywords` - Tracked keywords
- `POST /serp/keywords` - Add keyword
- `GET /serp/rankings/:keywordId` - Ranking history
- `POST /serp/check` - Manual SERP check

## Phase 4: Frontend Components

All components in: `apps/web/src/`

### Layouts

#### PortalLayout.vue (`layouts/PortalLayout.vue`)
- Sidebar navigation
- User menu
- Notification bell
- Responsive mobile drawer

### Pages

#### Portal Pages (`pages/portal/`)
- **PortalDashboard.vue** - Stats cards, project list, activity feed
- **PortalProjects.vue** - Projects grid with progress indicators
- **PortalProject.vue** - Project detail with tabs (overview, tasks, files)
- **PortalInvoices.vue** - Invoice list with filters and payment actions
- **PortalConversations.vue** - Real-time messaging interface
- **PortalAccount.vue** - Profile, password, notification preferences

#### Proposal Pages (`pages/portal/`)
- **ProposalView.vue** - Full proposal viewer with:
  - Cover image section
  - Metadata display
  - Content blocks rendering
  - E-signature pad
  - PDF download

### Content Blocks (`components/blocks/`)

- **TextBlock.vue** - Rich text with headings
- **ImageBlock.vue** - Images with captions and alignment
- **PricingTableBlock.vue** - Line items, subtotals, tax calculations
- **TimelineBlock.vue** - Project milestones and deliverables
- **TeamBlock.vue** - Team member cards
- **TestimonialBlock.vue** - Client testimonials with ratings

### Composables (`composables/`)

- **usePortal.ts** - Portal API operations
- **useProposals.ts** - Proposals API operations
- **useSEO.ts** - SEO meta tag management (existing, enhanced)
- **useElectron.ts** - Electron-specific features
- **useNativeFeatures.ts** - Native mobile features
- **usePlatform.ts** - Platform detection
- **useSerpTracking.ts** - SERP tracking functionality

## Phase 5: Backend Improvements

### Validation Middleware (`middleware/validation.ts`)

Features:
- Zod schema validation
- Request body, query, and params validation
- Detailed error messages
- Common validation schemas
- Type-safe validation

Example:
```typescript
// In your route
fastify.post('/proposals', {
  preHandler: validateBody(proposalSchemas.create)
}, async (request, reply) => {
  // request.body is now type-safe and validated
});
```

Schemas available:
- `commonSchemas`: uuid, email, pagination, dateRange
- `authSchemas`: login, register, resetPassword, changePassword
- `portalSchemas`: sendMessage, updateProfile
- `proposalSchemas`: create, update, sign, addBlock
- `activitySchemas`: create, update

### Error Handling (`middleware/error-handler.ts`)

Custom error classes:
- `AppError` - Base error class
- `NotFoundError` - 404 errors
- `UnauthorizedError` - 401 errors
- `ForbiddenError` - 403 errors
- `ValidationError` - 400 validation errors
- `ConflictError` - 409 conflict errors
- `RateLimitError` - 429 rate limit errors

Features:
- Standardized error responses
- PostgreSQL error mapping
- Detailed logging
- Request ID tracking
- Production/development mode handling

Example:
```typescript
import { NotFoundError, asyncHandler } from './middleware/error-handler';

fastify.get('/projects/:id', asyncHandler(async (request, reply) => {
  const project = await getProject(request.params.id);

  if (!project) {
    throw new NotFoundError('Project', request.params.id);
  }

  return project;
}));
```

### Rate Limiting (`middleware/rate-limit.ts`)

Features:
- Configurable time windows
- Per-IP or per-user limits
- Custom key generators
- Rate limit headers
- Graceful degradation

Presets:
- `auth`: 5 requests per 15 minutes
- `api`: 60 requests per minute
- `read`: 100 requests per minute
- `write`: 30 requests per minute
- `sensitive`: 10 requests per hour

Example:
```typescript
import { rateLimit, rateLimitPresets, byUserId } from './middleware/rate-limit';

// Apply to route
fastify.post('/auth/login', {
  preHandler: rateLimit(rateLimitPresets.auth)
}, loginHandler);

// Custom rate limit
fastify.post('/proposals', {
  preHandler: rateLimit({
    windowMs: 60000,
    maxRequests: 10,
    keyGenerator: byUserId
  })
}, createProposalHandler);
```

### OpenAPI/Swagger Documentation (`config/swagger.ts`)

Features:
- Complete API documentation
- Interactive API explorer at `/docs`
- Try it out functionality
- Authentication support
- Schema definitions
- Request/response examples

Access: Navigate to `http://localhost:3001/docs`

## Phase 6: UI/UX Enhancements

### Reusable Components (`components/ui/`)

#### FileUpload.vue
Features:
- Drag and drop
- Multiple file support
- Image preview
- File type icons
- Upload progress
- File size validation
- Auto-upload capability

Usage:
```vue
<FileUpload
  label="Upload files"
  accept="image/*,.pdf"
  :multiple="true"
  :max-file-size="10485760"
  upload-url="/api/portal/files/upload"
  @uploaded="handleUploaded"
/>
```

#### DateRangePicker.vue
Features:
- Single date or range selection
- Quick presets (today, last 7 days, etc.)
- Min/max date constraints
- Custom date formatting
- Dual calendar view

Usage:
```vue
<DateRangePicker
  v-model="dateRange"
  label="Select date range"
  :show-presets="true"
/>
```

#### Breadcrumbs.vue
Features:
- Auto-generation from route
- Manual breadcrumb items
- Icon support
- Clickable navigation
- UUID segment filtering

Usage:
```vue
<Breadcrumbs
  :items="[
    { label: 'Home', icon: 'home', to: '/' },
    { label: 'Projects', to: '/portal/projects' },
    { label: 'Project Name' }
  ]"
/>
```

#### LanguageSwitcher.vue (existing)
- Multi-language support
- Persistent selection
- Flag icons
- Smooth transitions

## Mobile Optimization

### Responsive Design
- Quasar's built-in breakpoint system
- Mobile-first components
- Touch-friendly interactions
- Adaptive navigation

### Platform Detection
```typescript
import { usePlatform } from 'src/composables/usePlatform';

const { isElectron, isCapacitor, isMobile, isDesktop } = usePlatform();
```

### Capacitor Integration
- iOS and Android builds
- Native features access
- Push notifications ready
- Camera and file access

### Electron Integration
- Custom title bar
- Native menus
- Window management
- Desktop-specific features

## SEO Implementation

### Meta Tags Management

Using `useSEO` composable:

```typescript
import { useSEO } from 'src/composables/useSEO';

const { setMeta } = useSEO({
  title: 'Client Portal',
  description: 'Manage your projects and invoices',
  keywords: 'project management, invoicing, client portal',
  image: '/og-image.png',
  type: 'website'
});
```

### Features
- Dynamic meta tags
- Open Graph support
- Twitter Cards
- Canonical URLs
- Schema.org structured data
- Breadcrumb schema
- Article/Product schemas

### Structured Data

```typescript
import { useStructuredData, structuredDataTemplates } from 'src/composables/useSEO';

useStructuredData(structuredDataTemplates.organization({
  name: 'SynthStack',
  url: 'https://synthstack.app',
  logo: 'https://synthstack.app/logo.png',
  description: 'AI-native agency platform'
}));
```

## Usage Guide

### Starting the Development Environment

1. **Start Database & Directus:**
```bash
cd services/directus
docker-compose up -d
```

2. **Run Migrations:**
```bash
psql -h localhost -U postgres -d synthstack -f migrations/058_translations.sql
# ... run all migrations 058-070
```

3. **Start API Gateway:**
```bash
cd packages/api-gateway
pnpm install
pnpm dev
```

4. **Start Frontend:**
```bash
cd apps/web
pnpm install
pnpm dev
```

### Environment Variables

#### API Gateway (`.env`)
```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/synthstack

# Auth Provider
AUTH_PROVIDER=local  # or 'supabase' or 'directus'

# Supabase (if using)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=development
```

#### Frontend (`.env`)
```env
# API
VITE_API_URL=http://localhost:3001

# Feature Flags
VITE_AUTH_PROVIDER=local
VITE_ENABLE_PORTAL=true
VITE_ENABLE_PROPOSALS=true
VITE_ENABLE_CRM=true
```

### API Testing

Access Swagger UI: `http://localhost:3001/docs`

Example API calls:

```bash
# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Get projects (authenticated)
curl -X GET http://localhost:3001/portal/projects \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create proposal
curl -X POST http://localhost:3001/proposals \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Website Redesign Proposal",
    "client_id": "uuid",
    "total_value": 15000,
    "proposal_date": "2024-01-15",
    "valid_until": "2024-02-15"
  }'
```

### Frontend Routes

- `/portal` - Client portal dashboard
- `/portal/projects` - Projects list
- `/portal/projects/:id` - Project details
- `/portal/invoices` - Invoices
- `/portal/conversations` - Messages
- `/portal/account` - Account settings
- `/portal/proposals/:id` - View proposal

### Testing E-Signatures

1. Navigate to a proposal: `/portal/proposals/[id]`
2. Scroll to signature section
3. Draw signature on canvas
4. Click "Sign Proposal"
5. Proposal status updates to "accepted"

## Performance Optimizations

- **API Gateway**: Fastify for high-performance routing
- **Database**: Indexed foreign keys and frequently queried fields
- **Frontend**: Vue 3 Composition API with lazy loading
- **Images**: Optimized with Quasar's QImg component
- **Caching**: HTTP caching headers on static assets
- **Bundle**: Code splitting per route

## Security Features

- **Authentication**: JWT with refresh tokens
- **Password Hashing**: Argon2id algorithm
- **Rate Limiting**: Prevent brute force attacks
- **Input Validation**: Zod schema validation
- **SQL Injection**: Parameterized queries
- **XSS Protection**: Vue's built-in escaping
- **CSRF**: Token-based protection
- **Account Lockout**: After failed login attempts

## Next Steps

### Phase 5: Directus Extensions (Planned)
- Visual proposal editor
- Workflow automation
- Custom field types
- Advanced permissions

### Future Enhancements
- Real-time notifications via WebSockets
- Advanced analytics dashboard
- Mobile app with Capacitor
- Desktop app with Electron
- AI-powered insights
- Automated proposal generation
- Time tracking integration
- Payment gateway integration

## Support

For issues or questions:
- Documentation: `/docs`
- API Docs: `/docs` (Swagger UI)
- GitHub: [manicinc/synthstack](https://github.com/manicinc/synthstack/issues)

## License

See [LICENSE](../../LICENSE) (MIT) and [COMMERCIAL-LICENSE.md](../../COMMERCIAL-LICENSE.md) (Pro terms) for details.
