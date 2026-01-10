import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Comment {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  content: string
  createdAt: string
}

export interface Profile {
  id: string
  name: string
  description: string
  printerName: string
  filamentName: string
  authorName: string
  authorAvatar?: string
  imageUrl: string
  votes: number
  downloads: number
  createdAt: string
  tags: string[]
  comments: Comment[]
  settings: Record<string, any> // Simplified for now
}

export const useProfilesStore = defineStore('profiles', () => {
  const profiles = ref<Profile[]>([
    {
      id: '1',
      name: 'Speed Benchy - Ender 3 V2',
      description: 'Optimized for speed while maintaining decent hull quality. 45 minute print.',
      printerName: 'Creality Ender 3 V2',
      filamentName: 'Generic PLA',
      authorName: 'SpeedDemon',
      imageUrl: 'https://placehold.co/600x400/FF6B35/white?text=Benchy',
      votes: 128,
      downloads: 450,
      createdAt: '2023-10-15T10:30:00Z',
      tags: ['speed', 'benchy', 'pla'],
      comments: [
        { id: 'c1', userId: 'u2', userName: 'MakerJoe', content: 'Works great, thanks!', createdAt: '2023-10-16T09:00:00Z' }
      ],
      settings: { layerHeight: 0.24, speed: 100 }
    },
    {
      id: '2',
      name: 'Strong Parts - PETG',
      description: 'High infill, slow speed profile for functional parts. Zero warping.',
      printerName: 'Prusa i3 MK3S+',
      filamentName: 'Prusament PETG',
      authorName: 'FunctionalPrints',
      imageUrl: 'https://placehold.co/600x400/2D9CDB/white?text=Gear',
      votes: 85,
      downloads: 210,
      createdAt: '2023-11-02T14:15:00Z',
      tags: ['strong', 'petg', 'functional'],
      comments: [],
      settings: { layerHeight: 0.20, speed: 40, infill: 40 }
    },
    {
      id: '3',
      name: 'TPU Phone Case',
      description: 'Flexible settings for TPU. Retraction tuned perfectly.',
      printerName: 'Bambu Lab X1 Carbon',
      filamentName: 'Overture TPU',
      authorName: 'FlexMaster',
      imageUrl: 'https://placehold.co/600x400/B87333/white?text=Case',
      votes: 256,
      downloads: 890,
      createdAt: '2023-09-20T11:00:00Z',
      tags: ['tpu', 'flexible', 'phone-case'],
      comments: [],
      settings: { layerHeight: 0.16, speed: 30 }
    }
  ])

  const selectedProfileId = ref<string | null>(null)

  const selectedProfile = computed(() => 
    profiles.value.find(p => p.id === selectedProfileId.value)
  )

  function getProfileById(id: string) {
    return profiles.value.find(p => p.id === id)
  }

  function voteProfile(id: string, direction: 'up' | 'down') {
    const profile = profiles.value.find(p => p.id === id)
    if (profile) {
      profile.votes += direction === 'up' ? 1 : -1
    }
  }

  function addComment(profileId: string, content: string) {
    const profile = profiles.value.find(p => p.id === profileId)
    if (profile) {
      profile.comments.push({
        id: `new-${Date.now()}`,
        userId: 'current-user',
        userName: 'Me',
        content,
        createdAt: new Date().toISOString()
      })
    }
  }

  return {
    profiles,
    selectedProfileId,
    selectedProfile,
    getProfileById,
    voteProfile,
    addComment
  }
})





