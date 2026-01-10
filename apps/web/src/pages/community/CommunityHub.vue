<template>
  <q-page class="community-hub">
    <!-- Hero -->
    <section class="community-hero">
      <div class="hero-content">
        <div class="hero-badge">
          <q-icon name="people" />
          <span>Community Driven</span>
        </div>
        <h1>Open Source Art Program</h1>
        <p>Share your creations, earn recognition, and help the 3D printing community thrive</p>
        <div class="hero-actions">
          <q-btn
            color="primary"
            size="lg"
            icon="cloud_upload"
            label="Upload Your Model"
            to="/community/upload"
          />
          <q-btn
            outline
            color="white"
            size="lg"
            icon="info"
            label="Learn More"
            @click="showProgramInfo = true"
          />
        </div>
        <div class="hero-stats">
          <div class="stat">
            <q-skeleton
              v-if="loadingStats"
              type="text"
              width="90px"
            />
            <span
              v-else
              class="stat-value"
            >{{ stats.modelsShared.toLocaleString() }}</span>
            <span class="stat-label">Models Shared</span>
          </div>
          <div class="stat">
            <q-skeleton
              v-if="loadingStats"
              type="text"
              width="70px"
            />
            <span
              v-else
              class="stat-value"
            >{{ stats.creators.toLocaleString() }}</span>
            <span class="stat-label">Creators</span>
          </div>
          <div class="stat">
            <q-skeleton
              v-if="loadingStats"
              type="text"
              width="110px"
            />
            <span
              v-else
              class="stat-value"
            >{{ stats.downloads.toLocaleString() }}</span>
            <span class="stat-label">Downloads</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Featured Creators -->
    <section class="creators-section">
      <div class="section-header">
        <h2>Featured Creators</h2>
        <q-btn
          flat
          color="primary"
          label="View All Creators"
          to="/community/creators"
        />
      </div>
      <div class="creators-grid">
        <div
          v-for="creator in featuredCreators"
          :key="creator.id"
          class="creator-card"
        >
          <div class="creator-avatar">
            <q-skeleton
              v-if="loadingCreators"
              type="QAvatar"
            />
            <template v-else>
              <img
                v-if="creator.avatar"
                :src="creator.avatar"
                :alt="creator.name"
              >
              <q-icon
                v-else
                name="person"
                size="32px"
              />
            </template>
          </div>
          <div class="creator-info">
            <h4>
              <q-skeleton
                v-if="loadingCreators"
                type="text"
                width="120px"
              />
              <template v-else>
                {{ creator.name }}
              </template>
            </h4>
            <p>
              <q-skeleton
                v-if="loadingCreators"
                type="text"
                width="180px"
              />
              <template v-else>
                {{ creator.bio }}
              </template>
            </p>
            <div class="creator-stats">
              <span>
                <q-icon name="view_in_ar" />
                <q-skeleton
                  v-if="loadingCreators"
                  type="text"
                  width="30px"
                />
                <template v-else>{{ creator.models }}</template>
              </span>
              <span>
                <q-icon name="thumb_up" />
                <q-skeleton
                  v-if="loadingCreators"
                  type="text"
                  width="40px"
                />
                <template v-else>{{ creator.likes }}</template>
              </span>
            </div>
          </div>
          <q-btn
            flat
            color="primary"
            label="View Profile"
            :to="`/community/creators/${creator.id}`"
          />
        </div>
      </div>
    </section>

    <!-- Tabs -->
    <section class="catalog-section">
      <q-tabs
        v-model="activeTab"
        class="catalog-tabs"
        align="left"
      >
        <q-tab
          name="trending"
          icon="trending_up"
          label="Trending"
        />
        <q-tab
          name="recent"
          icon="schedule"
          label="Recent"
        />
        <q-tab
          name="popular"
          icon="star"
          label="Most Popular"
        />
        <q-tab
          v-if="isLoggedIn"
          name="following"
          icon="favorite"
          label="Following"
        />
      </q-tabs>

      <!-- Filters -->
      <div class="filter-bar">
        <q-input
          v-model="search"
          dense
          outlined
          placeholder="Search community models..."
          class="search-input"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
        <q-select
          v-model="categoryFilter"
          dense
          outlined
          :options="categories"
          label="Category"
          class="filter-select"
        />
        <q-select
          v-model="materialFilter"
          dense
          outlined
          :options="materials"
          label="Material"
          class="filter-select"
        />
        <q-select
          v-model="licenseFilter"
          dense
          outlined
          :options="licenseOptions"
          label="License"
          class="filter-select"
        />
      </div>

      <!-- Models Grid -->
      <div class="models-grid">
        <CommunityModelCard 
          v-for="model in filteredModels" 
          :key="model.id"
          :model="model"
          @vote="handleVote"
          @download="handleDownload"
        />
      </div>

      <!-- Load More -->
      <div
        v-if="hasMore"
        class="load-more"
      >
        <q-btn
          flat
          color="primary"
          label="Load More"
          :loading="loading"
          @click="loadMore"
        />
      </div>
    </section>

    <!-- Program Info Dialog -->
    <q-dialog
      v-model="showProgramInfo"
      maximized
    >
      <q-card class="program-info-card">
        <q-bar>
          <span>Open Source Art Program</span>
          <q-space />
          <q-btn
            v-close-popup
            flat
            dense
            icon="close"
          />
        </q-bar>
        
        <q-card-section class="program-content">
          <div class="program-hero">
            <q-icon
              name="volunteer_activism"
              size="64px"
              color="primary"
            />
            <h2>Join Our Open Source Art Program</h2>
            <p>Contribute to the 3D printing community and earn recognition</p>
          </div>

          <div class="program-benefits">
            <div class="benefit">
              <q-icon
                name="visibility"
                size="32px"
              />
              <h4>Get Discovered</h4>
              <p>Your models are featured to thousands of 3D printing enthusiasts</p>
            </div>
            <div class="benefit">
              <q-icon
                name="thumb_up"
                size="32px"
              />
              <h4>Earn Recognition</h4>
              <p>Build your reputation with votes, comments, and follower counts</p>
            </div>
            <div class="benefit">
              <q-icon
                name="monetization_on"
                size="32px"
              />
              <h4>Future Revenue Share</h4>
              <p>Opt-in to share in future revenue from your popular designs</p>
            </div>
            <div class="benefit">
              <q-icon
                name="card_giftcard"
                size="32px"
              />
              <h4>Receive Tips</h4>
              <p>Accept tips from grateful users who love your designs</p>
            </div>
          </div>

          <div class="program-how">
            <h3>How It Works</h3>
            <ol>
              <li><strong>Upload your model</strong> with detailed metadata and license info</li>
              <li><strong>AI reviews</strong> your submission for quality and compliance</li>
              <li><strong>Get published</strong> to our community catalog</li>
              <li><strong>Earn recognition</strong> through votes, comments, and downloads</li>
              <li><strong>Build your profile</strong> and grow your following</li>
            </ol>
          </div>

          <div class="program-licenses">
            <h3>Supported Licenses</h3>
            <p>We support Creative Commons and open source licenses:</p>
            <div class="license-badges">
              <span class="badge">CC BY</span>
              <span class="badge">CC BY-SA</span>
              <span class="badge">CC BY-NC</span>
              <span class="badge">CC BY-NC-SA</span>
              <span class="badge">CC0</span>
              <span class="badge">GPL</span>
            </div>
          </div>

          <div class="program-cta">
            <q-btn
              v-close-popup
              color="primary"
              size="lg"
              label="Start Uploading"
              to="/community/upload"
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Community Notice -->
    <div class="community-notice">
      <q-icon name="info" />
      <p>
        Community uploads are separate from our curated catalog. All models undergo AI and human moderation.
        <router-link to="/community/guidelines">
          Read our community guidelines
        </router-link>
      </p>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import CommunityModelCard from '@/components/community/CommunityModelCard.vue'
import { useCommunityStore } from '@/stores/community'

const isLoggedIn = ref(false)
const activeTab = ref('trending')
const search = ref('')
const categoryFilter = ref<string | null>(null)
const materialFilter = ref<string | null>(null)
const licenseFilter = ref<string | null>(null)
const loading = ref(false)
const hasMore = ref(true)
const showProgramInfo = ref(false)
const communityStore = useCommunityStore()
const loadingStats = computed(() => communityStore.loadingStats)
const loadingCreators = computed(() => communityStore.loadingCreators)
const loadingModels = computed(() => communityStore.loadingModels)

const categories = [
  { label: 'All Categories', value: null },
  { label: 'Functional Parts', value: 'functional' },
  { label: 'Art & Decorative', value: 'art' },
  { label: 'Tools', value: 'tools' },
  { label: 'Mechanical', value: 'mechanical' },
  { label: 'Toys & Games', value: 'toys' }
]

const materials = [
  { label: 'All Materials', value: null },
  { label: 'PLA', value: 'PLA' },
  { label: 'PETG', value: 'PETG' },
  { label: 'ABS', value: 'ABS' },
  { label: 'TPU', value: 'TPU' }
]

const licenseOptions = [
  { label: 'All Licenses', value: null },
  { label: 'CC BY', value: 'cc-by' },
  { label: 'CC BY-SA', value: 'cc-by-sa' },
  { label: 'CC BY-NC', value: 'cc-by-nc' },
  { label: 'CC0', value: 'cc0' }
]

const stats = computed(() => communityStore.stats ?? { modelsShared: 0, creators: 0, downloads: 0 })
const featuredCreators = computed(() => communityStore.featuredCreators.map(c => ({
  id: c.id,
  name: c.handle,
  bio: c.bio || '',
  avatar: c.avatarUrl,
  models: c.models || 0,
  likes: c.downloads || 0
})))
const models = computed(() => communityStore.models)

const filteredModels = computed(() => {
  let data = [...models.value]
  if (search.value) {
    const term = search.value.toLowerCase()
    data = data.filter(m =>
      m.title?.toLowerCase().includes(term) ||
      m.creator?.toLowerCase().includes(term) ||
      m.tags?.some((t: string) => t.toLowerCase().includes(term))
    )
  }
  if (categoryFilter.value) data = data.filter(m => m.category === categoryFilter.value)
  if (materialFilter.value) data = data.filter(m => m.material?.toLowerCase() === materialFilter.value?.toLowerCase())
  if (licenseFilter.value) data = data.filter(m => m.license?.toLowerCase() === licenseFilter.value?.toLowerCase())
  if (activeTab.value === 'trending' || activeTab.value === 'popular') {
    data = data.sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
  } else if (activeTab.value === 'recent') {
    data = data.sort((a, b) => {
      const aTime = typeof a.createdAt === 'number' ? a.createdAt : Date.parse(a.createdAt || '0')
      const bTime = typeof b.createdAt === 'number' ? b.createdAt : Date.parse(b.createdAt || '0')
      return bTime - aTime
    })
  }
  return data
})

function handleVote(modelId: string) {
  const model = models.value.find(m => m.id === modelId)
  if (model) model.votes = (model.votes || 0) + 1
}

function handleDownload(modelId: string) {
  const model = models.value.find(m => m.id === modelId)
  if (model) model.downloads++
}

function loadMore() {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    hasMore.value = false
  }, 1000)
}

watch([search, materialFilter, licenseFilter, activeTab], () => {
  communityStore.fetchModels({
    q: search.value || undefined,
    material: materialFilter.value || undefined,
    license: licenseFilter.value || undefined,
    sort: activeTab.value === 'popular' ? 'likes' : 'downloads',
    limit: 12
  })
})

onMounted(() => {
  communityStore.fetchStats()
  communityStore.fetchFeaturedCreators()
  communityStore.fetchModels({
    q: search.value || undefined,
    material: materialFilter.value || undefined,
    license: licenseFilter.value || undefined,
    sort: activeTab.value === 'popular' ? 'likes' : 'downloads',
    limit: 12
  })
})
</script>

<style lang="scss" scoped>
.community-hub {
  padding-bottom: 60px;
}

.community-hero {
  padding: 100px 24px 80px;
  background: linear-gradient(135deg, var(--q-primary), #f97316);
  color: white;
  text-align: center;
}

.hero-content {
  max-width: 700px;
  margin: 0 auto;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255,255,255,0.2);
  border-radius: 100px;
  font-size: 0.85rem;
  margin-bottom: 24px;
}

.community-hero h1 {
  font-size: 3rem;
  margin: 0 0 16px;
}

.community-hero p {
  font-size: 1.25rem;
  opacity: 0.9;
  margin: 0 0 32px;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 48px;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 60px;
  
  .stat-value {
    display: block;
    font-size: 2rem;
    font-weight: 700;
  }
  
  .stat-label {
    font-size: 0.875rem;
    opacity: 0.8;
  }
}

.creators-section {
  padding: 60px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  
  h2 { margin: 0; }
}

.creators-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.creator-card {
  padding: 24px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  text-align: center;
  
  .creator-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: var(--color-bg-tertiary);
    margin: 0 auto 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    
    img { width: 100%; height: 100%; object-fit: cover; }
  }
  
  h4 { margin: 0 0 8px; }
  p { margin: 0 0 12px; font-size: 0.875rem; color: var(--color-text-secondary); }
  
  .creator-stats {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-bottom: 16px;
    font-size: 0.85rem;
    color: var(--color-text-muted);
    
    span {
      display: flex;
      align-items: center;
      gap: 6px;
    }
  }
}

.catalog-section {
  padding: 0 24px 60px;
  max-width: 1200px;
  margin: 0 auto;
}

.catalog-tabs {
  margin-bottom: 24px;
}

.filter-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  flex-wrap: wrap;
  
  .search-input { flex: 1; min-width: 250px; }
  .filter-select { width: 160px; }
}

.models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.load-more {
  text-align: center;
  margin-top: 40px;
}

.community-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 800px;
  margin: 0 auto;
  padding: 16px 24px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  
  p { margin: 0; font-size: 0.875rem; color: var(--color-text-secondary); }
  a { color: var(--q-primary); }
}

// Program Info Dialog
.program-info-card {
  max-width: 800px;
  width: 100%;
}

.program-content {
  padding: 40px;
}

.program-hero {
  text-align: center;
  margin-bottom: 48px;
  
  h2 { margin: 24px 0 12px; }
  p { color: var(--color-text-secondary); margin: 0; }
}

.program-benefits {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-bottom: 48px;
  
  .benefit {
    padding: 24px;
    background: var(--color-bg-tertiary);
    border-radius: 12px;
    text-align: center;
    
    h4 { margin: 16px 0 8px; }
    p { margin: 0; font-size: 0.9rem; color: var(--color-text-secondary); }
  }
}

.program-how {
  margin-bottom: 32px;
  
  h3 { margin: 0 0 16px; }
  
  ol {
    margin: 0;
    padding-left: 24px;
    
    li {
      margin-bottom: 12px;
      line-height: 1.6;
    }
  }
}

.program-licenses {
  margin-bottom: 32px;
  
  h3 { margin: 0 0 12px; }
  p { margin: 0 0 16px; color: var(--color-text-secondary); }
  
  .license-badges {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    
    .badge {
      padding: 8px 16px;
      background: var(--color-bg-tertiary);
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
    }
  }
}

.program-cta {
  text-align: center;
}

@media (max-width: 900px) {
  .creators-grid { grid-template-columns: 1fr; }
  .program-benefits { grid-template-columns: 1fr; }
  .hero-stats { flex-direction: column; gap: 24px; }
}
</style>


