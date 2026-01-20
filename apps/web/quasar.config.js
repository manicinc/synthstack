/**
 * SynthStack Quasar Configuration
 */
import { configure } from 'quasar/wrappers';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file for local development
// This makes VITE_* variables available in process.env during Quasar config evaluation
// In CI, environment variables are already set via workflow env block
// Try apps/web/.env first, then fall back to root .env for monorepo setups
const webEnvPath = path.join(__dirname, '.env');
const rootEnvPath = path.join(__dirname, '../..', '.env');

let dotenvResult = dotenv.config({ path: webEnvPath });
if (dotenvResult.error) {
  // Try root .env as fallback
  dotenvResult = dotenv.config({ path: rootEnvPath });
  if (dotenvResult.error) {
    console.error('[Quasar Config] Failed to load .env:', dotenvResult.error.message);
  } else {
    console.log('[Quasar Config] Loaded root .env as fallback');
  }
} else {
  console.log('[Quasar Config] Loaded apps/web/.env successfully');
  // Also load root .env for any vars not in apps/web/.env
  dotenv.config({ path: rootEnvPath });
}
console.log('[Quasar Config] VITE_ENABLE_COPILOT:', process.env.VITE_ENABLE_COPILOT);
console.log('[Quasar Config] VITE_ENABLE_COPILOT_RAG:', process.env.VITE_ENABLE_COPILOT_RAG);
console.log('[Quasar Config] VITE_ENABLE_AI_AGENTS:', process.env.VITE_ENABLE_AI_AGENTS);
console.log('[Quasar Config] VITE_ENABLE_REFERRALS:', process.env.VITE_ENABLE_REFERRALS);

export default configure(function (ctx) {
  return {
    // Enable TypeScript
    supportTS: {
      tsCheckerConfig: {
        eslint: {
          enabled: true,
          files: './src/**/*.{ts,tsx,js,jsx,vue}'
        }
      }
    },

    // Boot files
    boot: [
      'pinia',
      'i18n',
      'supabase',
      'theme',
      'sentry',     // Error tracking (before analytics)
      'analytics',
      'feature-flags',
      'platform'
    ],

    // Global CSS
    css: [
      'scroll-fix.scss',  // LOAD FIRST - critical scroll fix
      'app.scss'
    ],

    // Quasar extras
    extras: [
      'material-icons',
      'mdi-v7'
    ],

    // Build configuration
    build: {
      target: {
        browser: ['es2022', 'edge88', 'firefox78', 'chrome87', 'safari14'],
        node: 'node20'
      },

      vueRouterMode: 'history',

      // Vite plugins
      vitePlugins: [
        // DISABLED: The unplugin-vue-i18n plugin pre-compiles JSON to AST format,
        // which conflicts with direct JSON imports in src/i18n/index.ts.
        // The i18n module manually imports and registers locale files.
        // ['@intlify/unplugin-vue-i18n/vite', {
        //   include: [path.resolve(__dirname, './src/i18n/locales/**/*.json')],
        //   runtimeOnly: false,
        //   compositionOnly: true,
        //   strictMessage: false
        // }]
      ],

      // Environment variables
      // Quasar exposes these as process.env.* in client code
      // Takes Node.js env vars (including VITE_* from CI) and makes them available to the app
      env: {
        API_URL: process.env.VITE_API_URL || 'http://localhost:3003',
        DIRECTUS_URL: process.env.VITE_DIRECTUS_URL || 'http://localhost:8099',
        SUPABASE_URL: process.env.VITE_SUPABASE_URL || '',
        SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || '',
        STRIPE_PUBLISHABLE_KEY: process.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
        APP_NAME: process.env.VITE_APP_NAME || 'SynthStack',
        APP_URL: process.env.VITE_APP_URL || 'http://localhost:3000',
        // Feature flags - exposed as process.env.ENABLE_COPILOT (not VITE_ENABLE_COPILOT)
        ENABLE_COPILOT: process.env.VITE_ENABLE_COPILOT || 'false',
        // Back-compat: if new flags are missing, fall back to ENABLE_COPILOT (legacy behavior)
        ENABLE_AI_AGENTS: process.env.VITE_ENABLE_AI_AGENTS ?? process.env.VITE_ENABLE_COPILOT ?? 'false',
        ENABLE_COPILOT_RAG:
          process.env.VITE_ENABLE_COPILOT_RAG ??
          process.env.VITE_ENABLE_AI_AGENTS ??
          process.env.VITE_ENABLE_COPILOT ??
          'false',
        ENABLE_REFERRALS: process.env.VITE_ENABLE_REFERRALS || 'false',
        // App mode: 'full' = web with landing pages, 'app' = mobile/desktop app-only
        APP_MODE: (ctx.mode.capacitor || ctx.mode.electron) ? 'app' : 'full'
      },

      // SCSS variables
      sassVariables: 'src/css/quasar.variables.scss',

      // Aliases
      alias: {
        '@': path.join(__dirname, './src'),
        'src': path.join(__dirname, './src'),
        'stores': path.join(__dirname, './src/stores'),
        'layouts': path.join(__dirname, './src/layouts'),
        'components': path.join(__dirname, './src/components'),
        '@synthstack/types': path.join(__dirname, '../../packages/types/src')
      },

      // Production optimizations
      vueOptionsAPI: false,
      minify: ctx.prod ? 'esbuild' : false,
      sourcemap: ctx.dev,
      extractCSS: ctx.prod,

      // Vite config
      extendViteConf(viteConf, { isClient, isServer }) {
        viteConf.server = {
          ...(viteConf.server || {}),
          host: '0.0.0.0',
          port: 3050,
          strictPort: false,
          allowedHosts: ['.trycloudflare.com', 'localhost', '.localhost'],
          hmr: false
        };

        // Allow imports from the monorepo root (e.g., config.json, shared templates)
        viteConf.server.fs = viteConf.server.fs || {};
        viteConf.server.fs.allow = [
          ...(viteConf.server.fs.allow || []),
          path.resolve(__dirname, '../../..')
        ];

        // Externalize Capacitor plugins for SPA/web and Electron builds
        // They're only available in Capacitor mode
        if (!ctx.mode.capacitor) {
          const capacitorPlugins = [
            '@capacitor/splash-screen',
            '@capacitor/status-bar',
            '@capacitor/app',
            '@capacitor/keyboard',
            '@capacitor/device',
            '@capacitor/camera',
            '@capacitor/haptics',
            '@capacitor/share',
            '@capacitor/clipboard',
            '@capacitor/geolocation',
            '@capacitor/browser',
            '@capacitor/filesystem',
            '@capacitor/network',
            '@capacitor/preferences',
            '@capacitor/push-notifications'
          ];

          // For build (rollup)
          viteConf.build = viteConf.build || {};
          viteConf.build.rollupOptions = viteConf.build.rollupOptions || {};
          viteConf.build.rollupOptions.external = capacitorPlugins;

          // For dev mode - use resolve alias to stub out imports
          viteConf.resolve = viteConf.resolve || {};
          viteConf.resolve.alias = viteConf.resolve.alias || {};
          capacitorPlugins.forEach(plugin => {
            viteConf.resolve.alias[plugin] = path.join(__dirname, 'src/stubs/capacitor-stub.ts');
          });
        }
      }
    },

    // Dev server
    devServer: {
      https: false,
      port: 3050,
      open: false,
      allowedHosts: ['.trycloudflare.com', 'localhost', '.localhost'],
      proxy: {
        '/api': {
          target: process.env.API_PROXY_TARGET || process.env.VITE_API_URL || 'http://localhost:3003',
          changeOrigin: true
        },
        '/directus': {
          target: process.env.DIRECTUS_PROXY_TARGET || process.env.VITE_DIRECTUS_URL || 'http://localhost:8099',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/directus/, '')
        },
        '/assets': {
          target: process.env.DIRECTUS_PROXY_TARGET || process.env.VITE_DIRECTUS_URL || 'http://localhost:8099',
          changeOrigin: true
        }
      }
    },

    // Framework configuration
    framework: {
      config: {
        brand: {
          primary: '#2D9CDB',      // SynthStack blue
          secondary: '#00D4AA',    // Teal accent
          accent: '#6C63FF',       // Purple accent
          dark: '#0D0D0D',
          'dark-page': '#0D0D0D',
          positive: '#2ECC71',
          negative: '#E74C3C',
          info: '#2D9CDB',
          warning: '#F1C40F'
        },
        dark: true
      },

      iconSet: 'material-icons',
      lang: 'en-US',

      // Import all components in dev
      all: ctx.dev,

      // Tree-shake in production
      components: ctx.prod ? [
        'QLayout',
        'QHeader',
        'QDrawer',
        'QPageContainer',
        'QPage',
        'QToolbar',
        'QToolbarTitle',
        'QBtn',
        'QIcon',
        'QList',
        'QItem',
        'QItemSection',
        'QItemLabel',
        'QCard',
        'QCardSection',
        'QCardActions',
        'QInput',
        'QForm',
        'QAvatar',
        'QImg',
        'QSeparator',
        'QSpace',
        'QMenu',
        'QTooltip',
        'QBadge',
        'QChip',
        'QTabs',
        'QTab',
        'QTabPanels',
        'QTabPanel',
        'QSpinner',
        'QDialog',
        'QSelect',
        'QToggle',
        'QSlider',
        'QLinearProgress',
        'QCircularProgress',
        'QSkeleton',
        'QFile',
        'QUploader',
        'QExpansionItem',
        'QBtnDropdown',
        'QRange',
        'QBtnToggle'
      ] : undefined,

      plugins: [
        'Notify',
        'Dialog',
        'Loading',
        'LoadingBar',
        'Meta',
        'Cookies',
        'LocalStorage',
        'SessionStorage',
        'Dark'
      ]
    },

    // Animations
    animations: [
      'fadeIn',
      'fadeOut',
      'fadeInUp',
      'fadeInDown',
      'slideInLeft',
      'slideInRight',
      'slideInUp',
      'slideInDown'
    ],

    // SSR configuration
    ssr: {
      pwa: false,
      prodPort: 3000,
      middlewares: [
        'render'
      ]
    },

    // PWA configuration
    pwa: {
      workboxPluginMode: 'GenerateSW',
      manifest: {
        name: 'SynthStack',
        short_name: 'SynthStack',
        description: 'AI-Native SaaS Boilerplate with CMS & Community',
        display: 'standalone',
        background_color: '#0D0D0D',
        theme_color: '#2D9CDB',
        icons: [
          {
            src: 'icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    },

    // Capacitor configuration
    capacitor: {
      hideSplashscreen: false,
      capacitorCliPreparationParams: ['sync', '@capacitor/core']
    },

    // Electron configuration
    electron: {
      inspectPort: 5858,

      bundler: 'builder',

      // Preload scripts
      preloadScripts: ['electron-preload'],

      // Extend electron-main.ts esbuild configuration
      extendElectronMainConf(cfg) {
        cfg.format = 'cjs';
        cfg.target = 'node18';
        cfg.platform = 'node';
        cfg.external = cfg.external || [];
        cfg.external.push('electron', 'electron-store', 'electron-updater');
      },

      // Extend electron-preload.ts esbuild configuration
      extendElectronPreloadConf(cfg) {
        cfg.format = 'cjs';
        cfg.target = 'node18';
        cfg.platform = 'node';
        cfg.external = cfg.external || [];
        cfg.external.push('electron');
      },

      builder: {
        appId: 'app.synthstack.desktop',
        productName: 'SynthStack',
        copyright: 'Copyright © 2024 SynthStack',
        npmRebuild: false,
        buildDependenciesFromSource: false,
        nodeGypRebuild: false,
        // Fix for pnpm workspaces
        files: ['**/*'],
        asarUnpack: [],
        asar: true,
        // Explicit icon
        icon: 'src-electron/icons/icon',
        directories: {
          output: 'dist/electron'
        },
        mac: {
          category: 'public.app-category.developer-tools',
          target: ['dir'], // Just build .app, skip dmg for speed
          darkModeSupport: true,
          icon: 'src-electron/icons/icon.png'
        },
        win: {
          target: ['nsis', 'portable']
        },
        linux: {
          target: ['AppImage', 'deb'],
          category: 'Development'
        },
        publish: {
          provider: 'github',
          owner: 'synthstack',
          repo: 'synthstack'
        }
      }
    }
  };
});
