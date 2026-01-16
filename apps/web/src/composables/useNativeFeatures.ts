/**
 * Native Features Composable
 *
 * Provides unified access to native device features across platforms.
 * Wraps Capacitor plugins and provides fallbacks for web.
 *
 * Features:
 * - Camera access
 * - Haptic feedback
 * - Share functionality
 * - Clipboard
 * - Push notifications
 * - Geolocation
 * - Device info
 * - App/URL launching
 */

import { ref } from 'vue';
import { usePlatform } from './usePlatform';

// ============================================
// Types
// ============================================

export interface CameraOptions {
  quality?: number;
  allowEditing?: boolean;
  resultType?: 'uri' | 'base64' | 'dataUrl';
  source?: 'camera' | 'photos' | 'prompt';
}

export interface CameraResult {
  dataUrl?: string;
  base64String?: string;
  path?: string;
  webPath?: string;
  format?: string;
}

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
  files?: string[];
}

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

// ============================================
// Composable
// ============================================

export function useNativeFeatures() {
  const { platform, isSupportedFeature } = usePlatform();

  // State
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ============================================
  // Camera
  // ============================================

  async function takePhoto(options: CameraOptions = {}): Promise<CameraResult | null> {
    if (!isSupportedFeature('camera')) {
      error.value = 'Camera not supported on this device';
      return null;
    }

    loading.value = true;
    error.value = null;

    try {
      if (platform.value.isCapacitor) {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

        const resultTypeMap = {
          uri: CameraResultType.Uri,
          base64: CameraResultType.Base64,
          dataUrl: CameraResultType.DataUrl,
        };

        const sourceMap = {
          camera: CameraSource.Camera,
          photos: CameraSource.Photos,
          prompt: CameraSource.Prompt,
        };

        const image = await Camera.getPhoto({
          quality: options.quality || 90,
          allowEditing: options.allowEditing ?? true,
          resultType: resultTypeMap[options.resultType || 'dataUrl'],
          source: sourceMap[options.source || 'prompt'],
        });

        return {
          dataUrl: image.dataUrl,
          base64String: image.base64String,
          path: image.path,
          webPath: image.webPath,
          format: image.format,
        };
      } else {
        // Web fallback - use file input
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          if (options.source === 'camera') {
            input.capture = 'environment';
          }

          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
              resolve(null);
              return;
            }

            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                dataUrl: reader.result as string,
                format: file.type.split('/')[1],
              });
            };
            reader.readAsDataURL(file);
          };

          input.click();
        });
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to capture photo';
      return null;
    } finally {
      loading.value = false;
    }
  }

  // ============================================
  // Haptics
  // ============================================

  async function hapticFeedback(style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'medium') {
    if (!isSupportedFeature('haptics')) return;

    try {
      if (platform.value.isCapacitor) {
        const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');

        if (style === 'success' || style === 'warning' || style === 'error') {
          await Haptics.notification({
            type: style === 'success' ? NotificationType.Success :
                  style === 'warning' ? NotificationType.Warning :
                  NotificationType.Error,
          });
        } else {
          await Haptics.impact({
            style: style === 'light' ? ImpactStyle.Light :
                   style === 'heavy' ? ImpactStyle.Heavy :
                   ImpactStyle.Medium,
          });
        }
      } else if ('vibrate' in navigator) {
        // Web fallback
        const duration = style === 'light' ? 10 :
                        style === 'medium' ? 20 :
                        style === 'heavy' ? 40 : 30;
        navigator.vibrate(duration);
      }
    } catch {
      // Silently fail
    }
  }

  async function hapticSelectionStart() {
    if (platform.value.isCapacitor) {
      try {
        const { Haptics } = await import('@capacitor/haptics');
        await Haptics.selectionStart();
      } catch {
        // Ignore haptics errors - feature may not be available on all devices
      }
    }
  }

  async function hapticSelectionChanged() {
    if (platform.value.isCapacitor) {
      try {
        const { Haptics } = await import('@capacitor/haptics');
        await Haptics.selectionChanged();
      } catch {
        // Ignore haptics errors - feature may not be available on all devices
      }
    }
  }

  async function hapticSelectionEnd() {
    if (platform.value.isCapacitor) {
      try {
        const { Haptics } = await import('@capacitor/haptics');
        await Haptics.selectionEnd();
      } catch {
        // Ignore haptics errors - feature may not be available on all devices
      }
    }
  }

  // ============================================
  // Share
  // ============================================

  async function share(options: ShareOptions): Promise<boolean> {
    if (!isSupportedFeature('share')) {
      error.value = 'Share not supported';
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      if (platform.value.isCapacitor) {
        const { Share } = await import('@capacitor/share');
        await Share.share({
          title: options.title,
          text: options.text,
          url: options.url,
          dialogTitle: options.dialogTitle,
          files: options.files,
        });
        return true;
      } else if ('share' in navigator) {
        await navigator.share({
          title: options.title,
          text: options.text,
          url: options.url,
        });
        return true;
      }
      return false;
    } catch (err: any) {
      // User cancelled share is not an error
      if (err.name !== 'AbortError') {
        error.value = err.message || 'Failed to share';
      }
      return false;
    } finally {
      loading.value = false;
    }
  }

  // ============================================
  // Clipboard
  // ============================================

  async function copyToClipboard(text: string): Promise<boolean> {
    loading.value = true;
    error.value = null;

    try {
      if (platform.value.isCapacitor) {
        const { Clipboard } = await import('@capacitor/clipboard');
        await Clipboard.write({ string: text });
        await hapticFeedback('success');
        return true;
      } else if ('clipboard' in navigator) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      return false;
    } catch (err: any) {
      error.value = err.message || 'Failed to copy';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function readFromClipboard(): Promise<string | null> {
    loading.value = true;
    error.value = null;

    try {
      if (platform.value.isCapacitor) {
        const { Clipboard } = await import('@capacitor/clipboard');
        const result = await Clipboard.read();
        return result.value;
      } else if ('clipboard' in navigator) {
        return await navigator.clipboard.readText();
      }
      return null;
    } catch (err: any) {
      error.value = err.message || 'Failed to read clipboard';
      return null;
    } finally {
      loading.value = false;
    }
  }

  // ============================================
  // Geolocation
  // ============================================

  async function getCurrentPosition(): Promise<GeolocationPosition | null> {
    if (!isSupportedFeature('geolocation')) {
      error.value = 'Geolocation not supported';
      return null;
    }

    loading.value = true;
    error.value = null;

    try {
      if (platform.value.isCapacitor) {
        const { Geolocation } = await import('@capacitor/geolocation');
        const position = await Geolocation.getCurrentPosition();
        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude ?? undefined,
          altitudeAccuracy: position.coords.altitudeAccuracy ?? undefined,
          heading: position.coords.heading ?? undefined,
          speed: position.coords.speed ?? undefined,
          timestamp: position.timestamp,
        };
      } else {
        return new Promise((resolve, _reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude ?? undefined,
                altitudeAccuracy: position.coords.altitudeAccuracy ?? undefined,
                heading: position.coords.heading ?? undefined,
                speed: position.coords.speed ?? undefined,
                timestamp: position.timestamp,
              });
            },
            (err) => {
              error.value = err.message;
              resolve(null);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
          );
        });
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to get location';
      return null;
    } finally {
      loading.value = false;
    }
  }

  // ============================================
  // App/URL Opening
  // ============================================

  async function openUrl(url: string, openInBrowser = false): Promise<void> {
    try {
      if (platform.value.isCapacitor && openInBrowser) {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url });
      } else if (platform.value.isElectron) {
        (window as any).electron?.openExternal?.(url);
      } else {
        window.open(url, '_blank');
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to open URL';
    }
  }

  // ============================================
  // Status Bar (iOS/Android)
  // ============================================

  async function setStatusBarStyle(style: 'dark' | 'light') {
    if (!platform.value.isCapacitor) return;

    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      await StatusBar.setStyle({
        style: style === 'dark' ? Style.Dark : Style.Light,
      });
    } catch {
      // Ignore status bar errors - feature may not be available on all devices
    }
  }

  async function hideStatusBar() {
    if (!platform.value.isCapacitor) return;

    try {
      const { StatusBar } = await import('@capacitor/status-bar');
      await StatusBar.hide();
    } catch {
      // Ignore status bar errors - feature may not be available on all devices
    }
  }

  async function showStatusBar() {
    if (!platform.value.isCapacitor) return;

    try {
      const { StatusBar } = await import('@capacitor/status-bar');
      await StatusBar.show();
    } catch {
      // Ignore status bar errors - feature may not be available on all devices
    }
  }

  // ============================================
  // Keyboard (iOS/Android)
  // ============================================

  async function hideKeyboard() {
    if (!platform.value.isCapacitor) return;

    try {
      const { Keyboard } = await import('@capacitor/keyboard');
      await Keyboard.hide();
    } catch {
      // Ignore keyboard errors - feature may not be available on all devices
    }
  }

  // ============================================
  // Return
  // ============================================

  return {
    // State
    loading,
    error,

    // Camera
    takePhoto,

    // Haptics
    hapticFeedback,
    hapticSelectionStart,
    hapticSelectionChanged,
    hapticSelectionEnd,

    // Share
    share,

    // Clipboard
    copyToClipboard,
    readFromClipboard,

    // Geolocation
    getCurrentPosition,

    // URL/App
    openUrl,

    // Status Bar
    setStatusBarStyle,
    hideStatusBar,
    showStatusBar,

    // Keyboard
    hideKeyboard,
  };
}
