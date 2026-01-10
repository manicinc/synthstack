/**
 * Theme Initialization Boot File
 */
import { boot } from 'quasar/wrappers';
import { useThemeStore } from '../stores/theme';

export default boot(({ app: _app }): void => {
  // Skip during SSR
  if (typeof window === 'undefined') return;

  // Initialize theme after Pinia is ready
  const themeStore = useThemeStore();
  themeStore.initialize();
});

