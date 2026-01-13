/**
 * Theme Initialization Boot File
 */
import { boot } from 'quasar/wrappers';
import { Dark } from 'quasar';
import { watch } from 'vue';
import { useThemeStore } from '../stores/theme';

export default boot(({ app: _app }): void => {
  // Skip during SSR
  if (typeof window === 'undefined') return;

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
});
