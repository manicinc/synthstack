import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref } from 'vue'
import { useDebouncedFn } from './useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('useDebouncedFn', () => {
    it('should debounce function calls', () => {
      const mockFn = vi.fn()
      const debouncedFn = useDebouncedFn(mockFn, 100)
      
      debouncedFn('arg1')
      debouncedFn('arg2')
      debouncedFn('arg3')
      
      expect(mockFn).not.toHaveBeenCalled()
      
      vi.advanceTimersByTime(100)
      
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('arg3')
    })

    it('should reset timeout on new calls', () => {
      const mockFn = vi.fn()
      const debouncedFn = useDebouncedFn(mockFn, 100)
      
      debouncedFn('first')
      vi.advanceTimersByTime(50)
      
      debouncedFn('second')
      vi.advanceTimersByTime(50)
      
      expect(mockFn).not.toHaveBeenCalled()
      
      vi.advanceTimersByTime(50)
      
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('second')
    })
  })

  // Note: useDebouncedRef and useDebounce tests with Vue reactivity
  // are more complex due to watch() async behavior. For comprehensive
  // testing, use integration/e2e tests or test in component context.
})
