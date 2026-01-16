/**
 * Platform Detection Composable
 *
 * Detects the current platform (web, iOS, Android, Electron) and provides
 * reactive information about platform capabilities.
 *
 * Works with:
 * - Quasar's $q.platform for basic detection
 * - Capacitor Device plugin for native apps
 * - Electron process for desktop detection
 */

import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';

// ============================================
// Types
// ============================================

export type PlatformType = 'web' | 'ios' | 'android' | 'electron' | 'pwa';

export interface PlatformInfo {
  type: PlatformType;
  isNative: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  isPWA: boolean;
  isWeb: boolean;
  isCapacitor: boolean;
  isElectron: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;
  hasSafeArea: boolean;
  hasNotch: boolean;
  deviceName: string | null;
  osVersion: string | null;
  appVersion: string | null;
}

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

// ============================================
// Platform Detection
// ============================================

let platformInfoCache: PlatformInfo | null = null;

async function detectPlatform(): Promise<PlatformInfo> {
  if (platformInfoCache) return platformInfoCache;

  const info: PlatformInfo = {
    type: 'web',
    isNative: false,
    isMobile: false,
    isDesktop: true,
    isPWA: false,
    isWeb: true,
    isCapacitor: false,
    isElectron: false,
    isIOS: false,
    isAndroid: false,
    isMac: false,
    isWindows: false,
    isLinux: false,
    hasSafeArea: false,
    hasNotch: false,
    deviceName: null,
    osVersion: null,
    appVersion: null,
  };

  // Check for Electron
  if (typeof window !== 'undefined' && (window as any).electron) {
    info.type = 'electron';
    info.isElectron = true;
    info.isDesktop = true;
    info.isNative = true;
    info.isWeb = false;

    // Detect OS in Electron
    const platform = (window as any).electron?.platform || process?.platform;
    info.isMac = platform === 'darwin';
    info.isWindows = platform === 'win32';
    info.isLinux = platform === 'linux';

    platformInfoCache = info;
    return info;
  }

  // Check for Capacitor
  if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
    info.isCapacitor = true;
    info.isNative = true;
    info.isWeb = false;

    const capacitorPlatform = (window as any).Capacitor.getPlatform();
    if (capacitorPlatform === 'ios') {
      info.type = 'ios';
      info.isIOS = true;
      info.isMobile = true;
      info.isDesktop = false;
      info.hasSafeArea = true;
      // Check for notch (iPhone X and later)
      info.hasNotch = window.innerHeight > 800 && window.screen.height >= 812;
    } else if (capacitorPlatform === 'android') {
      info.type = 'android';
      info.isAndroid = true;
      info.isMobile = true;
      info.isDesktop = false;
    }

    // Try to get device info
    try {
      const { Device } = await import('@capacitor/device');
      const deviceInfo = await Device.getInfo();
      info.deviceName = deviceInfo.name || deviceInfo.model;
      info.osVersion = deviceInfo.osVersion;
    } catch {
      // Device plugin not available
    }

    platformInfoCache = info;
    return info;
  }

  // Check for PWA
  if (typeof window !== 'undefined') {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInstalledPWA = (navigator as any).standalone === true; // iOS Safari
    if (isStandalone || isInstalledPWA) {
      info.type = 'pwa';
      info.isPWA = true;
    }

    // Mobile detection from user agent
    const ua = navigator.userAgent.toLowerCase();
    info.isMobile = /iphone|ipad|ipod|android|mobile/.test(ua);
    info.isDesktop = !info.isMobile;
    info.isIOS = /iphone|ipad|ipod/.test(ua);
    info.isAndroid = /android/.test(ua);

    // Desktop OS detection
    info.isMac = /macintosh|mac os x/.test(ua);
    info.isWindows = /windows/.test(ua);
    info.isLinux = /linux/.test(ua) && !info.isAndroid;
  }

  platformInfoCache = info;
  return info;
}

// ============================================
// Composable
// ============================================

export function usePlatform() {
  const $q = useQuasar();

  // State
  const platform = ref<PlatformInfo>({
    type: 'web',
    isNative: false,
    isMobile: false,
    isDesktop: true,
    isPWA: false,
    isWeb: true,
    isCapacitor: false,
    isElectron: false,
    isIOS: false,
    isAndroid: false,
    isMac: false,
    isWindows: false,
    isLinux: false,
    hasSafeArea: false,
    hasNotch: false,
    deviceName: null,
    osVersion: null,
    appVersion: null,
  });

  const safeAreaInsets = ref<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  const isInitialized = ref(false);

  // Computed
  const platformClass = computed(() => {
    const classes = [`platform-${platform.value.type}`];
    if (platform.value.isNative) classes.push('is-native');
    if (platform.value.isMobile) classes.push('is-mobile');
    if (platform.value.isDesktop) classes.push('is-desktop');
    if (platform.value.hasNotch) classes.push('has-notch');
    if (platform.value.hasSafeArea) classes.push('has-safe-area');
    return classes.join(' ');
  });

  const statusBarHeight = computed(() => {
    if (platform.value.isIOS) return safeAreaInsets.value.top || 44;
    if (platform.value.isAndroid) return 24;
    return 0;
  });

  const bottomSafeArea = computed(() => {
    if (platform.value.hasNotch) return safeAreaInsets.value.bottom || 34;
    if (platform.value.isIOS) return safeAreaInsets.value.bottom || 0;
    return 0;
  });

  // Methods
  async function initialize() {
    if (isInitialized.value) return;

    platform.value = await detectPlatform();

    // Get safe area insets
    if (typeof window !== 'undefined' && platform.value.hasSafeArea) {
      const computedStyle = getComputedStyle(document.documentElement);
      safeAreaInsets.value = {
        top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10) ||
             parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
        bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10) ||
                parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
        left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10) ||
              parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0', 10),
        right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10) ||
               parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0', 10),
      };
    }

    // Apply platform class to body
    if (typeof document !== 'undefined') {
      document.body.classList.add(...platformClass.value.split(' '));
    }

    isInitialized.value = true;
  }

  function isSupportedFeature(feature: string): boolean {
    switch (feature) {
      case 'camera':
        return platform.value.isNative || (typeof navigator !== 'undefined' && !!navigator.mediaDevices);
      case 'haptics':
        return platform.value.isNative || ('vibrate' in navigator);
      case 'push-notifications':
        return platform.value.isNative || ('Notification' in window && 'serviceWorker' in navigator);
      case 'biometrics':
        return platform.value.isNative;
      case 'share':
        return platform.value.isNative || ('share' in navigator);
      case 'clipboard':
        return 'clipboard' in navigator;
      case 'geolocation':
        return 'geolocation' in navigator;
      default:
        return false;
    }
  }

  // Initialize on mount
  onMounted(initialize);

  return {
    // State
    platform,
    safeAreaInsets,
    isInitialized,

    // Computed
    platformClass,
    statusBarHeight,
    bottomSafeArea,

    // Methods
    initialize,
    isSupportedFeature,
  };
}
