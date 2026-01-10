<!--
  @component ProfilesPage (Public)
  @description Public-facing community profiles page for SEO.
-->
<template>
  <q-page class="profiles-page">
    <section class="page-hero">
      <div class="container">
        <h1>Community Slicer Profiles</h1>
        <p class="subtitle">
          Browse and download community-shared slicer profiles. Find perfect settings 
          for your printer and filament combination.
        </p>
        <div class="search-box">
          <q-input
            v-model="search"
            placeholder="Search profiles..."
            outlined
            dense
          >
            <template #prepend>
              <q-icon name="sym_o_search" />
            </template>
          </q-input>
        </div>
      </div>
    </section>

    <section class="profiles-section">
      <div class="container">
        <div class="filters">
          <q-select
            v-model="slicerFilter"
            :options="slicerOptions"
            label="Slicer"
            outlined
            dense
            emit-value
            map-options
          />
          <q-select
            v-model="sortBy"
            :options="sortOptions"
            label="Sort by"
            outlined
            dense
            emit-value
            map-options
          />
        </div>
        <div class="profiles-grid">
          <div
            v-for="profile in profiles"
            :key="profile.id"
            class="profile-card"
          >
            <div class="profile-header">
              <h3>{{ profile.name }}</h3>
              <div class="profile-stats">
                <span><q-icon
                  name="sym_o_download"
                  size="14px"
                /> {{ profile.downloads }}</span>
                <span><q-icon
                  name="sym_o_thumb_up"
                  size="14px"
                /> {{ profile.votes }}</span>
              </div>
            </div>
            <p>{{ profile.description }}</p>
            <div class="profile-meta">
              <span class="tag">{{ profile.slicer }}</span>
              <span class="tag">{{ profile.printer }}</span>
              <span class="tag">{{ profile.filament }}</span>
            </div>
            <q-btn
              label="View Profile"
              flat
              color="accent"
              :to="`/profiles/${profile.id}`"
            />
          </div>
        </div>
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSeo } from '@/composables/useSeo'

const { setPageSeo } = useSeo()

const search = ref('')
const slicerFilter = ref('all')
const sortBy = ref('popular')

const slicerOptions = [
  { label: 'All Slicers', value: 'all' },
  { label: 'Cura', value: 'cura' },
  { label: 'PrusaSlicer', value: 'prusaslicer' },
  { label: 'OrcaSlicer', value: 'orcaslicer' }
]

const sortOptions = [
  { label: 'Most Popular', value: 'popular' },
  { label: 'Most Recent', value: 'recent' },
  { label: 'Highest Rated', value: 'rated' }
]

const profiles = [
  { id: '1', name: 'Ender 3 PLA Perfect', description: 'Optimized for quality PLA prints', downloads: '12.5K', votes: 342, slicer: 'Cura', printer: 'Ender 3', filament: 'PLA' },
  { id: '2', name: 'PETG Strong Parts', description: 'Maximum strength for functional parts', downloads: '8.2K', votes: 256, slicer: 'PrusaSlicer', printer: 'Prusa MK3S', filament: 'PETG' },
  { id: '3', name: 'X1 Carbon Speed', description: 'High-speed printing without quality loss', downloads: '6.8K', votes: 198, slicer: 'OrcaSlicer', printer: 'X1 Carbon', filament: 'PLA' }
]

onMounted(() => {
  setPageSeo({
    title: 'Community Slicer Profiles - Download Free 3D Printing Settings | Printverse',
    description: 'Browse and download community-shared slicer profiles for Cura, PrusaSlicer, and OrcaSlicer. Find optimized settings for your printer.',
    keywords: ['slicer profiles', 'cura profiles download', 'prusaslicer profiles', '3d printer profiles', 'community profiles'],
    canonicalPath: '/profiles',
    breadcrumbs: [{ name: 'Home', url: '/' }, { name: 'Profiles', url: '/profiles' }]
  })
})
</script>

<style lang="scss" scoped>
.profiles-page { background: var(--bg-primary); }
.container { max-width: 1200px; margin: 0 auto; padding: 0 var(--space-md); }

.page-hero {
  padding: var(--space-4xl) 0; text-align: center;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  h1 { font-family: var(--font-display); font-size: clamp(2rem, 5vw, 3rem); margin-bottom: var(--space-md); }
  .subtitle { color: var(--text-secondary); max-width: 600px; margin: 0 auto var(--space-xl); }
  .search-box { max-width: 500px; margin: 0 auto; }
}

.profiles-section { padding: var(--space-3xl) 0; }
.filters { display: flex; gap: var(--space-md); margin-bottom: var(--space-xl); }
.profiles-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-lg); @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); } @media (max-width: 640px) { grid-template-columns: 1fr; } }
.profile-card { padding: var(--space-xl); background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); .profile-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-sm); h3 { font-family: var(--font-display); } .profile-stats { display: flex; gap: var(--space-sm); font-size: var(--text-xs); color: var(--text-muted); span { display: flex; align-items: center; gap: 2px; } } } p { color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-md); } .profile-meta { display: flex; flex-wrap: wrap; gap: var(--space-xs); margin-bottom: var(--space-md); .tag { padding: 2px 8px; background: var(--bg-tertiary); border-radius: var(--radius-sm); font-size: var(--text-xs); color: var(--text-muted); } } }
</style>





