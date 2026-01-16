import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useToast } from './useToast'

// Mock Quasar
vi.mock('quasar', () => ({
  useQuasar: () => ({
    notify: vi.fn()
  })
}))

describe('useToast', () => {
  it('should export all notification methods', () => {
    const toast = useToast()
    
    expect(toast.success).toBeDefined()
    expect(toast.error).toBeDefined()
    expect(toast.warning).toBeDefined()
    expect(toast.info).toBeDefined()
    expect(toast.notify).toBeDefined()
  })

  it('should accept string or options object', () => {
    const toast = useToast()
    
    // These should not throw
    expect(() => toast.success('Test message')).not.toThrow()
    expect(() => toast.success({ message: 'Test', caption: 'Caption' })).not.toThrow()
  })
})





