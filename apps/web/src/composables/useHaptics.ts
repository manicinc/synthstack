import { useNativeFeatures } from './useNativeFeatures';

/**
 * Composable for haptic feedback
 * Wrapper around useNativeFeatures with convenience methods
 */
export function useHaptics() {
  const {
    hapticFeedback,
    hapticSelectionStart,
    hapticSelectionChanged,
    hapticSelectionEnd
  } = useNativeFeatures();

  return {
    // Success feedback (success notification)
    success: () => hapticFeedback('success'),

    // Error feedback (error notification)
    error: () => hapticFeedback('error'),

    // Warning feedback (warning notification)
    warning: () => hapticFeedback('warning'),

    // Light impact
    light: () => hapticFeedback('light'),

    // Medium impact
    medium: () => hapticFeedback('medium'),

    // Heavy impact
    heavy: () => hapticFeedback('heavy'),

    // Selection feedback (for UI selections)
    selection: () => hapticSelectionStart(),
    selectionStart: () => hapticSelectionStart(),
    selectionChanged: () => hapticSelectionChanged(),
    selectionEnd: () => hapticSelectionEnd(),

    // Direct access for backward compatibility
    haptics: {
      impact: (style: 'light' | 'medium' | 'heavy') => hapticFeedback(style),
      notification: (type: 'success' | 'warning' | 'error') => hapticFeedback(type),
      selection: () => hapticSelectionStart()
    }
  };
}

export default useHaptics;
