/**
 * Theme Initialization Boot File
 */
import { boot } from 'quasar/wrappers';
import { Dark } from 'quasar';
import { watch } from 'vue';
import { useThemeStore } from '../stores/theme';

declare global {
  interface Window {
    __SYNTHSTACK_INITIAL_DARK__?: boolean;
  }
}

export default boot(({ app: _app }): void => {
  // Skip during SSR
  if (typeof window === 'undefined') return;

  // Immediately sync Quasar's Dark plugin with the inline script's determination
  // This runs BEFORE the theme store initializes to prevent any flash
  if (typeof window.__SYNTHSTACK_INITIAL_DARK__ !== 'undefined') {
    Dark.set(window.__SYNTHSTACK_INITIAL_DARK__);
  }

  // Initialize theme after Pinia is ready
  const themeStore = useThemeStore();
  themeStore.initialize();

  // Keep Quasar's Dark plugin in sync with the theme store (single source of truth).
  watch(
    () => themeStore.isDark,
    (isDark) => {
      Dark.set(isDark);
    },
    { immediate: true, flush: 'sync' }
  );

  // Remove no-transitions class and theme override after theme is fully applied
  // Use requestAnimationFrame to ensure all CSS has been applied
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('no-transitions');
    });
  });
});
