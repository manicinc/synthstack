/**
 * useToast Composable
 * 
 * Wrapper around Quasar's notify plugin for consistent toast notifications.
 * Provides typed methods for success, error, warning, and info notifications.
 * 
 * @module composables/useToast
 * @example
 * ```ts
 * const { success, error } = useToast()
 * success('Profile saved!')
 * error('Failed to save profile')
 * ```
 */

import { useQuasar } from 'quasar'

/** Toast options */
export interface ToastOptions {
  /** Toast message */
  message: string
  /** Optional caption/subtitle */
  caption?: string
  /** Duration in ms (0 = persistent) */
  timeout?: number
  /** Action button label */
  action?: string
  /** Action button callback */
  onAction?: () => void
}

/**
 * Main toast composable
 */
export function useToast() {
  const $q = useQuasar()

  /**
   * Base notification method
   */
  const notify = (
    type: 'positive' | 'negative' | 'warning' | 'info',
    options: ToastOptions | string
  ) => {
    const opts = typeof options === 'string' ? { message: options } : options

    $q.notify({
      type,
      message: opts.message,
      caption: opts.caption,
      timeout: opts.timeout ?? 3000,
      position: 'bottom-right',
      actions: opts.action
        ? [{
            label: opts.action,
            color: 'white',
            handler: opts.onAction
          }]
        : undefined
    })
  }

  /**
   * Success notification (green)
   */
  const success = (options: ToastOptions | string) => {
    notify('positive', options)
  }

  /**
   * Error notification (red)
   */
  const error = (options: ToastOptions | string) => {
    notify('negative', options)
  }

  /**
   * Warning notification (yellow)
   */
  const warning = (options: ToastOptions | string) => {
    notify('warning', options)
  }

  /**
   * Info notification (blue)
   */
  const info = (options: ToastOptions | string) => {
    notify('info', options)
  }

  return {
    success,
    error,
    warning,
    info,
    notify
  }
}

export default useToast





