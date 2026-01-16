import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { devLog, devWarn, devError, logError } from '@/utils/devLogger';

/**
 * Composable for pull-to-refresh functionality on mobile
 */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const $q = useQuasar();
  const refreshing = ref(false);

  const isMobile = $q.screen.lt.md;

  const handleRefresh = async (done: () => void) => {
    // Skip if not mobile
    if (!isMobile) {
      done();
      return;
    }

    refreshing.value = true;

    try {
      await onRefresh();
    } catch (error) {
      logError('Refresh failed:', error);
    } finally {
      refreshing.value = false;
      done();
    }
  };

  return {
    refreshing,
    handleRefresh,
    isMobile
  };
}

export default usePullToRefresh;
