/**
 * Type declarations for optional dependencies
 * These modules may not be installed in all environments (e.g., web vs native)
 */

// Capacitor plugins (optional for native builds)
declare module '@capacitor/splash-screen' {
  export const SplashScreen: {
    hide: () => Promise<void>;
    show: () => Promise<void>;
  };
}

declare module '@capacitor/status-bar' {
  export enum Style {
    Dark = 'DARK',
    Light = 'LIGHT',
    Default = 'DEFAULT',
  }
  export const StatusBar: {
    setStyle: (options: { style: Style }) => Promise<void>;
    setBackgroundColor: (options: { color: string }) => Promise<void>;
    show: () => Promise<void>;
    hide: () => Promise<void>;
  };
}

declare module '@capacitor/app' {
  interface AppUrlOpenData {
    url: string;
  }
  interface BackButtonData {
    canGoBack: boolean;
  }
  export const App: {
    addListener(eventName: 'appUrlOpen', callback: (data: AppUrlOpenData) => void): Promise<{ remove: () => void }>;
    addListener(eventName: 'backButton', callback: (data: BackButtonData) => void): Promise<{ remove: () => void }>;
    addListener(eventName: string, callback: (data: unknown) => void): Promise<{ remove: () => void }>;
    removeAllListeners: () => Promise<void>;
    exitApp: () => Promise<void>;
  };
}

declare module '@capacitor/keyboard' {
  export const Keyboard: {
    setAccessoryBarVisible: (options: { isVisible: boolean }) => Promise<void>;
    setScroll: (options: { isDisabled: boolean }) => Promise<void>;
    show: () => Promise<void>;
    hide: () => Promise<void>;
  };
}

declare module '@capacitor/camera' {
  export enum CameraResultType {
    Uri = 'uri',
    Base64 = 'base64',
    DataUrl = 'dataUrl',
  }
  export enum CameraSource {
    Prompt = 'PROMPT',
    Camera = 'CAMERA',
    Photos = 'PHOTOS',
  }
  export interface Photo {
    base64String?: string;
    dataUrl?: string;
    path?: string;
    webPath?: string;
    format: string;
  }
  export const Camera: {
    getPhoto: (options?: Record<string, unknown>) => Promise<Photo>;
    checkPermissions: () => Promise<{ camera: string; photos: string }>;
    requestPermissions: () => Promise<{ camera: string; photos: string }>;
  };
}

declare module '@capacitor/haptics' {
  export enum ImpactStyle {
    Heavy = 'HEAVY',
    Medium = 'MEDIUM',
    Light = 'LIGHT',
  }
  export enum NotificationType {
    Success = 'SUCCESS',
    Warning = 'WARNING',
    Error = 'ERROR',
  }
  export const Haptics: {
    impact: (options?: { style?: ImpactStyle }) => Promise<void>;
    notification: (options?: { type?: NotificationType }) => Promise<void>;
    vibrate: (options?: { duration?: number }) => Promise<void>;
    selectionStart: () => Promise<void>;
    selectionChanged: () => Promise<void>;
    selectionEnd: () => Promise<void>;
  };
}

declare module '@capacitor/share' {
  export interface ShareResult {
    activityType?: string;
  }
  export const Share: {
    share: (options: {
      title?: string;
      text?: string;
      url?: string;
      dialogTitle?: string;
      files?: string[];
    }) => Promise<ShareResult>;
    canShare: () => Promise<{ value: boolean }>;
  };
}

declare module '@capacitor/clipboard' {
  export const Clipboard: {
    write: (options: { string?: string; image?: string; url?: string }) => Promise<void>;
    read: () => Promise<{ type: string; value: string }>;
  };
}

declare module '@capacitor/geolocation' {
  export interface Position {
    coords: {
      latitude: number;
      longitude: number;
      accuracy: number;
      altitude?: number | null;
      altitudeAccuracy?: number | null;
      heading?: number | null;
      speed?: number | null;
    };
    timestamp: number;
  }
  export const Geolocation: {
    getCurrentPosition: (options?: Record<string, unknown>) => Promise<Position>;
    watchPosition: (
      options: Record<string, unknown>,
      callback: (position: Position | null, err?: unknown) => void
    ) => Promise<string>;
    clearWatch: (options: { id: string }) => Promise<void>;
    checkPermissions: () => Promise<{ location: string; coarseLocation: string }>;
    requestPermissions: () => Promise<{ location: string; coarseLocation: string }>;
  };
}

declare module '@capacitor/browser' {
  export const Browser: {
    open: (options: { url: string; windowName?: string; toolbarColor?: string }) => Promise<void>;
    close: () => Promise<void>;
    addListener: (
      eventName: string,
      callback: (data: unknown) => void
    ) => Promise<{ remove: () => void }>;
    removeAllListeners: () => Promise<void>;
  };
}

declare module '@capacitor/device' {
  export interface DeviceInfo {
    name?: string;
    model: string;
    platform: string;
    operatingSystem: string;
    osVersion: string;
    manufacturer: string;
    isVirtual: boolean;
    webViewVersion: string;
  }
  export interface BatteryInfo {
    batteryLevel: number;
    isCharging: boolean;
  }
  export const Device: {
    getInfo: () => Promise<DeviceInfo>;
    getBatteryInfo: () => Promise<BatteryInfo>;
    getId: () => Promise<{ identifier: string }>;
    getLanguageCode: () => Promise<{ value: string }>;
    getLanguageTag: () => Promise<{ value: string }>;
  };
}

// Chart libraries (optional)
declare module 'vue3-apexcharts' {
  import type { DefineComponent } from 'vue';
  const VueApexCharts: DefineComponent<object, object, object>;
  export default VueApexCharts;
}

declare module 'apexcharts' {
  export interface ApexOptions {
    chart?: {
      type?: string;
      height?: number | string;
      width?: number | string;
      sparkline?: { enabled?: boolean };
      toolbar?: { show?: boolean };
      zoom?: { enabled?: boolean };
      background?: string;
      foreColor?: string;
      [key: string]: unknown;
    };
    series?: Array<{
      name?: string;
      data: number[];
      [key: string]: unknown;
    }>;
    colors?: string[];
    stroke?: {
      curve?: string;
      width?: number;
      [key: string]: unknown;
    };
    fill?: {
      type?: string;
      gradient?: {
        shadeIntensity?: number;
        opacityFrom?: number;
        opacityTo?: number;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    tooltip?: {
      enabled?: boolean;
      theme?: string;
      [key: string]: unknown;
    };
    grid?: {
      show?: boolean;
      [key: string]: unknown;
    };
    xaxis?: {
      type?: string;
      categories?: string[];
      labels?: {
        show?: boolean;
        formatter?: (value: string, timestamp?: number, opts?: unknown) => string;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    yaxis?: {
      labels?: {
        show?: boolean;
        formatter?: (value: number, opts?: unknown) => string;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    dataLabels?: {
      enabled?: boolean;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }

  export default class ApexCharts {
    constructor(el: HTMLElement | null, options: ApexOptions);
    render(): Promise<void>;
    updateOptions(options: Partial<ApexOptions>): Promise<void>;
    updateSeries(newSeries: ApexOptions['series']): Promise<void>;
    destroy(): void;
  }
}

// Date utilities (optional)
declare module 'date-fns' {
  export function format(date: Date | number | string, formatStr: string): string;
  export function parseISO(dateString: string): Date;
  export function startOfDay(date: Date | number | string): Date;
  export function endOfDay(date: Date | number | string): Date;
  export function startOfWeek(date: Date | number | string, options?: { weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 }): Date;
  export function endOfWeek(date: Date | number | string, options?: { weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 }): Date;
  export function startOfMonth(date: Date | number | string): Date;
  export function endOfMonth(date: Date | number | string): Date;
  export function subDays(date: Date | number | string, amount: number): Date;
  export function subWeeks(date: Date | number | string, amount: number): Date;
  export function subMonths(date: Date | number | string, amount: number): Date;
  export function addDays(date: Date | number | string, amount: number): Date;
  export function formatDistanceToNow(date: Date | number | string, options?: { addSuffix?: boolean; includeSeconds?: boolean }): string;
}
