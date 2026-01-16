/**
 * SynthStack Electron Type Declarations
 *
 * TypeScript declarations for the Electron environment
 */

/// <reference types="electron" />

declare namespace NodeJS {
  interface ProcessEnv {
    DEV?: string;
    APP_URL?: string;
    DIST: string;
    NODE_ENV: 'development' | 'production';
    DEBUGGING?: string;
  }
}

// Extend the global Window interface
interface Window {
  electron: import('./electron-preload').ElectronAPI;
}
