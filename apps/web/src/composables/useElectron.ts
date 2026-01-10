/**
 * Electron Features Composable
 *
 * Provides access to Electron-specific features when running in desktop mode.
 * All methods are safe to call from any platform - they will no-op on non-Electron.
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';
import { devLog, devWarn, devError, logError } from '@/utils/devLogger';

// ============================================
// Types
// ============================================

export interface AppInfo {
  version: string;
  name: string;
  platform: string;
  arch: string;
  electronVersion: string;
  nodeVersion: string;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  hostname: string;
  cpus: number;
  memory: number;
  freeMemory: number;
  userInfo: {
    username: string;
    homedir: string;
  };
}

export interface UpdateProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';

// ============================================
// Composable
// ============================================

export function useElectron() {
  // State
  const isElectron = ref(false);
  const appInfo = ref<AppInfo | null>(null);
  const systemInfo = ref<SystemInfo | null>(null);
  const updateStatus = ref<UpdateStatus>('idle');
  const updateProgress = ref<UpdateProgress | null>(null);
  const updateError = ref<string | null>(null);
  const updateAvailableVersion = ref<string | null>(null);
  const isWindowMaximized = ref(false);
  const systemTheme = ref<'dark' | 'light'>('dark');

  // Cleanup functions
  const cleanupFunctions: Array<() => void> = [];

  // Check if running in Electron
  const electron = typeof window !== 'undefined' ? (window as any).electron : null;

  // Computed
  const isMac = computed(() => electron?.platform?.isMac ?? false);
  const isWindows = computed(() => electron?.platform?.isWindows ?? false);
  const isLinux = computed(() => electron?.platform?.isLinux ?? false);
  const isUpdateAvailable = computed(() => updateStatus.value === 'available' || updateStatus.value === 'downloaded');
  const canInstallUpdate = computed(() => updateStatus.value === 'downloaded');

  // Initialize
  async function initialize() {
    if (!electron) return;

    isElectron.value = true;

    try {
      // Get app info
      appInfo.value = await electron.getAppInfo();

      // Get system info
      systemInfo.value = await electron.getSystemInfo();

      // Get system theme
      systemTheme.value = await electron.getSystemTheme();

      // Check window maximized state
      isWindowMaximized.value = await electron.isWindowMaximized();
    } catch (error) {
      logError('Failed to initialize Electron features:', error);
    }

    // Listen for update status changes
    if (electron.onUpdateStatus) {
      const cleanup = electron.onUpdateStatus((status: string, data?: any) => {
        updateStatus.value = status as UpdateStatus;
        if (status === 'available' && data?.version) {
          updateAvailableVersion.value = data.version;
        }
        if (status === 'downloading') {
          updateStatus.value = 'downloading';
        }
        if (status === 'error') {
          updateError.value = data || 'Unknown error';
        }
      });
      cleanupFunctions.push(cleanup);
    }

    // Listen for update progress
    if (electron.onUpdateProgress) {
      const cleanup = electron.onUpdateProgress((progress: UpdateProgress) => {
        updateProgress.value = progress;
      });
      cleanupFunctions.push(cleanup);
    }

    // Listen for theme changes
    if (electron.onThemeChange) {
      const cleanup = electron.onThemeChange((theme: 'dark' | 'light') => {
        systemTheme.value = theme;
      });
      cleanupFunctions.push(cleanup);
    }

    // Listen for window maximized changes
    if (electron.onWindowMaximizedChange) {
      const cleanup = electron.onWindowMaximizedChange((maximized: boolean) => {
        isWindowMaximized.value = maximized;
      });
      cleanupFunctions.push(cleanup);
    }
  }

  // Window controls
  function minimize() {
    electron?.windowMinimize?.();
  }

  function maximize() {
    electron?.windowMaximize?.();
  }

  function close() {
    electron?.windowClose?.();
  }

  // Theme
  async function setTheme(theme: 'dark' | 'light' | 'system') {
    if (!electron) return;
    await electron.setNativeTheme(theme);
  }

  // Auto-updater
  async function checkForUpdates() {
    if (!electron) return null;
    updateStatus.value = 'checking';
    updateError.value = null;
    return electron.checkForUpdates();
  }

  function downloadUpdate() {
    if (!electron) return;
    updateStatus.value = 'downloading';
    electron.downloadUpdate();
  }

  function installUpdate() {
    if (!electron) return;
    electron.installUpdate();
  }

  // External links
  async function openExternal(url: string) {
    if (electron) {
      await electron.openExternal(url);
    } else if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  }

  async function showInFolder(path: string) {
    if (!electron) return;
    await electron.showItemInFolder(path);
  }

  // Navigation listener
  function onNavigate(callback: (path: string) => void): () => void {
    if (!electron?.onNavigate) return () => {};
    return electron.onNavigate(callback);
  }

  // Lifecycle
  onMounted(() => {
    initialize();
  });

  onUnmounted(() => {
    cleanupFunctions.forEach(cleanup => cleanup());
  });

  return {
    // State
    isElectron,
    appInfo,
    systemInfo,
    updateStatus,
    updateProgress,
    updateError,
    updateAvailableVersion,
    isWindowMaximized,
    systemTheme,

    // Computed
    isMac,
    isWindows,
    isLinux,
    isUpdateAvailable,
    canInstallUpdate,

    // Methods
    initialize,

    // Window controls
    minimize,
    maximize,
    close,

    // Theme
    setTheme,

    // Auto-updater
    checkForUpdates,
    downloadUpdate,
    installUpdate,

    // External
    openExternal,
    showInFolder,

    // Navigation
    onNavigate,
  };
}
