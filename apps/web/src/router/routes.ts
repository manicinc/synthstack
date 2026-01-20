/**
 * SynthStack Route Definitions
 *
 * Comprehensive route configuration for the SynthStack application.
 * Routes are organized into:
 * - Public pages (landing, about, contact, etc.)
 * - SEO pages (guides, documentation)
 * - Auth pages (login, register, password reset)
 * - App pages (Copilot Hub, Projects, authenticated user area)
 *
 * Build modes:
 * - 'full': Web builds include landing pages and marketing content
 * - 'app': Mobile/Desktop builds only include authenticated app routes
 *
 * @module routes
 */
import type { RouteRecordRaw } from 'vue-router';
import { wrapWithLocale, wrapWithNonEnglishLocale, getShortLocale, isValidLocalePrefix } from './locale-routes';
import { DEFAULT_LOCALE } from '@/i18n';
import { FEATURES } from '@/config/features';

// App mode: 'full' for web (with landing pages), 'app' for mobile/desktop (app-only)
const APP_MODE = process.env.APP_MODE || 'full';
const isAppOnlyMode = APP_MODE === 'app';

// =========================================
// Landing/Marketing Pages (Web only)
// =========================================
const landingRoutes: RouteRecordRaw[] = [
  // =========================================
  // Public Pages (Landing Layout)
  // =========================================
  {
    path: '/',
    component: () => import('layouts/LandingLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('pages/LandingPage.vue'),
        meta: {
          title: 'Your Agency in a Box',
          description: 'AI-native, cross-platform SaaS boilerplate. Build for web, iOS, Android, desktop, and PWA from a single codebase.'
        }
      },
      {
        path: 'pricing',
        name: 'pricing',
        component: () => import('pages/PricingPage.vue'),
        meta: {
          title: 'Pricing',
          description: 'Choose the perfect plan for your business. Start free, upgrade anytime.'
        }
      },
      {
        path: 'features',
        name: 'features',
        component: () => import('pages/FeaturesPage.vue'),
        meta: {
          title: 'Features',
          description: 'Explore all SynthStack features including AI copilots, project management, and cross-platform development.'
        }
      },
      {
        path: 'about',
        name: 'about',
        component: () => import('pages/AboutPage.vue'),
        meta: {
          title: 'About Us',
          description: 'Learn about the team behind SynthStack and our mission to accelerate software development.'
        }
      },
      {
        path: 'contact',
        name: 'contact',
        component: () => import('pages/ContactPage.vue'),
        meta: {
          title: 'Contact',
          description: 'Get in touch with the SynthStack team. We\'re here to help with questions and feedback.'
        }
      },
      {
        path: 'license-access',
        name: 'license-access',
        component: () => import('pages/LicenseAccess.vue'),
        meta: {
          title: 'License Access',
          description: 'Submit your GitHub username to access the SynthStack Pro repository.'
        }
      },
      {
        path: 'blog',
        name: 'blog',
        component: () => import('pages/BlogPage.vue'),
        meta: {
          title: 'Blog',
          description: 'Tips, tutorials, and news from the SynthStack team.'
        }
      },
      {
        path: 'blog/:slug',
        name: 'blog-post',
        component: () => import('pages/BlogPostPage.vue'),
        meta: {
          title: 'Blog Post',
          description: ''
        }
      },
      {
        path: 'privacy',
        name: 'privacy',
        component: () => import('pages/PrivacyPage.vue'),
        meta: { 
          title: 'Privacy Policy',
          description: 'Learn how SynthStack collects, uses, and protects your data.'
        }
      },
      {
        path: 'terms',
        name: 'terms',
        component: () => import('pages/TermsPage.vue'),
        meta: { 
          title: 'Terms of Service',
          description: 'SynthStack terms of service and usage conditions.'
        }
      },
      {
        path: 'cookies',
        name: 'cookies',
        component: () => import('pages/CookiesPage.vue'),
        meta: { 
          title: 'Cookie Policy',
          description: 'Learn about how SynthStack uses cookies and manage your preferences.'
        }
      },
      {
        path: 'gdpr',
        name: 'gdpr',
        component: () => import('pages/GDPRPage.vue'),
        meta: { 
          title: 'GDPR Compliance',
          description: 'Your data protection rights under EU law. Learn how SynthStack complies with GDPR.'
        }
      },
      {
        path: 'security',
        name: 'security',
        component: () => import('pages/SecurityPage.vue'),
        meta: { 
          title: 'Security Policy',
          description: 'Learn about SynthStack security practices, data protection, encryption standards, and compliance.'
        }
      },
      {
        path: 'faq',
        name: 'faq',
        component: () => import('pages/FAQPage.vue'),
        meta: {
          title: 'FAQ',
          description: 'Frequently asked questions about SynthStack.'
        }
      },
      {
        path: 'docs',
        name: 'docs',
        component: () => import('pages/DocsPage.vue'),
        meta: {
          title: 'Documentation',
          description: 'SynthStack documentation, guides, and tutorials for developers and users.'
        }
      },
      {
        path: 'docs/visual-editing',
        name: 'docs-visual-editing',
        component: () => import('pages/docs/VisualEditingGuide.vue'),
        meta: {
          title: 'Visual Editing Guide',
          description: 'Learn how to edit content directly on your website with Directus Visual Editor integration.'
        }
      },
      {
        path: 'docs/collaborative-editing',
        name: 'docs-collaborative-editing',
        component: () => import('pages/docs/CollaborativeEditingGuide.vue'),
        meta: {
          title: 'Collaborative Editing Guide',
          description: 'Work together in real-time with smart field locking and conflict-free collaboration.'
        }
      },
      {
        path: 'docs/:slug',
        name: 'doc-page',
        component: () => import('pages/docs/DocViewer.vue'),
        meta: { title: 'Documentation' }
      },
      {
        path: 'setup/branding',
        name: 'setup-branding',
        component: () => import('pages/setup/BrandingWizardPage.vue'),
        meta: {
          title: 'Branding Wizard',
          description: 'Generate a complete config.json for rebranding SynthStack in minutes.'
        }
      },
      {
        path: 'setup/env',
        name: 'setup-env',
        component: () => import('pages/setup/EnvironmentWizardPage.vue'),
        meta: {
          title: 'Environment Setup Wizard',
          description: 'Generate .env files for self-hosting SynthStack using the repo templates.'
        }
      },
      {
        path: 'news',
        name: 'news',
        component: () => import('pages/NewsPage.vue'),
        meta: { 
          title: 'News',
          description: 'Latest news, announcements, and updates from SynthStack.'
        }
      },
      {
        path: 'careers',
        name: 'careers',
        component: () => import('pages/CareersPage.vue'),
        meta: { 
          title: 'Careers',
          description: 'Join the SynthStack team. View open positions and career opportunities.'
        }
      },
      {
        path: 'company',
        name: 'company',
        component: () => import('pages/CompanyPage.vue'),
        meta: {
          title: 'Company',
          description: 'Learn about SynthStack and our mission to accelerate software development.'
        }
      },
      // COMMUNITY: Referral routes removed - not available in Community Edition
    ]
  },

];

// =========================================
// Auth Pages (Always included)
// =========================================
const authRoutes: RouteRecordRaw[] = [
  {
    path: '/auth',
    component: () => import('layouts/AuthLayout.vue'),
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('pages/auth/LoginPage.vue'),
        meta: { title: 'Login' }
      },
      {
        path: 'register',
        name: 'register',
        component: () => import('pages/auth/RegisterPage.vue'),
        meta: { title: 'Sign Up' }
      },
      {
        path: 'forgot-password',
        name: 'forgot-password',
        component: () => import('pages/auth/ForgotPasswordPage.vue'),
        meta: { title: 'Forgot Password' }
      },
      {
        path: 'reset-password',
        name: 'reset-password',
        component: () => import('pages/auth/ResetPasswordPage.vue'),
        meta: { title: 'Reset Password' }
      },
      {
        path: 'verify-email',
        name: 'verify-email',
        component: () => import('pages/auth/VerifyEmailPage.vue'),
        meta: { title: 'Verify Email' }
      }
    ]
  }
];

// =========================================
// App Pages (Always included)
// =========================================
const appRoutes: RouteRecordRaw[] = [
  // Public Catalog
  {
    path: '/catalog',
    component: () => import('layouts/AppLayout.vue'),
    children: [
      {
        path: '',
        name: 'catalog',
        component: () => import('pages/CatalogPage.vue'),
        meta: {
          title: 'Public Catalog',
          description: 'Browse community templates, presets, and reusable integrations.'
        }
      }
    ]
  },
  // Main App Pages
  {
    path: '/app',
    component: () => import('layouts/AppLayout.vue'),
    children: [
      {
        path: '',
        name: 'app',
        // COMMUNITY: Default to dashboard instead of Copilot Hub
        redirect: (to) => {
          const subscribe = to.query.subscribe
          if (typeof subscribe === 'string' && subscribe.trim()) {
            return { name: 'subscription', query: { subscribe, yearly: to.query.yearly } }
          }
          return { name: 'dashboard' }
        }
      },
      {
        path: 'generate',
        name: 'generate',
        component: () => import('pages/app/GeneratePage.vue'),
        meta: { title: 'Generate' }
      },
      {
        path: 'images',
        name: 'image-generation',
        component: () => import('pages/app/ImageGenerationPage.vue'),
        meta: { title: 'Image Generation' }
      },
      {
        path: 'chat',
        name: 'chat',
        component: () => import('pages/app/ChatPage.vue'),
        meta: { title: 'AI Chat' }
      },
      {
        path: 'projects',
        name: 'projects',
        component: () => import('pages/app/ProjectsPage.vue'),
        meta: { title: 'Projects' }
      },
      {
        path: 'projects/new',
        name: 'create-project',
        component: () => import('pages/app/CreateProjectPage.vue'),
        meta: { title: 'Create Project' }
      },
      {
        path: 'projects/:id',
        name: 'project-detail',
        component: () => import('pages/app/ProjectDetailPage.vue'),
        meta: { title: 'Project Details' }
      },
      {
        path: 'onboarding',
        name: 'onboarding',
        component: () => import('pages/app/OnboardingWizard.vue'),
        meta: { title: 'Welcome to SynthStack' }
      },
      {
        path: 'account',
        name: 'account',
        component: () => import('pages/app/AccountPage.vue'),
        meta: { title: 'Account Settings' }
      },
      {
        path: 'subscription',
        name: 'subscription',
        component: () => import('pages/app/SubscriptionPage.vue'),
        meta: { title: 'Subscription' }
      },
      {
        path: 'api-keys',
        name: 'api-keys',
        component: () => import('pages/app/ApiKeysPage.vue'),
        meta: { title: 'API Keys (BYOK)' }
      },
      {
        path: 'integrations',
        name: 'integrations',
        component: () => import('pages/app/settings/IntegrationsPage.vue'),
        meta: { 
          title: 'Integrations',
          description: 'Connect your favorite tools and services to automate workflows.'
        }
      },
      {
        path: 'seo',
        name: 'seo-dashboard',
        component: () => import('pages/app/SEODashboardPage.vue'),
        meta: { title: 'SEO Dashboard' }
      },
      // COMMUNITY: Workflow routes removed - not available in Community Edition
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('pages/app/DashboardPage.vue'),
        meta: { 
          title: 'Dashboard',
          description: 'Overview of your workflows, AI usage, and analytics.'
        }
      },
      // COMMUNITY: Analytics/Copilot and Referral routes removed - not available in Community Edition
    ]
  },
  // Admin Routes (Platform administrators only)
  {
    path: '/admin',
    component: () => import('layouts/AppLayout.vue'),
    meta: { requiresAdmin: true },
    children: [
      {
        path: 'llm-costs',
        name: 'admin-llm-costs',
        component: () => import('pages/admin/LLMCostDashboard.vue'),
        meta: { 
          title: 'LLM Cost Dashboard',
          description: 'Monitor global LLM API costs and usage across all organizations.'
        }
      },
      {
        path: 'llm-costs/orgs',
        name: 'admin-llm-orgs',
        component: () => import('pages/admin/LLMOrgBreakdown.vue'),
        meta: { 
          title: 'Organization LLM Breakdown',
          description: 'LLM usage and costs per organization.'
        }
      },
      {
        path: 'llm-costs/alerts',
        name: 'admin-llm-alerts',
        component: () => import('pages/admin/LLMAlerts.vue'),
        meta: { 
          title: 'LLM Budget Alerts',
          description: 'Configure cost threshold alerts for LLM usage.'
        }
      }
    ]
  }
];

// =========================================
// Client Portal Pages
// =========================================
const portalRoutes: RouteRecordRaw[] = [
  {
    path: '/portal',
    component: () => import('layouts/PortalLayout.vue'),
    children: [
      {
        path: '',
        name: 'portal-dashboard',
        component: () => import('pages/portal/PortalDashboard.vue'),
        meta: { title: 'Portal Dashboard' }
      },
      {
        path: 'projects',
        name: 'portal-projects',
        component: () => import('pages/portal/PortalProjects.vue'),
        meta: { title: 'Projects' }
      },
      {
        path: 'projects/:id',
        name: 'portal-project',
        component: () => import('pages/portal/PortalProject.vue'),
        meta: { title: 'Project Details' }
      },
      {
        path: 'invoices',
        name: 'portal-invoices',
        component: () => import('pages/portal/PortalInvoices.vue'),
        meta: { title: 'Invoices' }
      },
      {
        path: 'conversations',
        name: 'portal-conversations',
        component: () => import('pages/portal/PortalConversations.vue'),
        meta: { title: 'Conversations' }
      },
      {
        path: 'account',
        name: 'portal-account',
        component: () => import('pages/portal/PortalAccount.vue'),
        meta: { title: 'Account Settings' }
      },
      {
        path: 'proposals/:id',
        name: 'portal-proposal',
        component: () => import('pages/portal/ProposalView.vue'),
        meta: { title: 'Proposal' }
      }
    ]
  }
];

// =========================================
// Community Pages (Web only - uses Landing Layout)
// =========================================
const communityRoutes: RouteRecordRaw[] = [
  {
    path: '/community',
    component: () => import('layouts/LandingLayout.vue'),
    children: [
      {
        path: '',
        name: 'community',
        redirect: '/catalog',
        meta: {
          title: 'Community',
          description: 'Browse community templates, presets, and resources.'
        }
      }
    ]
  }
];

// =========================================
// Root and redirect routes
// =========================================

// Redirect /en/* to /* for canonical English URLs
const englishRedirects: RouteRecordRaw[] = [
  {
    path: '/en/:pathMatch(.*)*',
    redirect: (to) => {
      // /en/pricing -> /pricing, /en/ -> /
      const pathAfterLocale = to.params.pathMatch
        ? `/${(to.params.pathMatch as string[]).join('/')}`
        : '/';
      return {
        path: pathAfterLocale,
        query: to.query,
        hash: to.hash
      };
    }
  }
];

// =========================================
// 404 Catch-all routes
// =========================================

// 404 for non-English locale routes
const notFoundRouteLocale: RouteRecordRaw = {
  path: '/:locale(es|fr|de|zh|ja)/:catchAll(.*)*',
  component: () => import('layouts/LandingLayout.vue'),
  children: [
    {
      path: '',
      component: () => import('pages/ErrorNotFound.vue'),
      meta: { title: 'Page Not Found' }
    }
  ]
};

// 404 for English (no locale prefix) - must be last
const notFoundRouteEnglish: RouteRecordRaw = {
  path: '/:catchAll(.*)*',
  component: () => import('layouts/LandingLayout.vue'),
  children: [
    {
      path: '',
      component: () => import('pages/ErrorNotFound.vue'),
      meta: { title: 'Page Not Found' }
    }
  ]
};

// For mobile/desktop: redirect unknown routes to /app
const notFoundRouteApp: RouteRecordRaw = {
  path: '/:locale(en|es|fr|de|zh|ja)/:catchAll(.*)*',
  redirect: (to) => {
    const locale = to.params.locale || getShortLocale(DEFAULT_LOCALE);
    return `/${locale}/app`;
  }
};

// Root redirect for mobile/desktop (no landing page)
const rootRedirectRouteApp: RouteRecordRaw = {
  path: '/:locale(en|es|fr|de|zh|ja)',
  redirect: (to) => {
    const locale = to.params.locale || getShortLocale(DEFAULT_LOCALE);
    return `/${locale}/app`;
  }
};

// =========================================
// Build final routes based on APP_MODE
// =========================================
const routes: RouteRecordRaw[] = isAppOnlyMode
  ? [
      // Mobile/Desktop: App-only routes
      ...wrapWithLocale(authRoutes),
      ...wrapWithLocale(appRoutes),
      ...wrapWithLocale(portalRoutes),
      rootRedirectRouteApp,
      notFoundRouteApp
    ]
  : [
      // Web: Full routes with landing pages
      // English routes at / (no prefix) - default language
      ...landingRoutes,
      ...authRoutes,
      ...appRoutes,
      ...portalRoutes,
      ...communityRoutes,
      // Redirect /en/* to /* for canonical URLs
      ...englishRedirects,
      // Non-English locale routes (es, fr, de, zh, ja)
      ...wrapWithNonEnglishLocale(landingRoutes),
      ...wrapWithNonEnglishLocale(authRoutes),
      ...wrapWithNonEnglishLocale(appRoutes),
      ...wrapWithNonEnglishLocale(portalRoutes),
      ...wrapWithNonEnglishLocale(communityRoutes),
      // 404 routes - locale-specific first, then catch-all
      notFoundRouteLocale,
      notFoundRouteEnglish
    ];

export default routes;
