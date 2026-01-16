/**
 * SynthStack Electron Preload Script
 *
 * This script runs in the renderer process before the web page loads.
 * It safely exposes selected Electron APIs to the renderer process
 * via contextBridge for security.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const { contextBridge, ipcRenderer } = require('electron');

// Types for exposed API
export interface ElectronAPI {
  // App info
  getAppInfo: () => Promise<{
    version: string;
    name: string;
    platform: string;
    arch: string;
    electronVersion: string;
    nodeVersion: string;
  }>;

  // System info
  getSystemInfo: () => Promise<{
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
  }>;

  // Theme
  getSystemTheme: () => Promise<'dark' | 'light'>;
  setNativeTheme: (theme: 'dark' | 'light' | 'system') => Promise<boolean>;
  onThemeChange: (callback: (theme: 'dark' | 'light') => void) => () => void;

  // Window controls
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  isWindowMaximized: () => Promise<boolean>;
  onWindowMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;

  // Auto-updater
  checkForUpdates: () => Promise<unknown>;
  downloadUpdate: () => void;
  installUpdate: () => void;
  onUpdateStatus: (callback: (status: string, data?: unknown) => void) => () => void;
  onUpdateProgress: (callback: (progress: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => () => void;

  // Navigation
  onNavigate: (callback: (path: string) => void) => () => void;

  // External
  openExternal: (url: string) => Promise<void>;
  showItemInFolder: (path: string) => Promise<void>;

  // Platform detection
  platform: {
    isElectron: boolean;
    isMac: boolean;
    isWindows: boolean;
    isLinux: boolean;
  };
}

// Expose protected methods to renderer process
const electronAPI: ElectronAPI = {
  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // System info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // Theme
  getSystemTheme: () => ipcRenderer.invoke('get-system-theme'),
  setNativeTheme: (theme) => ipcRenderer.invoke('set-native-theme', theme),
  onThemeChange: (callback) => {
    const handler = (_: unknown, theme: 'dark' | 'light') => callback(theme);
    ipcRenderer.on('theme-changed', handler);
    return () => ipcRenderer.removeListener('theme-changed', handler);
  },

  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  isWindowMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onWindowMaximizedChange: (callback) => {
    const handler = (_: unknown, isMaximized: boolean) => callback(isMaximized);
    ipcRenderer.on('window-maximized-changed', handler);
    return () => ipcRenderer.removeListener('window-maximized-changed', handler);
  },

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateStatus: (callback) => {
    const handler = (_: unknown, status: string, data?: unknown) => callback(status, data);
    ipcRenderer.on('update-status', handler);
    return () => ipcRenderer.removeListener('update-status', handler);
  },
  onUpdateProgress: (callback) => {
    const handler = (_: unknown, progress: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => callback(progress);
    ipcRenderer.on('update-progress', handler);
    return () => ipcRenderer.removeListener('update-progress', handler);
  },

  // Navigation (from main process menu items)
  onNavigate: (callback) => {
    const handler = (_: unknown, path: string) => callback(path);
    ipcRenderer.on('navigate', handler);
    return () => ipcRenderer.removeListener('navigate', handler);
  },

  // External
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  showItemInFolder: (path) => ipcRenderer.invoke('show-item-in-folder', path),

  // Platform detection
  platform: {
    isElectron: true,
    isMac: process.platform === 'darwin',
    isWindows: process.platform === 'win32',
    isLinux: process.platform === 'linux',
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electron', electronAPI);

// Type augmentation for global window object
declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
