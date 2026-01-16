import { defineStore } from 'pinia'
import { ref, computed, watchEffect } from 'vue'
import { get } from '@/services/api'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'

export interface CommunityStats {
  modelsShared: number
  creators: number
  downloads: number
}

export interface CommunityCreator {
  id: string
  handle: string
  name?: string
  bio?: string
  models?: number
  downloads?: number
  avatarUrl?: string | null
  verified?: boolean
}

export interface CommunityModel {
  id: string
  title: string
  author: string
  creator: string
  creatorId?: string
  material?: string
  license?: string
  licenseDescription?: string
  downloads: number
  likes?: number
  votes: number
  comments: number
  tags?: string[]
  previewUrl?: string
  thumbnail?: string
  createdAt?: string | number
  category?: string
  trendingScore?: number
  description?: string
  layerHeight?: string
  infill?: string
  supports?: string
  copyrightYear?: string
  copyrightHolder?: string
}

interface Comment {
  id: string
  author: string
  authorId?: string
  avatarUrl?: string | null
  content: string
  createdAt: string
}

interface ModelFilters {
  q?: string
  material?: string | null
  license?: string | null
  sort?: 'downloads' | 'likes' | 'trending' | 'recent' | 'rising'
  timeRange?: '24h' | '7d' | '30d' | 'all'
  limit?: number
}

// Stats will be fetched from API - these are development placeholders only
const FALLBACK_STATS: CommunityStats = {
  modelsShared: 0,
  creators: 0,
  downloads: 0
}

const FALLBACK_CREATORS: CommunityCreator[] = [
  { id: 'printmaster3d', handle: 'PrintMaster3D', bio: 'Functional parts specialist', models: 45, downloads: 1250, avatarUrl: null },
  { id: 'artfulmakes', handle: 'ArtfulMakes', bio: 'Decorative designs', models: 32, downloads: 980, avatarUrl: null },
  { id: 'mechdesigns', handle: 'MechDesigns', bio: 'Mechanical engineering', models: 28, downloads: 756, avatarUrl: null },
  { id: 'techforge', handle: 'TechForge', bio: 'Engineering solutions', models: 67, downloads: 2340, avatarUrl: null },
  { id: 'minimaker', handle: 'MiniMaker', bio: 'Miniatures & tabletop', models: 89, downloads: 4560, avatarUrl: null },
  { id: 'funcprint', handle: 'FuncPrint', bio: 'Functional everyday items', models: 23, downloads: 890, avatarUrl: null }
]

// Mock models with realistic timestamps for trending algorithm
const now = Date.now()
const hour = 60 * 60 * 1000
const day = 24 * hour

const FALLBACK_MODELS: CommunityModel[] = [
  { id: 'phone-stand', title: 'Universal Phone Stand', author: 'PrintMaster3D', creator: 'PrintMaster3D', creatorId: 'printmaster3d', material: 'PLA', license: 'CC-BY', downloads: 1500, likes: 234, votes: 234, comments: 12, tags: ['stand', 'desk'], previewUrl: undefined, createdAt: now - 2 * day, category: 'functional' },
  { id: 'dragon-articulation', title: 'Articulated Dragon', author: 'ArtfulMakes', creator: 'ArtfulMakes', creatorId: 'artfulmakes', material: 'PLA', license: 'CC-BY-SA', downloads: 890, likes: 189, votes: 189, comments: 8, tags: ['dragon', 'articulated'], previewUrl: undefined, createdAt: now - 5 * day, category: 'art' },
  { id: 'cable-clip', title: 'Cable Management Clip', author: 'MechDesigns', creator: 'MechDesigns', creatorId: 'mechdesigns', material: 'PETG', license: 'CC0', downloads: 2300, likes: 156, votes: 156, comments: 15, tags: ['clip', 'cable'], previewUrl: undefined, createdAt: now - 12 * hour, category: 'functional' },
  { id: 'headphone-hook', title: 'Headphone Hook', author: 'PrintMaster3D', creator: 'PrintMaster3D', creatorId: 'printmaster3d', material: 'PLA', license: 'CC-BY', downloads: 567, likes: 98, votes: 98, comments: 5, tags: ['hook', 'audio'], previewUrl: undefined, createdAt: now - 3 * day, category: 'functional' },
  { id: 'planter', title: 'Succulent Planter', author: 'ArtfulMakes', creator: 'ArtfulMakes', creatorId: 'artfulmakes', material: 'PLA', license: 'CC-BY-NC', downloads: 432, likes: 145, votes: 145, comments: 3, tags: ['planter', 'decor'], previewUrl: undefined, createdAt: now - 7 * day, category: 'art' },
  { id: 'tool-organizer', title: 'Tool Organizer', author: 'MechDesigns', creator: 'MechDesigns', creatorId: 'mechdesigns', material: 'PETG', license: 'CC-BY', downloads: 321, likes: 87, votes: 87, comments: 2, tags: ['tool', 'shop'], previewUrl: undefined, createdAt: now - 1 * day, category: 'tools' },
  { id: 'benchy-remix', title: 'Benchy Remix - Speed Boat', author: 'TechForge', creator: 'TechForge', creatorId: 'techforge', material: 'PLA', license: 'CC0', downloads: 3400, likes: 456, votes: 456, comments: 22, tags: ['benchy', 'boat', 'test'], previewUrl: undefined, createdAt: now - 6 * hour, category: 'art' },
  { id: 'gear-set', title: 'Parametric Gear Set', author: 'MechDesigns', creator: 'MechDesigns', creatorId: 'mechdesigns', material: 'PETG', license: 'CC-BY-SA', downloads: 1890, likes: 267, votes: 267, comments: 6, tags: ['gear', 'mechanical'], previewUrl: undefined, createdAt: now - 4 * day, category: 'mechanical' },
  { id: 'drawer-organizer', title: 'Modular Drawer Organizer', author: 'FuncPrint', creator: 'FuncPrint', creatorId: 'funcprint', material: 'PLA', license: 'CC-BY', downloads: 2100, likes: 312, votes: 312, comments: 7, tags: ['organizer', 'storage'], previewUrl: undefined, createdAt: now - 8 * hour, category: 'functional' },
  { id: 'dice-tower', title: 'Medieval Dice Tower', author: 'MiniMaker', creator: 'MiniMaker', creatorId: 'minimaker', material: 'PLA', license: 'CC-BY-NC', downloads: 1230, likes: 198, votes: 198, comments: 9, tags: ['dice', 'tabletop', 'gaming'], previewUrl: undefined, createdAt: now - 2 * day, category: 'toys' },
  { id: 'tpu-phone-case', title: 'Flexible Phone Case', author: 'TechForge', creator: 'TechForge', creatorId: 'techforge', material: 'TPU', license: 'CC-BY', downloads: 890, likes: 134, votes: 134, comments: 4, tags: ['phone', 'case', 'flexible'], previewUrl: undefined, createdAt: now - 18 * hour, category: 'functional' },
  { id: 'lithophane-frame', title: 'Lithophane Picture Frame', author: 'ArtfulMakes', creator: 'ArtfulMakes', creatorId: 'artfulmakes', material: 'PLA', license: 'CC0', downloads: 567, likes: 89, votes: 89, comments: 3, tags: ['lithophane', 'frame', 'photo'], previewUrl: undefined, createdAt: now - 10 * day, category: 'art' }
]

function normalizeModel(model: CommunityModel): CommunityModel {
  return {
    ...model,
    creator: model.creator ?? model.author ?? 'Unknown',
    creatorId: model.creatorId ?? (model.author ? model.author.toLowerCase() : 'unknown'),
    votes: model.votes ?? model.likes ?? 0,
    downloads: model.downloads ?? 0,
    comments: typeof model.comments === 'number' ? model.comments : 0,
    tags: model.tags ?? [],
    license: model.license ?? 'cc-by',
    thumbnail: model.thumbnail ?? undefined,
    previewUrl: model.previewUrl ?? undefined
  }
}

export const useCommunityStore = defineStore('community', () => {
  const stats = ref<CommunityStats | null>(null)
  const featuredCreators = ref<CommunityCreator[]>([])
  const creators = ref<CommunityCreator[]>([])
  const models = ref<CommunityModel[]>([])
  const modelDetail = ref<CommunityModel | null>(null)

  const loadingStats = ref(false)
  const loadingCreators = ref(false)
  const loadingModels = ref(false)
  const loadingModelDetail = ref(false)

  const statsList = computed(() => [
    { label: 'Models Shared', value: stats.value?.modelsShared ?? 0 },
    { label: 'Creators', value: stats.value?.creators ?? 0 },
    { label: 'Downloads', value: stats.value?.downloads ?? 0 }
  ])

  async function fetchStats() {
    loadingStats.value = true
    try {
      const res = await get<CommunityStats>('/api/v1/community/stats')
      stats.value = res
    } catch (err) {
      if (!stats.value) stats.value = FALLBACK_STATS
      logError('community stats error', err)
    } finally {
      loadingStats.value = false
    }
  }

  async function fetchFeaturedCreators() {
    loadingCreators.value = true
    try {
      const res = await get<CommunityCreator[]>('/api/v1/community/creators/featured')
      featuredCreators.value = res
    } catch (err) {
      if (!featuredCreators.value.length) featuredCreators.value = FALLBACK_CREATORS
      logError('community featured creators error', err)
    } finally {
      loadingCreators.value = false
    }
  }

  async function fetchCreators() {
    loadingCreators.value = true
    try {
      const res = await get<CommunityCreator[]>('/api/v1/community/creators')
      creators.value = res
    } catch (err) {
      if (!creators.value.length) creators.value = FALLBACK_CREATORS
      logError('community creators error', err)
    } finally {
      loadingCreators.value = false
    }
  }

  async function fetchModels(filters: ModelFilters = {}) {
    loadingModels.value = true
    try {
      const params = new URLSearchParams()
      if (filters.q) params.set('q', filters.q)
      if (filters.material) params.set('material', filters.material)
      if (filters.license) params.set('license', filters.license)
      if (filters.sort) params.set('sort', filters.sort)
      if (filters.limit) params.set('limit', String(filters.limit))
      const res = await get<CommunityModel[]>(`/api/v1/community/models${params.toString() ? `?${params.toString()}` : ''}`)
      models.value = res.map(normalizeModel)
    } catch (err) {
      if (!models.value.length) models.value = FALLBACK_MODELS.map(normalizeModel)
      logError('community models error', err)
    } finally {
      loadingModels.value = false
    }
  }

  async function fetchModelById(id: string) {
    loadingModelDetail.value = true
    try {
      const res = await get<CommunityModel>(`/api/v1/community/models/${id}`)
      modelDetail.value = normalizeModel(res)
    } catch (err) {
      // Fallback to first mock if available
      const fallback = FALLBACK_MODELS.find(m => m.id === id) || FALLBACK_MODELS[0]
      modelDetail.value = fallback ? normalizeModel(fallback) : null
      logError('community model detail error', err)
    } finally {
      loadingModelDetail.value = false
    }
  }

  watchEffect(() => {
    // ensure stats lazily load for first use
    if (!stats.value && !loadingStats.value) fetchStats()
  })

  return {
    // state
    stats,
    statsList,
    featuredCreators,
    creators,
    models,
    modelDetail,

    // loading
    loadingStats,
    loadingCreators,
    loadingModels,
    loadingModelDetail,

    // actions
    fetchStats,
    fetchFeaturedCreators,
    fetchCreators,
    fetchModels,
    fetchModelById
  }
})
