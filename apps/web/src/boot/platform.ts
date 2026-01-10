/**
 * Platform Boot File
 *
 * Initializes platform-specific features and sets up the app for the
 * current platform (web, iOS, Android, Electron).
 *
 * Features:
 * - Platform detection
 * - Status bar configuration (Capacitor only)
 * - Splash screen handling (Capacitor only)
 * - Deep link handling (Capacitor only)
 * - Keyboard configuration (Capacitor only)
 * - Safe area CSS variables
 */

import { boot } from 'quasar/wrappers';

// Type definitions for dynamic imports
type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

export default boot(async ({ router }): Promise<void> => {
  // Skip if SSR
  if (typeof window === 'undefined') return;

  // Get Capacitor global if available
  const Capacitor = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;

  // Detect platform
  const isCapacitor = !!Capacitor?.isNativePlatform?.();
  const isElectron = !!(window as unknown as { electron?: unknown }).electron;
  const capacitorPlatform = Capacitor?.getPlatform?.() || 'web';

  // Add platform classes to body
  document.body.classList.add(`platform-${capacitorPlatform}`);
  if (isCapacitor) document.body.classList.add('is-capacitor', 'is-native');
  if (isElectron) document.body.classList.add('is-electron', 'is-native');

  // ============================================
  // Capacitor-specific initialization
  // ============================================
  if (isCapacitor) {
    // Initialize Capacitor plugins dynamically
    // This code path only runs in Capacitor builds where plugins are available
    initializeCapacitor(router, capacitorPlatform);
  }

  // ============================================
  // Electron-specific initialization
  // ============================================
  if (isElectron) {
    initializeElectron();
  }

  // ============================================
  // PWA-specific initialization
  // ============================================
  const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                (navigator as unknown as { standalone?: boolean }).standalone === true;

  if (isPWA) {
    document.body.classList.add('is-pwa');
  }
});

// ============================================
// Capacitor Initialization
// ============================================
async function initializeCapacitor(router: unknown, capacitorPlatform: string) {
  // Set safe area CSS variables
  setSafeAreaVariables();

  // Only attempt to load Capacitor plugins if in native mode
  // This prevents build errors in web mode
  try {
    // Hide splash screen after app is ready
    const splashModule = await import('@capacitor/splash-screen').catch(() => null);
    if (splashModule?.SplashScreen) {
      setTimeout(() => splashModule.SplashScreen.hide(), 200);
    }
  } catch {
    // Plugin not available
  }

  // Configure status bar
  if (capacitorPlatform === 'ios' || capacitorPlatform === 'android') {
    try {
      const statusBarModule = await import('@capacitor/status-bar').catch(() => null);
      if (statusBarModule?.StatusBar) {
        const { StatusBar, Style } = statusBarModule;
        const isDark = document.body.classList.contains('body--dark') ||
                      window.matchMedia('(prefers-color-scheme: dark)').matches;
        await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });

        if (capacitorPlatform === 'android') {
          await StatusBar.setBackgroundColor({ color: isDark ? '#09090b' : '#ffffff' });
        }
      }
    } catch {
      // Plugin not available
    }
  }

  // Handle deep links
  try {
    const appModule = await import('@capacitor/app').catch(() => null);
    if (appModule?.App) {
      const { App } = appModule;
      const vueRouter = router as { push: (path: string) => void; back: () => void };

      App.addListener('appUrlOpen', ({ url }: { url: string }) => {
        const path = url.replace(/^https?:\/\/[^/]+/, '');
        if (path) {
          vueRouter.push(path);
        }
      });

      // Handle back button (Android)
      if (capacitorPlatform === 'android') {
        App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
          if (canGoBack) {
            vueRouter.back();
          } else {
            vueRouter.push('/');
          }
        });
      }
    }
  } catch {
    // Plugin not available
  }

  // Configure keyboard behavior (iOS)
  if (capacitorPlatform === 'ios') {
    try {
      const keyboardModule = await import('@capacitor/keyboard').catch(() => null);
      if (keyboardModule?.Keyboard) {
        const { Keyboard } = keyboardModule;
        Keyboard.setAccessoryBarVisible({ isVisible: true });
        Keyboard.setScroll({ isDisabled: false });
      }
    } catch {
      // Plugin not available
    }
  }

  // Watch for theme changes and update status bar
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        const isDark = document.body.classList.contains('body--dark');
        updateStatusBarStyle(isDark, capacitorPlatform);
      }
    });
  });

  observer.observe(document.body, { attributes: true });
}

// ============================================
// Electron Initialization
// ============================================
function initializeElectron() {
  const electronAPI = (window as unknown as { electron?: {
    openExternal?: (url: string) => void;
    platform?: { isMac?: boolean; isWindows?: boolean; isLinux?: boolean };
  } }).electron;

  // Handle external links
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a');
    if (link?.target === '_blank' && link.href) {
      e.preventDefault();
      electronAPI?.openExternal?.(link.href);
    }
  });

  // Detect OS for styling
  const platform = electronAPI?.platform;
  const isMac = platform?.isMac || navigator.platform.toLowerCase().includes('mac');

  if (isMac) {
    document.body.classList.add('is-mac', 'electron-mac');
  }
  if (platform?.isWindows) document.body.classList.add('is-windows');
  if (platform?.isLinux) document.body.classList.add('is-linux');
}

// ============================================
// Helper Functions
// ============================================

function setSafeAreaVariables() {
  const style = document.documentElement.style;
  style.setProperty('--sat', 'env(safe-area-inset-top, 0px)');
  style.setProperty('--sab', 'env(safe-area-inset-bottom, 0px)');
  style.setProperty('--sal', 'env(safe-area-inset-left, 0px)');
  style.setProperty('--sar', 'env(safe-area-inset-right, 0px)');
}

async function updateStatusBarStyle(isDark: boolean, platform: string) {
  try {
    const statusBarModule = await import('@capacitor/status-bar').catch(() => null);
    if (statusBarModule?.StatusBar) {
      const { StatusBar, Style } = statusBarModule;
      await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });

      if (platform === 'android') {
        await StatusBar.setBackgroundColor({ color: isDark ? '#09090b' : '#ffffff' });
      }
    }
  } catch {
    // Plugin not available
  }
}
