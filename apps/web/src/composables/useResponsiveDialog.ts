import { computed } from 'vue';
import { useQuasar } from 'quasar';

/**
 * Composable for responsive dialogs
 * Auto-switches between QDialog (desktop) and QBottomSheet (mobile)
 */
export function useResponsiveDialog() {
  const $q = useQuasar();

  const isMobile = computed(() => $q.screen.lt.md);

  const dialogComponent = computed(() =>
    isMobile.value ? 'q-bottom-sheet' : 'q-dialog'
  );

  const dialogProps = computed(() => {
    if (isMobile.value) {
      return {};
    }

    return {
      style: 'min-width: 400px; max-width: 600px'
    };
  });

  return {
    isMobile,
    dialogComponent,
    dialogProps
  };
}

export default useResponsiveDialog;
