import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useProfilesStore } from './profiles'

describe('Profiles Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with mock profiles', () => {
    const store = useProfilesStore()
    expect(store.profiles.length).toBeGreaterThan(0)
  })

  it('retrieves profile by id', () => {
    const store = useProfilesStore()
    const id = store.profiles[0].id
    const profile = store.getProfileById(id)
    expect(profile).toBeDefined()
    expect(profile?.id).toBe(id)
  })

  it('handles voting', () => {
    const store = useProfilesStore()
    const profile = store.profiles[0]
    const initialVotes = profile.votes
    
    store.voteProfile(profile.id, 'up')
    expect(profile.votes).toBe(initialVotes + 1)

    store.voteProfile(profile.id, 'down')
    expect(profile.votes).toBe(initialVotes) // Back to original
  })

  it('adds comments', () => {
    const store = useProfilesStore()
    const profile = store.profiles[0]
    const initialComments = profile.comments.length
    
    store.addComment(profile.id, 'Test comment')
    expect(profile.comments.length).toBe(initialComments + 1)
    expect(profile.comments[profile.comments.length - 1].content).toBe('Test comment')
  })
})

