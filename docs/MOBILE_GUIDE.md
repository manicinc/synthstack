# Mobile Development Guide

Build iOS, Android, and desktop apps from the same Vue/Quasar codebase using Capacitor.

## Platform Support

| Platform | Status | Build Tool |
|----------|--------|------------|
| Web | Production | Vite |
| PWA | Production | Vite + Service Worker |
| iOS | Production | Xcode |
| Android | Production | Android Studio |
| Electron (Desktop) | Production | Electron Builder |

## Quick Start

### iOS Development

```bash
# Prerequisites
# - macOS with Xcode installed
# - Apple Developer account (for device testing)

cd apps/web

# Build web assets
pnpm build

# Sync to iOS
cd src-capacitor
npx cap sync ios

# Open in Xcode
npx cap open ios
```

### Android Development

```bash
# Prerequisites
# - Android Studio installed
# - JDK 17+

cd apps/web

# Build web assets
pnpm build

# Sync to Android
cd src-capacitor
npx cap sync android

# Open in Android Studio
npx cap open android
```

## Capacitor Plugins Configured

SynthStack includes these Capacitor plugins pre-configured:

| Plugin | Purpose |
|--------|---------|
| `@capacitor/app` | App lifecycle events |
| `@capacitor/browser` | In-app browser |
| `@capacitor/camera` | Photo/video capture |
| `@capacitor/clipboard` | Copy/paste support |
| `@capacitor/filesystem` | File operations |
| `@capacitor/haptics` | Vibration feedback |
| `@capacitor/keyboard` | Keyboard events |
| `@capacitor/network` | Network status |
| `@capacitor/preferences` | Key-value storage |
| `@capacitor/push-notifications` | Push notifications |
| `@capacitor/share` | Native share dialog |
| `@capacitor/splash-screen` | App splash screen |
| `@capacitor/status-bar` | Status bar styling |

## Offline-First Architecture

SynthStack implements offline-first patterns for mobile:

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Vue Component                          │
│                    (Optimistic UI)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Pinia Store                            │
│              (Local State + Sync Status)                    │
└─────────────────────────────────────────────────────────────┘
          │                                        │
          ▼                                        ▼
┌──────────────────────┐              ┌──────────────────────┐
│     IndexedDB        │              │     Sync Queue       │
│   (Local Storage)    │              │  (Pending Changes)   │
└──────────────────────┘              └──────────────────────┘
                                               │
                                               ▼
                                      ┌──────────────────────┐
                                      │     API Gateway      │
                                      │   (When Online)      │
                                      └──────────────────────┘
```

### Using the Offline API

```typescript
// apps/web/src/services/offline-api.ts
import { offlineApi } from '@/services/offline-api';

// Create with optimistic update
const project = await offlineApi.projects.create({
  name: 'My Project',
  description: 'Created offline',
});
// Returns immediately with local ID
// Syncs to server when online

// Read from local cache first
const projects = await offlineApi.projects.list();
// Returns cached data, refreshes in background

// Update with automatic sync
await offlineApi.projects.update(project.id, {
  name: 'Updated Name',
});
```

### Network Status Detection

```typescript
// apps/web/src/composables/useOffline.ts
import { useOffline } from '@/composables/useOffline';

const { isOnline, isOffline, whenOnline } = useOffline();

// React to network changes
watch(isOnline, (online) => {
  if (online) {
    console.log('Back online - syncing...');
  }
});

// Execute when online (immediate or later)
whenOnline(() => {
  syncAllData();
});
```

### Sync Queue

```typescript
// Check pending sync operations
import { useSyncStore } from '@/stores/sync';

const syncStore = useSyncStore();

// Number of pending operations
console.log(syncStore.pendingCount);

// Force sync attempt
await syncStore.syncAll();

// Listen for sync events
syncStore.$onAction(({ name, after }) => {
  after(() => {
    if (name === 'syncComplete') {
      showNotification('All changes synced!');
    }
  });
});
```

### Conflict Resolution

```typescript
// apps/web/src/services/sync/conflict.ts
export type ConflictStrategy =
  | 'local-wins'    // Keep local changes
  | 'server-wins'   // Accept server version
  | 'merge'         // Attempt to merge
  | 'manual';       // Prompt user

// Default strategies by field type
const defaultStrategies = {
  name: 'local-wins',        // User's recent edit wins
  updatedAt: 'server-wins',  // Server timestamp authoritative
  tags: 'merge',             // Merge arrays
  content: 'manual',         // Prompt for complex fields
};
```

## IndexedDB Schema

```typescript
// apps/web/src/services/db/schema.ts
export interface SynthStackDB {
  projects: {
    key: string;
    value: Project & SyncMetadata;
  };
  workflows: {
    key: string;
    value: Workflow & SyncMetadata;
  };
  agents: {
    key: string;
    value: Agent & SyncMetadata;
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
  };
}

interface SyncMetadata {
  _localId: string;
  _serverId?: string;
  _syncStatus: 'synced' | 'pending' | 'conflict';
  _localUpdatedAt: number;
  _serverUpdatedAt?: number;
}

interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entity: keyof SynthStackDB;
  entityId: string;
  payload: unknown;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed';
}
```

## Mobile-Specific Features

### Push Notifications

```typescript
// apps/web/src/services/notifications.ts
import { PushNotifications } from '@capacitor/push-notifications';

// Register for push notifications
await PushNotifications.register();

// Handle incoming notifications
PushNotifications.addListener('pushNotificationReceived', (notification) => {
  console.log('Push received:', notification);
});

// Handle notification tap
PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
  console.log('Push action:', action);
  // Navigate to relevant screen
  router.push(action.notification.data.route);
});
```

### Camera Integration

```typescript
// apps/web/src/composables/useCamera.ts
import { Camera, CameraResultType } from '@capacitor/camera';

export function useCamera() {
  const takePhoto = async () => {
    const photo = await Camera.getPhoto({
      quality: 90,
      resultType: CameraResultType.Base64,
    });
    return photo.base64String;
  };

  return { takePhoto };
}
```

### File System Access

```typescript
// apps/web/src/services/files.ts
import { Filesystem, Directory } from '@capacitor/filesystem';

// Save file locally
await Filesystem.writeFile({
  path: 'documents/report.pdf',
  data: base64Data,
  directory: Directory.Documents,
});

// Read local file
const file = await Filesystem.readFile({
  path: 'documents/report.pdf',
  directory: Directory.Documents,
});
```

### Haptic Feedback

```typescript
// apps/web/src/composables/useHaptics.ts
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export function useHaptics() {
  const impact = (style: ImpactStyle = ImpactStyle.Medium) => {
    Haptics.impact({ style });
  };

  const vibrate = () => {
    Haptics.vibrate();
  };

  return { impact, vibrate };
}
```

## Build & Release

### iOS Release

```bash
# Build production web assets
cd apps/web
pnpm build

# Sync to iOS
cd src-capacitor
npx cap sync ios

# Open Xcode for release build
npx cap open ios
# In Xcode: Product → Archive → Distribute
```

### Android Release

```bash
# Build production web assets
cd apps/web
pnpm build

# Sync to Android
cd src-capacitor
npx cap sync android

# Build signed APK/AAB
cd android
./gradlew assembleRelease  # APK
./gradlew bundleRelease    # AAB for Play Store
```

### Electron Release

```bash
cd apps/web

# Build for all platforms
pnpm build:electron

# Platform-specific builds
pnpm build:electron:mac
pnpm build:electron:win
pnpm build:electron:linux
```

## Development Tips

### Live Reload on Device

```bash
# Start dev server with external access
cd apps/web
pnpm dev --host

# Update capacitor.config.ts with your local IP
# server: {
#   url: 'http://192.168.1.x:3050',
#   cleartext: true
# }

npx cap sync
```

### Debugging

```bash
# iOS: Use Safari Developer Tools
# Enable in Safari → Develop → [Your Device]

# Android: Use Chrome DevTools
# chrome://inspect → Remote devices
```

### Platform Detection

```typescript
// apps/web/src/composables/usePlatform.ts
import { Capacitor } from '@capacitor/core';

export function usePlatform() {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

  return { isNative, platform };
}
```

## Troubleshooting

### iOS Build Fails

```bash
# Clean and rebuild
cd src-capacitor/ios
rm -rf Pods Podfile.lock
pod install
```

### Android Gradle Issues

```bash
# Clean Gradle cache
cd src-capacitor/android
./gradlew clean
./gradlew build
```

### Capacitor Sync Issues

```bash
# Full clean sync
npx cap sync --force
```

## Next Steps

- [TypeScript Quick Start](./QUICKSTART_TYPESCRIPT.md)
- [Full AI Stack Guide](./QUICKSTART_FULL_AI.md)
- [Architecture Decision Guide](./ARCHITECTURE_DECISION.md)
