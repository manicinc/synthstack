import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useHistoryStore } from './history'

describe('History Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with mock history', () => {
    const store = useHistoryStore()
    expect(store.history.length).toBeGreaterThan(0)
  })

  it('deletes history item', () => {
    const store = useHistoryStore()
    const initialLength = store.history.length
    const idToDelete = store.history[0].id
    
    store.deleteHistoryItem(idToDelete)
    expect(store.history.length).toBe(initialLength - 1)
    expect(store.history.find(h => h.id === idToDelete)).toBeUndefined()
  })
})

