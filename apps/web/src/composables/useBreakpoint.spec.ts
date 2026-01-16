import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useBreakpoint, BREAKPOINTS } from './useBreakpoint'

describe('useBreakpoint', () => {
  const originalInnerWidth = window.innerWidth
  const originalInnerHeight = window.innerHeight

  beforeEach(() => {
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768
    })
  })

  afterEach(() => {
    // Restore original dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight
    })
  })

  it('should have correct breakpoint values', () => {
    expect(BREAKPOINTS.xs).toBe(0)
    expect(BREAKPOINTS.sm).toBe(600)
    expect(BREAKPOINTS.md).toBe(1024)
    expect(BREAKPOINTS.lg).toBe(1440)
    expect(BREAKPOINTS.xl).toBe(1920)
  })

  it('should detect correct breakpoint name', () => {
    const { name, isMd } = useBreakpoint()
    
    // With 1024px width, should be 'md'
    expect(name.value).toBe('md')
    expect(isMd.value).toBe(true)
  })

  it('should calculate mobile/desktop correctly', () => {
    const { isMobile, isDesktop, isTablet } = useBreakpoint()
    
    // At 1024px (md), should be tablet
    expect(isMobile.value).toBe(false)
    expect(isTablet.value).toBe(true)
    expect(isDesktop.value).toBe(false)
  })

  it('should provide gte and lt helpers', () => {
    const { gte, lt } = useBreakpoint()
    
    // At 1024px
    expect(gte('md')).toBe(true)
    expect(gte('lg')).toBe(false)
    expect(lt('lg')).toBe(true)
    expect(lt('md')).toBe(false)
  })
})





