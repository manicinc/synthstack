/**
 * Composables Index
 * 
 * Central export point for all composables.
 * Import composables from here for cleaner imports.
 * 
 * @module composables
 * @example
 * ```ts
 * import { useApi, useToast, useSeo } from 'src/composables'
 * ```
 */

export { useApi } from './useApi'
export { useSeo } from './useSeo'
export { useToast } from './useToast'
export { useDebounce, useDebouncedRef, useDebouncedFn } from './useDebounce'
export { useBreakpoint, BREAKPOINTS } from './useBreakpoint'
// COMMUNITY: useCopilot removed (PRO feature)
export { useBranding } from './useBranding'
export { useLogoAnimation } from './useLogoAnimation'
export { useDocs } from './useDocs'
export { useOnboarding } from './useOnboarding'
export { useBYOKTooltips } from './useBYOKTooltips'

// Re-export types
export type { ApiResponse, ApiError } from './useApi'
export type { ToastOptions } from './useToast'
export type { BreakpointName } from './useBreakpoint'
export type { AnimationPhase, AnimationIntensity, UseLogoAnimationOptions } from './useLogoAnimation'
export type { DocContent, DocHeading } from './useDocs'
export type { BYOKTooltips, BYOKTooltipContent } from './useBYOKTooltips'

// Re-export branding config
export { branding, type BrandingConfig } from '@/config/branding'





