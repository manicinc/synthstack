<template>
  <q-page class="catalog-page" data-testid="catalog-page">
    <section class="hero" data-testid="catalog-hero">
      <div class="hero-text">
        <p class="eyebrow">
          Open Catalog
        </p>
        <h1 data-testid="catalog-title">Public templates, presets, and resources in one place.</h1>
        <p class="lede">
          Browse community templates, ready-to-use presets, and curated reference data.
          Everything is tagged, licensed, and ready to drop into your next project.
        </p>
        <div class="hero-actions">
          <q-btn
            color="primary"
            label="Open Generator"
            to="/app"
            unelevated
          />
          <q-btn
            flat
            label="View Community"
            to="/community"
          />
        </div>
        <div class="hero-stats" data-testid="catalog-stats">
          <div
            v-for="stat in heroStats"
            :key="stat.label"
            class="stat"
            data-testid="catalog-stat"
          >
            <div class="stat-value">
              {{ formatNumber(stat.value) }}
            </div>
            <div class="stat-label">
              {{ stat.label }}
            </div>
          </div>
        </div>
      </div>
      <div class="hero-visual">
        <div class="card-stack">
          <div class="stack-card primary">
            <div class="stack-badge">
              Preset
            </div>
            <div class="stack-title">
              Stripe Billing Starter
            </div>
            <div class="stack-meta">
              Stripe • Webhooks • Customer portal
            </div>
          </div>
          <div class="stack-card secondary">
            <div class="stack-badge">
              Community
            </div>
            <div class="stack-title">
              Landing Page Pack
            </div>
            <div class="stack-meta">
              MIT • 890 downloads
            </div>
          </div>
          <div class="stack-card tertiary">
            <div class="stack-badge">
              Reference
            </div>
            <div class="stack-title">
              Supabase Auth
            </div>
            <div class="stack-meta">
              OAuth • RLS • JWT
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="filters" data-testid="catalog-filters">
      <div class="tabs" data-testid="catalog-tabs">
        <button
          v-for="tab in tabDefs"
          :key="tab.key"
          :class="['tab-btn', { active: activeTab === tab.key }]"
          :data-testid="`catalog-tab-${tab.key}`"
          @click="setActiveTab(tab.key)"
        >
          <span>{{ tab.label }}</span>
          <span class="pill">{{ tab.count }}</span>
        </button>
      </div>
      <div class="filter-controls">
        <q-input
          v-model="search"
          standout="bg-secondary text-white"
          dense
          clearable
          placeholder="Search titles, tags, templates…"
          class="filter-input"
          filled
          data-testid="catalog-search"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
        <q-select
          v-model="licenseFilter"
          :options="licenseOptions"
          dense
          clearable
          label="License"
          class="filter-select"
          filled
        />
        <q-select
          v-model="sourceFilter"
          :options="sourceOptions"
          dense
          emit-value
          map-options
          label="Source"
          class="filter-select"
          filled
        />
      </div>
    </section>

    <section class="catalog-grid">
      <div
        v-if="isLoading"
        class="skeleton-grid"
      >
        <q-skeleton
          v-for="n in 6"
          :key="n"
          height="200px"
          square
        />
      </div>

      <div
        v-else-if="!filteredItems.length"
        class="empty-state"
      >
        <q-icon
          name="inventory_2"
          size="48px"
        />
        <p>No items found. Try clearing filters or searching another term.</p>
      </div>

      <div
        v-else
        class="cards-grid"
      >
        <q-card
          v-for="item in filteredItems"
          :key="item.id"
          class="catalog-card"
          flat
          bordered
        >
          <div class="card-top">
            <q-badge
              :color="sourceColor(item.source)"
              :label="labelForSource(item.source)"
            />
            <q-badge
              v-if="item.license"
              color="grey-7"
              outline
            >
              {{ item.license }}
            </q-badge>
          </div>
          <div class="card-body">
            <div class="card-title">
              {{ item.title }}
            </div>
            <div class="card-subtitle">
              {{ item.subtitle }}
            </div>
            <div class="card-tags">
              <span
                v-for="tag in item.tags"
                :key="tag"
                class="chip"
              >{{ tag }}</span>
            </div>
          </div>
          <div class="card-footer">
            <div
              v-if="item.stats?.downloads"
              class="stat"
            >
              <q-icon
                name="download"
                size="18px"
              />
              <span>{{ formatNumber(item.stats.downloads) }}</span>
            </div>
            <div
              v-if="item.stats?.likes"
              class="stat"
            >
              <q-icon
                name="thumb_up"
                size="18px"
              />
              <span>{{ formatNumber(item.stats.likes) }}</span>
            </div>
            <q-space />
            <q-btn
              flat
              color="primary"
              :label="ctaLabel(item.source)"
              :to="item.href"
              dense
              icon-right="chevron_right"
            />
          </div>
        </q-card>
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCommunityStore } from '@/stores/community'
import { useSeo } from '@/composables/useSeo'

type SourceType = 'community' | 'preset' | 'scraped'
type TabKey = 'models' | 'configs' | 'scraped'

interface CatalogItem {
  id: string
  title: string
  subtitle?: string
  license?: string
  source: SourceType
  href?: string
  tags?: string[]
  stats?: {
    downloads?: number
    likes?: number
  }
}

const { setPageSeo } = useSeo()
setPageSeo({
  title: 'Public Catalog - Templates, Presets, Resources',
  description: 'Browse community templates, ready-to-use presets, and curated reference resources in one catalog.'
})

const communityStore = useCommunityStore()

const activeTab = ref<'models' | 'configs' | 'scraped'>('models')
const search = ref('')
const licenseFilter = ref<string | null>(null)
const sourceFilter = ref<'all' | SourceType>('all')

const presetConfigs = ref<CatalogItem[]>([
  {
    id: 'preset-stripe-billing',
    title: 'Stripe Billing Starter',
    subtitle: 'Subscriptions • Webhooks • Customer portal',
    license: 'MIT',
    source: 'preset',
    href: '/docs',
    tags: ['billing', 'stripe', 'saas']
  },
  {
    id: 'preset-directus-cms',
    title: 'Directus CMS Content Model',
    subtitle: 'Pages • Blog • Visual editing',
    license: 'MIT',
    source: 'preset',
    href: '/docs',
    tags: ['cms', 'directus', 'content']
  },
  {
    id: 'preset-deploy-pipeline',
    title: 'Deployment Pipeline',
    subtitle: 'GitHub Actions • Docker Compose • SSH deploy',
    license: 'MIT',
    source: 'preset',
    href: '/docs',
    tags: ['deploy', 'docker', 'ci']
  }
])

const heroStats = computed(() => communityStore.statsList)

const modelCards = computed<CatalogItem[]>(() =>
  (communityStore.models || []).map((m) => ({
    id: m.id,
    title: m.title,
    subtitle: m.author,
    license: m.license?.toUpperCase() ?? 'MIT',
    source: 'community',
    href: '/catalog',
    tags: m.tags?.length ? m.tags : [m.category || 'template'],
    stats: { downloads: m.downloads, likes: m.likes }
  }))
)

const scrapedCards = computed<CatalogItem[]>(() => {
  return []
})

const tabItems = computed(() => ({
  models: modelCards.value,
  configs: presetConfigs.value,
  scraped: scrapedCards.value
}))

const tabDefs = computed(() => [
  { key: 'models', label: 'Community', count: tabItems.value.models.length },
  { key: 'configs', label: 'Presets', count: tabItems.value.configs.length },
  { key: 'scraped', label: 'Reference', count: tabItems.value.scraped.length }
])

const licenseOptions = computed(() =>
  Array.from(
    new Set(
      Object.values(tabItems.value)
        .flat()
        .map((item) => item.license)
        .filter(Boolean) as string[]
    )
  )
)

const sourceOptions = [
  { label: 'All sources', value: 'all' },
  { label: 'Community', value: 'community' },
  { label: 'Presets', value: 'preset' },
  { label: 'Reference', value: 'scraped' }
]

const filteredItems = computed(() => {
  const list = tabItems.value[activeTab.value] || []
  const term = search.value.trim().toLowerCase()

  return list.filter((item) => {
    const matchSearch = term
      ? (item.title?.toLowerCase().includes(term) ||
          item.subtitle?.toLowerCase().includes(term) ||
          item.tags?.some((t) => t?.toLowerCase().includes(term))) ?? false
      : true
    const matchLicense = licenseFilter.value
      ? item.license?.toLowerCase() === licenseFilter.value.toLowerCase()
      : true
    const matchSource = sourceFilter.value === 'all' ? true : item.source === sourceFilter.value
    return matchSearch && matchLicense && matchSource
  })
})

const isLoading = computed(() => communityStore.loadingModels)

function formatNumber(num?: number) {
  if (num === undefined || num === null) return '—'
  if (num >= 1000000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

function setActiveTab(key: string) {
  activeTab.value = key as TabKey
}

function sourceColor(source: SourceType) {
  switch (source) {
    case 'community': return 'primary'
    case 'preset': return 'secondary'
    case 'scraped': return 'teal'
  }
}

function labelForSource(source: SourceType) {
  if (source === 'community') return 'Community'
  if (source === 'preset') return 'Preset'
  return 'Reference'
}

function ctaLabel(source: SourceType) {
  if (source === 'preset') return 'Use preset'
  if (source === 'community') return 'View item'
  return 'View details'
}

async function loadData() {
  const tasks = [
    communityStore.fetchStats().catch(() => {}),
    communityStore.fetchModels({ limit: 12 }).catch(() => {})
  ]
  await Promise.all(tasks)
}

onMounted(loadData)
</script>

<style scoped lang="scss">
.catalog-page {
  padding: clamp(18px, 3vw, 28px);
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  padding: clamp(18px, 3vw, 28px);
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(211, 84, 0, 0.08), rgba(99, 102, 241, 0.08));
  border: 1px solid var(--lp-border, #e0e0e0);
}

.hero-text h1 {
  margin: 8px 0 10px;
  font-size: clamp(1.6rem, 3vw, 2.2rem);
}

.eyebrow {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--lp-primary, #d35400);
}

.lede {
  color: var(--lp-text-secondary, #555);
  max-width: 640px;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.stat {
  padding: 12px;
  border-radius: 12px;
  background: var(--lp-bg, #fff);
  border: 1px solid var(--lp-border, #e0e0e0);
}
.stat-value {
  font-weight: 800;
  font-size: 1.25rem;
}
.stat-label {
  color: var(--lp-text-secondary, #666);
}

.hero-visual {
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-stack {
  display: grid;
  gap: 10px;
  width: 100%;
  max-width: 340px;
}

.stack-card {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid var(--lp-border, #e0e0e0);
  background: var(--lp-bg, #fff);
  box-shadow: 0 12px 30px rgba(0,0,0,0.08);
}
.stack-card.primary { background: linear-gradient(135deg, rgba(211,84,0,0.08), rgba(211,84,0,0.02)); }
.stack-card.secondary { background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.02)); }
.stack-card.tertiary { background: linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.02)); }
.stack-badge { font-weight: 700; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--lp-text-secondary, #555); }
.stack-title { font-weight: 800; margin-top: 6px; }
.stack-meta { color: var(--lp-text-secondary, #555); }

.filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--lp-border, #e0e0e0);
  background: var(--lp-bg, #fff);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn.active {
  border-color: var(--lp-primary, #d35400);
  background: rgba(211, 84, 0, 0.08);
}

.pill {
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--lp-bg-alt, #f4f4f4);
  font-size: 0.85rem;
  color: var(--lp-text-secondary, #555);
}

.filter-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.catalog-grid {
  border: 1px solid var(--lp-border, #e0e0e0);
  border-radius: 16px;
  padding: clamp(14px, 2vw, 18px);
  background: var(--lp-bg, #fff);
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.empty-state {
  padding: 32px;
  text-align: center;
  color: var(--lp-text-secondary, #666);
  display: grid;
  gap: 12px;
  justify-items: center;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.catalog-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: 14px;
  background: var(--lp-bg, #fff);
}

.card-top {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 12px 12px 0;
}

.card-body {
  padding: 0 12px;
}

.card-title {
  font-weight: 700;
  font-size: 1.05rem;
  margin-bottom: 4px;
}

.card-subtitle {
  color: var(--lp-text-secondary, #666);
  margin-bottom: 8px;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  padding: 4px 8px;
  border-radius: 10px;
  background: var(--lp-bg-alt, #f4f4f4);
  color: var(--lp-text-secondary, #555);
  font-size: 0.85rem;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px 12px;
  border-top: 1px solid var(--lp-border, #e0e0e0);
  margin-top: auto;
}

.card-footer .stat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--lp-text-secondary, #555);
  font-weight: 600;
}

@media (max-width: 640px) {
  .hero {
    grid-template-columns: 1fr;
  }
}
</style>
