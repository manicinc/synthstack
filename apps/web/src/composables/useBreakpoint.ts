/**
 * useBreakpoint Composable
 * 
 * Reactive breakpoint detection for responsive layouts and logic.
 * Follows Quasar breakpoint conventions for consistency.
 * 
 * @module composables/useBreakpoint
 * @example
 * ```ts
 * const { isMobile, isTablet, isDesktop } = useBreakpoint()
 * const columns = computed(() => isMobile.value ? 1 : 3)
 * ```
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'

/** Breakpoint values (matches Quasar defaults) */
export const BREAKPOINTS = {
  xs: 0,
  sm: 600,
  md: 1024,
  lg: 1440,
  xl: 1920
} as const

export type BreakpointName = keyof typeof BREAKPOINTS

/**
 * Main breakpoint composable
 */
export function useBreakpoint() {
  const width = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
  const height = ref(typeof window !== 'undefined' ? window.innerHeight : 768)

  /** Current breakpoint name */
  const name = computed<BreakpointName>(() => {
    const w = width.value
    if (w >= BREAKPOINTS.xl) return 'xl'
    if (w >= BREAKPOINTS.lg) return 'lg'
    if (w >= BREAKPOINTS.md) return 'md'
    if (w >= BREAKPOINTS.sm) return 'sm'
    return 'xs'
  })

  /** Check if current breakpoint is at least the given size */
  const gte = (bp: BreakpointName) => width.value >= BREAKPOINTS[bp]

  /** Check if current breakpoint is at most the given size */
  const lt = (bp: BreakpointName) => width.value < BREAKPOINTS[bp]

  // Convenience computed refs
  const isXs = computed(() => name.value === 'xs')
  const isSm = computed(() => name.value === 'sm')
  const isMd = computed(() => name.value === 'md')
  const isLg = computed(() => name.value === 'lg')
  const isXl = computed(() => name.value === 'xl')

  /** Is mobile (xs or sm) */
  const isMobile = computed(() => lt('md'))

  /** Is tablet (md) */
  const isTablet = computed(() => name.value === 'md')

  /** Is desktop (lg or xl) */
  const isDesktop = computed(() => gte('lg'))

  /** Is touch device (mobile or tablet) */
  const isTouch = computed(() => lt('lg'))

  /** Handle window resize */
  const handleResize = () => {
    width.value = window.innerWidth
    height.value = window.innerHeight
  }

  onMounted(() => {
    window.addEventListener('resize', handleResize, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })

  return {
    width,
    height,
    name,
    gte,
    lt,
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    isMobile,
    isTablet,
    isDesktop,
    isTouch
  }
}

export default useBreakpoint





