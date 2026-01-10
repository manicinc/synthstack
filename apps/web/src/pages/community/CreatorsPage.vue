<template>
  <q-page class="creators-page">
    <div class="page-header">
      <h1>Community Creators</h1>
      <p>Discover talented makers sharing their designs</p>
    </div>

    <div class="page-container">
      <div class="search-bar">
        <q-input
          v-model="search"
          outlined
          dense
          placeholder="Search creators..."
          class="search-input"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
        <q-select
          v-model="sortBy"
          outlined
          dense
          :options="sortOptions"
          label="Sort"
          class="sort-select"
        />
      </div>

      <div class="creators-grid">
        <div
          v-for="creator in filteredCreators"
          :key="creator.id"
          class="creator-card"
        >
          <div class="card-header">
            <div class="avatar">
              <q-icon
                v-if="!creator.avatarUrl"
                name="person"
                size="32px"
              />
              <img
                v-else
                :src="creator.avatarUrl"
                :alt="creator.handle"
              >
            </div>
            <div
              v-if="creator.verified"
              class="verified-badge"
            >
              <q-icon
                name="verified"
                color="primary"
              />
            </div>
          </div>
          <h3>{{ creator.handle || creator.name }}</h3>
          <p class="bio">
            {{ creator.bio }}
          </p>
          <div class="stats">
            <span><q-icon name="view_in_ar" /> {{ creator.models }}</span>
            <span><q-icon name="download" /> {{ formatNumber(creator.downloads || 0) }}</span>
          </div>
          <q-btn
            color="primary"
            outline
            label="View Profile"
            :to="`/community/creators/${creator.id}`"
            class="full-width"
          />
        </div>
      </div>

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
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCommunityStore } from '@/stores/community'

const communityStore = useCommunityStore()
const search = ref('')
const sortBy = ref('popular')
const loading = computed(() => communityStore.loadingCreators)
const hasMore = ref(false)

const sortOptions = [
  { label: 'Most Popular', value: 'popular' },
  { label: 'Most Models', value: 'models' },
  { label: 'Newest', value: 'newest' }
]

const creators = computed(() => communityStore.creators.length ? communityStore.creators : communityStore.featuredCreators)

const filteredCreators = computed(() => {
  let result = [...creators.value]
  if (search.value) {
    const s = search.value.toLowerCase()
    result = result.filter(c => c.handle?.toLowerCase().includes(s) || c.bio?.toLowerCase().includes(s))
  }
  switch (sortBy.value) {
    case 'models': result.sort((a, b) => (b.models || 0) - (a.models || 0)); break
    case 'newest': result.sort((a, b) => b.id.localeCompare(a.id)); break
    default: result.sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
  }
  return result
})

function formatNumber(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toString()
}

function loadMore() {
  hasMore.value = false
}

onMounted(() => {
  communityStore.fetchCreators()
  communityStore.fetchFeaturedCreators()
})
</script>

<style lang="scss" scoped>
.creators-page {
  padding-bottom: 80px;
}

.page-header {
  padding: 80px 24px 40px;
  text-align: center;
  background: var(--color-bg-secondary);
  
  h1 { margin: 0 0 8px; font-size: 2.5rem; }
  p { margin: 0; color: var(--color-text-secondary); font-size: 1.1rem; }
}

.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px;
}

.search-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  
  .search-input { flex: 1; max-width: 400px; }
  .sort-select { width: 180px; }
}

.creators-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.creator-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  
  .card-header {
    position: relative;
    margin-bottom: 16px;
  }
  
  .avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: var(--color-bg-tertiary);
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    
    img { width: 100%; height: 100%; object-fit: cover; }
  }
  
  .verified-badge {
    position: absolute;
    right: calc(50% - 50px);
    bottom: 0;
  }
  
  h3 { margin: 0 0 8px; }
  
  .bio {
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    margin: 0 0 16px;
    min-height: 2.7em;
  }
  
  .stats {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-bottom: 20px;
    font-size: 0.85rem;
    color: var(--color-text-muted);
    
    span {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
}

.load-more {
  text-align: center;
  margin-top: 40px;
}
</style>


