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

// Debug: Log feature flags at module load time
console.log('[Routes] Module loaded - APP_MODE:', APP_MODE);
console.log('[Routes] FEATURES.COPILOT:', FEATURES.COPILOT);
console.log('[Routes] FEATURES.REFERRALS:', FEATURES.REFERRALS);

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
          description: 'Frequently asked questions about SynthStack 3D printing profile generator.'
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
          description: 'Learn about SynthStack, the AI-powered 3D printing profile generator company.'
        }
      },
      // COMMUNITY: Referral routes removed - not available in Community Edition

      // =========================================
      // SEO: Guides & Tutorials
      // =========================================
      {
        path: 'guides',
        name: 'guides',
        component: () => import('pages/GuidesPage.vue'),
        meta: { 
          title: '3D Printing Guides & Tutorials',
          description: 'Learn 3D printing with comprehensive guides on slicer settings, filament guides, troubleshooting, and printer calibration.'
        }
      },
      {
        path: 'guides/layer-height-explained',
        name: 'guide-layer-height',
        component: () => import('pages/guides/LayerHeightGuide.vue'),
        meta: { 
          title: 'Layer Height Guide - Choose the Right Resolution',
          description: 'Complete guide to layer height in 3D printing. Learn when to use 0.1mm, 0.2mm, 0.3mm.'
        }
      },
      {
        path: 'guides/retraction-settings-guide',
        name: 'guide-retraction',
        component: () => import('pages/guides/RetractionGuide.vue'),
        meta: { 
          title: 'Retraction Settings Guide - Fix Stringing Forever',
          description: 'Master retraction settings to eliminate stringing and oozing in your 3D prints.'
        }
      },
      {
        path: 'guides/pla-vs-petg-vs-abs',
        name: 'guide-filaments',
        component: () => import('pages/guides/PLAvsABSvsPETG.vue'),
        meta: { 
          title: 'PLA vs PETG vs ABS: Complete Filament Comparison',
          description: 'Compare PLA, PETG, and ABS filaments for strength, temperature, and ease of printing.'
        }
      },
      {
        path: 'guides/:slug',
        name: 'guide-detail',
        component: () => import('pages/GuideDetailPage.vue'),
        meta: { 
          title: 'Guide',
          description: ''
        }
      },

      // =========================================
      // SEO: Slicer-Specific Pages
      // =========================================
      {
        path: 'slicers/cura',
        name: 'slicer-cura',
        component: () => import('pages/slicers/CuraPage.vue'),
        meta: { 
          title: 'Cura Settings Generator',
          description: 'Generate optimized Ultimaker Cura slicer settings with AI. Perfect profiles for PLA, PETG, ABS on any printer.'
        }
      },
      {
        path: 'slicers/prusaslicer',
        name: 'slicer-prusaslicer',
        component: () => import('pages/slicers/PrusaSlicerPage.vue'),
        meta: { 
          title: 'PrusaSlicer Settings Generator',
          description: 'Generate optimized PrusaSlicer settings with AI. Perfect profiles for Prusa MK4, Voron, and compatible printers.'
        }
      },
      {
        path: 'slicers/orcaslicer',
        name: 'slicer-orcaslicer',
        component: () => import('pages/slicers/OrcaSlicerPage.vue'),
        meta: { 
          title: 'OrcaSlicer Settings Generator',
          description: 'Generate optimized OrcaSlicer settings with AI. Perfect profiles for Bambu Lab, Voron, and any Klipper printer.'
        }
      },
      {
        path: 'slicers/bambu-studio',
        name: 'slicer-bambu-studio',
        component: () => import('pages/slicers/BambuStudioPage.vue'),
        meta: { 
          title: 'Bambu Studio Settings Generator',
          description: 'Generate optimized Bambu Studio settings for X1 Carbon, P1P, P1S, and A1 printers.'
        }
      },

      // =========================================
      // SEO: Public Community Profiles
      // =========================================
      {
        path: 'profiles',
        name: 'public-profiles',
        component: () => import('pages/ProfilesPage.vue'),
        meta: { 
          title: 'Community Slicer Profiles',
          description: 'Browse and download community-shared slicer profiles. Find settings for your printer and filament.'
        }
      },
      {
        path: 'profiles/:id',
        name: 'public-profile-detail',
        component: () => import('pages/ProfileDetailPage.vue'),
        meta: { 
          title: 'Profile',
          description: ''
        }
      }
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
          description: 'Browse public AI generations, shared models, and scraped printer/filament data.'
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
        redirect: { name: 'dashboard' }
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
        path: 'profiles',
        name: 'profiles',
        component: () => import('pages/app/ProfilesPage.vue'),
        meta: { title: 'Community Profiles' }
      },
      {
        path: 'profiles/:id',
        name: 'profile-detail',
        component: () => import('pages/app/ProfileDetailPage.vue'),
        meta: { title: 'Profile Details' }
      },
      {
        path: 'my-profiles',
        name: 'my-profiles',
        component: () => import('pages/app/MyProfilesPage.vue'),
        meta: { title: 'My Profiles' }
      },
      {
        path: 'history',
        name: 'history',
        component: () => import('pages/app/HistoryPage.vue'),
        meta: { title: 'Generation History' }
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
        component: () => import('pages/community/CommunityHub.vue'),
        meta: {
          title: 'Community Models - Open Source Art Program',
          description: 'Browse and share community 3D models. Join our Open Source Art Program to earn recognition and tips.'
        }
      },
      {
        path: 'upload',
        name: 'community-upload',
        component: () => import('pages/community/UploadWizard.vue'),
        meta: {
          title: 'Upload Your Model',
          description: 'Share your 3D model with the community. Full copyright and license controls.'
        }
      },
      {
        path: 'models/:id',
        name: 'community-model',
        component: () => import('pages/community/ModelDetailPage.vue'),
        meta: { title: 'Community Model' }
      },
      {
        path: 'creators',
        name: 'community-creators',
        component: () => import('pages/community/CreatorsPage.vue'),
        meta: {
          title: 'Community Creators',
          description: 'Discover talented 3D model creators in our community.'
        }
      },
      {
        path: 'creators/:id',
        name: 'community-creator',
        component: () => import('pages/community/CreatorProfilePage.vue'),
        meta: { title: 'Creator Profile' }
      },
      {
        path: 'my-uploads',
        name: 'my-uploads',
        component: () => import('pages/community/MyUploadsPage.vue'),
        meta: { title: 'My Uploads' }
      },
      {
        path: 'guidelines',
        name: 'community-guidelines',
        component: () => import('pages/community/GuidelinesPage.vue'),
        meta: {
          title: 'Community Guidelines',
          description: 'Our community guidelines for sharing 3D models.'
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
