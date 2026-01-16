import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.synthstack.mobile',
  appName: 'SynthStack',
  webDir: '../dist/spa',

  // Server configuration for development
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // Uncomment for live reload during development:
    // url: 'http://YOUR_LOCAL_IP:3050',
    // cleartext: true,
  },

  // iOS Configuration
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    backgroundColor: '#09090b',
    // Enable edge-to-edge content
    scrollEnabled: true,
  },

  // Android Configuration
  android: {
    backgroundColor: '#09090b',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    // Uncomment for older Android support:
    // minWebViewVersion: 55,
  },

  // Plugins Configuration
  plugins: {
    // Splash Screen
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: false, // Manually hide after app ready
      backgroundColor: '#09090b',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },

    // Status Bar
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#09090b',
    },

    // Keyboard
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },

    // Push Notifications
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    // Local Notifications
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#d35400',
      sound: 'notification.wav',
    },

    // Browser (for OAuth/external links)
    Browser: {
      presentationStyle: 'popover',
    },

    // App
    App: {
      launchUrl: 'https://synthstack.app',
    },
  },
};

export default config;
