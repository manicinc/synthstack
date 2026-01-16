# SynthStack Cross-Platform Guide

This guide covers building and deploying SynthStack for iOS, Android, and Desktop (Windows, macOS, Linux) using Capacitor and Electron.

## Overview

SynthStack supports multiple platforms from a single codebase:

- **Web**: Default SPA deployment
- **iOS**: Native app via Capacitor
- **Android**: Native app via Capacitor
- **macOS**: Desktop app via Electron
- **Windows**: Desktop app via Electron
- **Linux**: Desktop app via Electron
- **PWA**: Progressive Web App

## Architecture

```
apps/web/
├── src/                      # Shared Vue.js source code
├── src-capacitor/            # Capacitor mobile configuration
│   ├── capacitor.config.ts
│   ├── package.json
│   ├── android/              # Android native project
│   └── ios/                  # iOS native project
├── src-electron/             # Electron desktop configuration
│   ├── electron-main.ts      # Main process
│   ├── electron-preload.ts   # Preload script
│   ├── package.json
│   └── icons/                # App icons
└── dist/                     # Build output
    ├── spa/                  # Web build
    ├── capacitor/            # Mobile builds
    └── electron/             # Desktop builds
```

## Platform Abstraction Layer

### usePlatform Composable

Detect the current platform and capabilities:

```typescript
import { usePlatform } from '@/composables/usePlatform';

const { platform, isSupportedFeature } = usePlatform();

// Platform detection
if (platform.value.isIOS) {
  // iOS-specific code
}

if (platform.value.isElectron) {
  // Desktop-specific code
}

// Feature detection
if (isSupportedFeature('camera')) {
  // Camera is available
}
```

### Platform Info Object

```typescript
interface PlatformInfo {
  type: 'web' | 'ios' | 'android' | 'electron' | 'pwa';
  isNative: boolean;      // Running in native shell
  isMobile: boolean;      // iOS or Android
  isDesktop: boolean;     // Electron or desktop browser
  isPWA: boolean;         // Installed PWA
  isWeb: boolean;         // Regular browser
  isCapacitor: boolean;   // Capacitor native
  isElectron: boolean;    // Electron desktop
  isIOS: boolean;
  isAndroid: boolean;
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;
  hasSafeArea: boolean;   // Has notch/safe areas
  hasNotch: boolean;      // iPhone X+ style notch
}
```

### useNativeFeatures Composable

Access device features cross-platform:

```typescript
import { useNativeFeatures } from '@/composables/useNativeFeatures';

const {
  takePhoto,
  hapticFeedback,
  share,
  copyToClipboard,
  getCurrentPosition,
  openUrl
} = useNativeFeatures();

// Take a photo
const photo = await takePhoto({
  quality: 90,
  source: 'camera'
});

// Haptic feedback
await hapticFeedback('medium');

// Share content
await share({
  title: 'Check this out',
  text: 'Amazing content',
  url: 'https://synthstack.app'
});
```

## Mobile Development (Capacitor)

### Prerequisites

**All Platforms:**
- Node.js 20+
- pnpm 8+

**iOS Development (macOS only):**
- Xcode 15+ (install from Mac App Store)
- Xcode Command Line Tools: `xcode-select --install`
- CocoaPods: `sudo gem install cocoapods` or `brew install cocoapods`
- Apple Developer Account (for device testing and App Store)
- iOS 13.0+ target

**Android Development:**
- Android Studio (latest)
- Android SDK with API level 24+ (Android 7.0+)
- Java 17+

### iOS Development Setup

```bash
# 1. Install Xcode Command Line Tools
xcode-select --install

# 2. Install CocoaPods
sudo gem install cocoapods
# Or via Homebrew:
brew install cocoapods

# 3. Navigate to iOS project and install pods
cd apps/web/src-capacitor/ios/App
pod install

# 4. Open in Xcode
open App.xcworkspace
```

**Note:** You must open `App.xcworkspace` (not `App.xcodeproj`) to include CocoaPods dependencies.

### Initial Setup

```bash
# Navigate to web app
cd apps/web

# Install dependencies
pnpm install

# Initialize Capacitor (if not done)
cd src-capacitor
npm install

# Add platforms
npx cap add ios
npx cap add android
```

### Development

```bash
# iOS development
pnpm dev:ios

# Android development
pnpm dev:android
```

### Building

```bash
# Build web assets first
pnpm build

# iOS production build
pnpm build:ios

# Android production build
pnpm build:android
```

### Configuration

Edit `src-capacitor/capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.synthstack.mobile',
  appName: 'SynthStack',
  webDir: '../dist/spa',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0D0D0D'
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0D0D0D'
    }
  }
};
```

### Capacitor Plugins

The following plugins are included:

| Plugin | Purpose |
|--------|---------|
| `@capacitor/app` | App lifecycle events |
| `@capacitor/browser` | In-app browser |
| `@capacitor/camera` | Photo/video capture |
| `@capacitor/clipboard` | Copy/paste |
| `@capacitor/device` | Device information |
| `@capacitor/filesystem` | File system access |
| `@capacitor/haptics` | Vibration feedback |
| `@capacitor/keyboard` | Keyboard events |
| `@capacitor/network` | Network status |
| `@capacitor/preferences` | Key-value storage |
| `@capacitor/push-notifications` | Push notifications |
| `@capacitor/share` | Native share sheet |
| `@capacitor/splash-screen` | Splash screen control |
| `@capacitor/status-bar` | Status bar styling |

### iOS Specific

#### Code Signing

1. Open `src-capacitor/ios/App/App.xcworkspace` in Xcode
2. Select your team in Signing & Capabilities
3. Configure provisioning profiles

#### App Store Submission

```bash
# Archive and export
xcodebuild archive \
  -workspace App.xcworkspace \
  -scheme App \
  -archivePath App.xcarchive

xcodebuild -exportArchive \
  -archivePath App.xcarchive \
  -exportPath export \
  -exportOptionsPlist ExportOptions.plist
```

### Android Specific

#### Signing

Create/configure signing in `android/app/build.gradle`:

```gradle
android {
    signingConfigs {
        release {
            storeFile file('release.keystore')
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            keyAlias System.getenv('ANDROID_KEY_ALIAS')
            keyPassword System.getenv('ANDROID_KEY_PASSWORD')
        }
    }
}
```

#### Play Store Submission

```bash
# Build signed AAB
./gradlew bundleRelease
```

## Desktop Development (Electron)

### Prerequisites

- Node.js 20+
- Platform-specific build tools:
  - macOS: Xcode Command Line Tools
  - Windows: Visual Studio Build Tools
  - Linux: build-essential, rpm (optional)

### Development

```bash
# Start Electron dev server
pnpm dev:electron
```

### Building

```bash
# Build for current platform
pnpm build:electron

# Build for specific platform
pnpm build:electron:mac
pnpm build:electron:win
pnpm build:electron:linux
```

### Configuration

Main process configuration in `src-electron/electron-main.ts`:

```typescript
// Window configuration
mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  minWidth: 800,
  minHeight: 600,
  titleBarStyle: 'hiddenInset',  // macOS
  webPreferences: {
    preload: path.join(__dirname, 'electron-preload.js'),
    contextIsolation: true,
    nodeIntegration: false
  }
});
```

Build configuration in `src-electron/package.json`:

```json
{
  "build": {
    "appId": "app.synthstack.desktop",
    "productName": "SynthStack",
    "mac": {
      "category": "public.app-category.developer-tools",
      "hardenedRuntime": true,
      "notarize": true
    },
    "win": {
      "target": ["nsis", "portable"]
    },
    "linux": {
      "target": ["AppImage", "deb", "rpm"]
    }
  }
}
```

### useElectron Composable

Access Electron-specific features:

```typescript
import { useElectron } from '@/composables/useElectron';

const {
  isElectron,
  appInfo,
  updateStatus,

  // Window controls
  minimize,
  maximize,
  close,

  // Auto-updater
  checkForUpdates,
  downloadUpdate,
  installUpdate,

  // External
  openExternal,
  showInFolder
} = useElectron();

// Check for updates
await checkForUpdates();

// Open external URL
await openExternal('https://synthstack.app');
```

### Auto-Updates

Electron apps support automatic updates via GitHub Releases:

```typescript
// Main process
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();
```

Configure in `package.json`:

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "synthstack",
      "repo": "synthstack"
    }
  }
}
```

### Code Signing

#### macOS

Required for distribution:

```bash
# Sign the app
codesign --deep --force --sign "Developer ID Application: Your Name" \
  SynthStack.app

# Notarize
xcrun notarytool submit SynthStack.dmg \
  --apple-id your@email.com \
  --password app-specific-password \
  --team-id TEAMID \
  --wait
```

#### Windows

Optional but recommended:

```bash
# Sign with certificate
signtool sign /f certificate.pfx /p password /t http://timestamp.url \
  SynthStack-Setup.exe
```

## CI/CD Workflows

### Mobile Builds

`.github/workflows/mobile-builds.yml` handles:

1. iOS build and App Store submission
2. Android build and Play Store submission
3. GitHub Release creation

Required secrets:

```
IOS_P12_BASE64
IOS_P12_PASSWORD
APPSTORE_ISSUER_ID
APPSTORE_KEY_ID
APPSTORE_PRIVATE_KEY
PROVISIONING_PROFILE_BASE64
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
GOOGLE_PLAY_SERVICE_ACCOUNT
```

### Desktop Builds

`.github/workflows/desktop-builds.yml` handles:

1. macOS builds (Intel + Apple Silicon)
2. Windows builds (32-bit + 64-bit)
3. Linux builds (AppImage, deb, rpm)
4. Code signing and notarization
5. GitHub Release creation

Required secrets:

```
MAC_CERTS
MAC_CERTS_PASSWORD
APPLE_ID
APPLE_ID_PASSWORD
APPLE_TEAM_ID
WINDOWS_CERTS (optional)
WINDOWS_CERTS_PASSWORD (optional)
```

### Triggering Builds

```bash
# Create a release tag
git tag v1.0.0
git push origin v1.0.0

# Or trigger manually
gh workflow run mobile-builds.yml --field platform=ios
gh workflow run desktop-builds.yml --field platform=mac
```

## Platform-Specific UI

### Safe Area Handling

For devices with notches/cutouts:

```scss
// Applied automatically via CSS custom properties
.header {
  padding-top: env(safe-area-inset-top);
}

.footer {
  padding-bottom: env(safe-area-inset-bottom);
}
```

### Platform Classes

The body element receives platform classes:

```html
<body class="platform-ios is-native is-mobile has-notch has-safe-area">
```

Use in CSS:

```scss
.my-component {
  // Web default
  padding: 16px;

  // iOS override
  .platform-ios & {
    padding: 20px;
  }

  // Desktop override
  .is-desktop & {
    padding: 24px;
  }
}
```

### Conditional Components

```vue
<template>
  <NativeHeader v-if="platform.isNative" />
  <WebHeader v-else />
</template>
```

## Build Scripts Reference

```json
{
  "scripts": {
    // Mobile
    "dev:ios": "quasar dev -m capacitor -T ios",
    "dev:android": "quasar dev -m capacitor -T android",
    "build:ios": "quasar build -m capacitor -T ios",
    "build:android": "quasar build -m capacitor -T android",

    // Desktop
    "dev:electron": "quasar dev -m electron",
    "build:electron": "quasar build -m electron",
    "build:electron:mac": "quasar build -m electron -T darwin",
    "build:electron:win": "quasar build -m electron -T win32",
    "build:electron:linux": "quasar build -m electron -T linux"
  }
}
```

## App Mode Configuration

SynthStack supports two build modes that control which routes are included:

### Build Modes

| Mode | Platforms | Routes Included |
|------|-----------|-----------------|
| `full` | Web (SPA/SSR) | All routes including landing pages, marketing, community |
| `app` | Capacitor, Electron | App-only routes (auth, dashboard, no landing pages) |

### How It Works

The build mode is automatically set based on the target platform in `quasar.config.js`:

```javascript
env: {
  APP_MODE: (ctx.mode.capacitor || ctx.mode.electron) ? 'app' : 'full'
}
```

### Routes by Mode

**Always Included (both modes):**
- `/auth/*` - Authentication pages
- `/app/*` - Main application
- `/catalog` - Public catalog

**Web Only (`full` mode):**
- `/` - Landing page
- `/pricing`, `/features`, `/about`, `/contact`
- `/blog/*`, `/guides/*`, `/community/*`
- `/privacy`, `/terms`, `/cookies`, `/gdpr`
- `/docs/*`, `/faq`, `/news`, `/careers`

**Mobile/Desktop Behavior:**
- `/` redirects to `/app`
- Unknown routes redirect to `/app`
- Demo mode available for unauthenticated users

## Backend Configuration

### Directus CMS (Remote Only for Mobile/Desktop)

SynthStack uses Directus as a headless CMS for content management. **For mobile and desktop builds, Directus is always remote** - no local CMS is bundled with the app.

### Mobile/Desktop Build Requirements

When building for Capacitor (iOS/Android) or Electron:
1. **No Directus is bundled** - the app connects to your remote Directus instance
2. **Environment variables must point to remote URLs** - local Docker URLs won't work
3. **Content is fetched via API** at runtime from your hosted Directus

### Remote Directus Setup

**Environment Variables:**

```env
# Frontend (apps/web/.env)
VITE_DIRECTUS_URL=https://cms.yourdomain.com

# Backend API Gateway (packages/api-gateway/.env)
DIRECTUS_URL=https://cms.yourdomain.com
DIRECTUS_TOKEN=your-api-token
```

**Recommended Hosting Options:**
- [Directus Cloud](https://directus.cloud) - Managed hosting
- Self-hosted on Railway, Render, or DigitalOcean
- AWS/GCP/Azure with Docker

### Local vs Remote

| Setup | Use Case |
|-------|----------|
| Local (Docker) | Web development only |
| Remote | Production, mobile apps, desktop apps |

**For Mobile/Desktop Builds:**
- Always use remote Directus URL
- No local CMS is bundled with the app
- Content is fetched via API at runtime
- Visual editing features work with remote Directus

### Docker (Optional - Web Development Only)

For local **web development only**, you can run Directus via Docker:

```bash
# Start all services including Directus
docker-compose up directus

# Directus will be available at http://localhost:8099
```

**Important:** Docker Directus is for web development only. Mobile and desktop builds require a hosted Directus instance.

## Troubleshooting

### Capacitor Issues

**iOS build fails with signing errors:**
1. Open in Xcode and verify signing settings
2. Ensure provisioning profile matches bundle ID
3. Check team selection

**Android build fails:**
1. Verify JAVA_HOME is set correctly
2. Accept Android SDK licenses: `sdkmanager --licenses`
3. Sync Gradle: `npx cap sync android`

### Electron Issues

**App doesn't start:**
1. Check developer tools for errors
2. Verify preload script path
3. Check main process logs

**"Cannot find module 'electron'" or "app is undefined":**
This usually means `ELECTRON_RUN_AS_NODE` environment variable is set. Fix by:
```bash
unset ELECTRON_RUN_AS_NODE
pnpm dev:electron
```

**require('electron') returns a path string instead of the module:**
Same issue as above - the Electron runtime isn't properly initializing. Clear the env var.

**Preload script not found:**
Check that the preload path in electron-main.ts matches Quasar's output:
- Dev mode: `preload/electron-preload.cjs`
- Prod mode: `electron-preload.js`

**Updates not working:**
1. Verify publish configuration
2. Check GitHub release assets
3. Ensure code signing is correct

**macOS notarization fails:**
1. Verify Apple ID credentials
2. Check hardened runtime entitlements
3. Review notarization logs

### General Issues

**Native features not working:**
1. Check platform detection
2. Verify plugin installation
3. Review Capacitor/Electron logs

**UI looks wrong:**
1. Check platform classes on body
2. Verify CSS is platform-aware
3. Test safe area handling

## Related Documentation

- [Quasar Capacitor Mode](https://quasar.dev/quasar-cli-vite/developing-capacitor-apps/introduction)
- [Quasar Electron Mode](https://quasar.dev/quasar-cli-vite/developing-electron-apps/introduction)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder Documentation](https://www.electron.build/)
