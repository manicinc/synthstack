/**
 * useDebounce Composable
 * 
 * Provides debounced values and functions for performance optimization.
 * Useful for search inputs, API calls, and other frequent operations.
 * 
 * @module composables/useDebounce
 * @example
 * ```ts
 * const { debouncedValue } = useDebounce(searchTerm, 300)
 * watch(debouncedValue, (val) => fetchResults(val))
 * ```
 */

import { ref, watch, Ref, UnwrapRef } from 'vue'

/**
 * Creates a debounced ref that updates after a delay
 * 
 * @param source - Source ref to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced ref
 */
export function useDebouncedRef<T>(source: Ref<T>, delay = 300): Ref<UnwrapRef<T>> {
  const debounced = ref(source.value) as Ref<UnwrapRef<T>>
  let timeout: ReturnType<typeof setTimeout> | null = null

  watch(source, (newValue) => {
    if (timeout) clearTimeout(timeout)
    
    timeout = setTimeout(() => {
      debounced.value = newValue as UnwrapRef<T>
    }, delay)
  })

  return debounced
}

/**
 * Creates a debounced function
 * 
 * @param fn - Function to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced function
 */
export function useDebouncedFn<T extends (...args: any[]) => any>(
  fn: T,
  delay = 300
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    
    timeout = setTimeout(() => {
      fn(...args)
    }, delay)
  }
}

/**
 * Main debounce composable with both ref and function variants
 */
export function useDebounce<T>(source: Ref<T>, delay = 300) {
  const debouncedValue = useDebouncedRef(source, delay)
  const pending = ref(false)

  watch(source, () => {
    pending.value = true
  })

  watch(debouncedValue, () => {
    pending.value = false
  })

  return {
    debouncedValue,
    pending
  }
}

export default useDebounce





