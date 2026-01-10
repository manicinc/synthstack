<template>
  <q-page class="profiles-page">
    <div class="page-header">
      <h1>Community Profiles</h1>
      <p>Browse and use print profiles shared by the community</p>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <q-input
        v-model="search"
        dense
        outlined
        placeholder="Search profiles..."
        class="search-input"
      >
        <template #prepend>
          <q-icon name="search" />
        </template>
      </q-input>
      <q-select
        v-model="materialFilter"
        :options="materials"
        dense
        outlined
        label="Material"
        clearable
        class="filter-select"
      />
      <q-select
        v-model="sortBy"
        :options="sortOptions"
        dense
        outlined
        label="Sort By"
        emit-value
        map-options
        class="filter-select"
      />
    </div>

    <!-- Profiles Grid -->
    <div class="profiles-grid">
      <q-card
        v-for="profile in profiles"
        :key="profile.id"
        class="profile-card hover-lift"
        clickable
        :to="`/app/profiles/${profile.id}`"
      >
        <q-card-section>
          <div class="profile-header">
            <q-avatar
              size="40px"
              color="primary"
              text-color="white"
            >
              {{ profile.author[0] }}
            </q-avatar>
            <div class="profile-meta">
              <div class="profile-name">
                {{ profile.name }}
              </div>
              <div class="profile-author">
                by {{ profile.author }}
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-section class="profile-details">
          <div class="detail-chips">
            <q-chip
              size="sm"
              color="primary"
              text-color="white"
            >
              {{ profile.material }}
            </q-chip>
            <q-chip
              size="sm"
              outline
            >
              {{ profile.printer }}
            </q-chip>
          </div>
          <p class="profile-description">
            {{ profile.description }}
          </p>
        </q-card-section>

        <q-card-section class="profile-stats">
          <div class="stat">
            <q-icon
              name="download"
              size="16px"
            />
            <span>{{ profile.downloads }}</span>
          </div>
          <div class="stat">
            <q-icon
              name="thumb_up"
              size="16px"
            />
            <span>{{ profile.likes }}</span>
          </div>
          <div class="stat">
            <q-icon
              name="star"
              size="16px"
              color="warning"
            />
            <span>{{ profile.rating }}</span>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Load More -->
    <div class="load-more">
      <q-btn
        outline
        color="primary"
        label="Load More"
        @click="loadMore"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const search = ref('')
const materialFilter = ref(null)
const sortBy = ref('popular')

const materials = ['PLA', 'PETG', 'ABS', 'TPU', 'ASA']
const sortOptions = [
  { label: 'Most Popular', value: 'popular' },
  { label: 'Newest', value: 'newest' },
  { label: 'Most Downloaded', value: 'downloads' },
  { label: 'Highest Rated', value: 'rating' }
]

const profiles = ref([
  {
    id: '1',
    name: 'High Quality PLA',
    author: 'PrintMaster',
    material: 'PLA',
    printer: 'Prusa MK4',
    description: 'Optimized for exceptional surface finish and detail.',
    downloads: 1250,
    likes: 342,
    rating: 4.8
  },
  {
    id: '2',
    name: 'Speed PETG',
    author: 'SpeedDemon',
    material: 'PETG',
    printer: 'Bambu X1C',
    description: 'Fast printing without sacrificing quality.',
    downloads: 890,
    likes: 256,
    rating: 4.6
  },
  {
    id: '3',
    name: 'Functional ABS',
    author: 'EngineerBob',
    material: 'ABS',
    printer: 'Voron 2.4',
    description: 'Strong, durable parts for functional applications.',
    downloads: 567,
    likes: 189,
    rating: 4.7
  },
  {
    id: '4',
    name: 'Flexible TPU',
    author: 'FlexiPrint',
    material: 'TPU',
    printer: 'Ender 3 V3',
    description: 'Perfect settings for TPU/flexible filaments.',
    downloads: 423,
    likes: 134,
    rating: 4.5
  }
])

function loadMore() {
  // Load more profiles
}
</script>

<style lang="scss" scoped>
.profiles-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
  
  h1 {
    font-size: 2rem;
    margin-bottom: 8px;
  }
  
  p {
    color: var(--text-secondary);
  }
}

.filters-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  
  .search-input {
    flex: 1;
    min-width: 200px;
    max-width: 400px;
  }
  
  .filter-select {
    min-width: 150px;
  }
}

.profiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.profile-card {
  .profile-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .profile-name {
    font-weight: 600;
    font-size: 1.125rem;
  }
  
  .profile-author {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  
  .profile-details {
    padding-top: 0;
  }
  
  .detail-chips {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  
  .profile-description {
    color: var(--text-secondary);
    font-size: 0.875rem;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .profile-stats {
    display: flex;
    gap: 16px;
    border-top: 1px solid var(--border-default);
    padding-top: 12px;
  }
  
  .stat {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
}

.load-more {
  text-align: center;
  margin-top: 32px;
}

@media (max-width: 600px) {
  .profiles-page {
    padding: 16px;
  }
  
  .filters-bar {
    flex-direction: column;
    
    .search-input {
      max-width: none;
    }
  }
}
</style>
