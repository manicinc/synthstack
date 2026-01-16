<template>
  <q-page class="docs-page">
    <div class="docs-container">
      <!-- Sidebar -->
      <aside
        class="docs-sidebar"
        :class="{ 'sidebar-open': sidebarOpen }"
      >
        <div class="sidebar-header">
          <h2>Documentation</h2>
          <q-btn
            flat
            round
            dense
            icon="close"
            class="close-sidebar"
            @click="sidebarOpen = false"
          />
        </div>

        <!-- Search -->
        <div class="sidebar-search">
          <q-input
            v-model="searchQuery"
            placeholder="Search docs..."
            dense
            outlined
            class="search-input"
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
            <template
              v-if="searchQuery"
              #append
            >
              <q-icon
                name="clear"
                class="cursor-pointer"
                @click="searchQuery = ''"
              />
            </template>
          </q-input>
        </div>

        <!-- Navigation -->
        <nav class="sidebar-nav">
          <ul class="nav-list">
            <li
              v-for="section in docsNavigation"
              :key="section.slug"
              class="nav-section"
            >
              <div class="section-header">
                <q-icon
                  v-if="section.icon"
                  :name="section.icon"
                />
                <span>{{ section.title }}</span>
              </div>

              <ul
                v-if="section.children"
                class="section-items"
              >
                <li
                  v-for="item in section.children"
                  :key="item.slug"
                  class="nav-item"
                  :class="{ active: currentSlug === item.slug }"
                >
                  <router-link :to="`/docs/${item.slug}`" class="nav-link">
                    <span class="nav-title">{{ item.title }}</span>
                    <q-badge
                      v-if="item.badge"
                      :color="badgeColor(item.badge)"
                      outline
                      class="nav-badge"
                    >
                      {{ item.badge }}
                    </q-badge>
                  </router-link>
                </li>
              </ul>
            </li>
          </ul>
        </nav>
      </aside>

      <!-- Mobile sidebar toggle -->
      <q-btn
        flat
        round
        icon="menu"
        class="mobile-menu-btn"
        @click="sidebarOpen = true"
      />

      <!-- Main Content -->
      <main class="docs-content">
        <!-- Search results -->
        <div
          v-if="!currentSlug && searchQuery.trim().length >= 2"
          class="docs-search"
        >
          <div class="search-header">
            <div>
              <h1>Search</h1>
              <p class="search-subtitle">
                Results for “{{ searchQuery.trim() }}”
              </p>
            </div>

            <q-btn-toggle
              v-if="ragAvailable"
              v-model="searchMode"
              toggle-color="primary"
              :options="[
                { label: 'Keyword', value: 'keyword', icon: 'manage_search' },
                { label: 'Semantic', value: 'semantic', icon: 'auto_awesome' }
              ]"
              dense
              unelevated
              class="search-toggle"
            />
          </div>

          <div
            v-if="searching"
            class="search-loading"
          >
            <q-skeleton type="text" width="65%" class="q-mb-sm" />
            <q-skeleton type="text" width="90%" class="q-mb-md" />
            <q-skeleton type="rect" height="88px" class="q-mb-sm" />
            <q-skeleton type="rect" height="88px" class="q-mb-sm" />
            <q-skeleton type="rect" height="88px" />
          </div>

          <div
            v-else-if="searchResults.length === 0"
            class="search-empty"
          >
            <q-icon name="search_off" size="44px" class="q-mb-sm" />
            <div class="text-h6">No results</div>
            <div class="text-body2 text-grey-7">
              Try a different keyword, or browse from the sidebar.
            </div>
          </div>

          <div
            v-else
            class="search-results"
          >
            <router-link
              v-for="result in searchResults"
              :key="result.id"
              :to="`/docs/${result.slug}`"
              class="search-result"
            >
              <div class="result-top">
                <div class="result-title">{{ result.title }}</div>
                <q-badge
                  v-if="result.badge"
                  :color="badgeColor(result.badge)"
                  outline
                  class="result-badge"
                >
                  {{ result.badge }}
                </q-badge>
              </div>
              <div
                v-if="result.subtitle"
                class="result-subtitle"
              >
                {{ result.subtitle }}
              </div>
              <div class="result-excerpt">
                {{ result.excerpt }}
              </div>
              <div
                v-if="typeof result.meta === 'string'"
                class="result-meta"
              >
                {{ result.meta }}
              </div>
            </router-link>
          </div>
        </div>

        <!-- Welcome/Overview when no doc selected -->
        <div
          v-else-if="!currentSlug"
          class="docs-welcome"
        >
          <h1>SynthStack Documentation</h1>
          <p class="lead">
            Welcome to the SynthStack documentation. Here you'll find guides,
            tutorials, and technical documentation to help you get the most
            out of the platform.
          </p>

          <q-banner
            dense
            rounded
            class="bg-blue-1 text-blue-10 q-mb-lg"
          >
            <template #avatar>
              <q-icon
                name="palette"
                color="blue-8"
              />
            </template>
            <div class="text-body2">
              <strong>Rebrand fast:</strong> Generate a complete <code>config.json</code> with the Branding Wizard.
            </div>
            <template #action>
              <div class="row items-center q-gutter-sm">
                <q-btn
                  flat
                  dense
                  color="blue-10"
                  label="Branding"
                  to="/setup/branding"
                />
                <q-btn
                  flat
                  dense
                  color="blue-10"
                  label="Env Setup"
                  to="/setup/env"
                />
              </div>
            </template>
          </q-banner>

          <div class="quick-links">
            <router-link
              v-for="link in quickLinks"
              :key="link.slug"
              :to="`/docs/${link.slug}`"
              class="quick-link"
            >
              <q-icon :name="link.icon" />
              <div>
                <h3>{{ link.title }}</h3>
                <p>{{ link.description }}</p>
              </div>
            </router-link>
          </div>

          <!-- Doc file list from API -->
          <div
            v-if="docsList.length > 0"
            class="docs-list-section"
          >
            <h2>All Documentation</h2>
            <div class="docs-grid">
              <router-link
                v-for="doc in docsList"
                :key="doc.slug"
                :to="`/docs/${doc.slug}`"
                class="doc-card"
              >
                <q-icon name="description" />
                <h4>{{ doc.title }}</h4>
                <span class="doc-meta">
                  {{ formatDate(doc.lastModified) }}
                </span>
              </router-link>
            </div>
          </div>
        </div>

        <!-- Doc content (loaded via router-view or inline) -->
        <router-view v-if="currentSlug" />
      </main>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSeo } from '@/composables/useSeo'
import { useApi } from '@/composables/useApi'
import { docsNavigation, flattenNavigation } from '@/config/docs-navigation'
import { logError } from '@/utils/devLogger'

const route = useRoute()
const { get } = useApi()
const { setPageSeo } = useSeo()

setPageSeo({
  title: 'Documentation',
  description: 'SynthStack documentation, guides, and tutorials for developers and users.',
})

// State
const sidebarOpen = ref(false)
const searchQuery = ref('')
const docsList = ref<Array<{ filename: string; title: string; slug: string; lastModified: string }>>([])
const ragAvailable = ref(false)
const searching = ref(false)
const searchMode = ref<'keyword' | 'semantic'>('keyword')

type SearchResult = {
  id: string
  slug: string
  title: string
  subtitle?: string
  excerpt: string
  badge?: 'Pro' | 'Community' | 'Internal' | 'Coming Soon'
  meta?: string
}

const navByFile = (() => {
  const map = new Map<string, { slug: string; badge?: SearchResult['badge'] }>()
  const flat = flattenNavigation(docsNavigation)
  for (const item of flat) {
    if (item.source === 'markdown' && item.file) {
      map.set(item.file.replace(/\\/g, '/'), { slug: item.slug, badge: item.badge })
    }
  }
  return map
})()

function fileToSlug(filename: string): string {
  return filename.replace(/\.md$/i, '').toLowerCase().replace(/[_/]/g, '-')
}

function badgeColor(badge: SearchResult['badge']): string {
  if (badge === 'Pro') return 'deep-purple-5'
  if (badge === 'Community') return 'green-6'
  if (badge === 'Coming Soon') return 'grey-6'
  return 'grey-7'
}

const keywordResults = ref<SearchResult[]>([])
const semanticResults = ref<SearchResult[]>([])

const searchResults = computed(() => (searchMode.value === 'semantic' ? semanticResults.value : keywordResults.value))

// Current doc slug from route
const currentSlug = computed(() => route.params.slug as string || '')

// Quick links for landing
const quickLinks = [
  {
    slug: 'admin-cms',
    icon: 'dashboard',
    title: 'Admin CMS',
    description: 'Learn about the Directus admin interface and content management.',
  },
  {
    slug: 'design-system',
    icon: 'palette',
    title: 'Design System',
    description: 'Explore our design tokens, components, and styling guidelines.',
  },
  {
    slug: 'email-service',
    icon: 'email',
    title: 'Email Service',
    description: 'Configure email delivery and templates.',
  },
  {
    slug: 'cron-jobs',
    icon: 'schedule',
    title: 'Cron Jobs',
    description: 'Set up automated tasks and background jobs.',
  },
]

// Fetch docs list from API
async function fetchDocsList() {
  try {
    const response = await get<{ docs: typeof docsList.value }>('/docs')
    if (response?.docs) {
      docsList.value = response.docs
    }
  } catch (error) {
    logError('Failed to fetch docs list:', error)
  }
}

async function fetchRagAvailability() {
  try {
    const status = await get<{ available: boolean }>('/docs/rag/status')
    ragAvailable.value = status?.available ?? false
  } catch {
    ragAvailable.value = false
  }
}

function truncate(text: string, max = 180): string {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim()
  if (cleaned.length <= max) return cleaned
  return cleaned.slice(0, max - 1) + '…'
}

async function runKeywordSearch(query: string) {
  const params = new URLSearchParams({ q: query })
  const response = await get<{
    results: Array<{ filename: string; title: string; slug: string; excerpt: string; matches: number }>
  }>(`/docs/search?${params}`)

  const results = response?.results || []
  keywordResults.value = results.map((r) => {
    const nav = navByFile.get(r.filename)
    const slug = nav?.slug || r.slug
    return {
      id: `kw:${r.filename}`,
      slug,
      title: r.title,
      excerpt: truncate(r.excerpt, 220),
      badge: nav?.badge,
      meta: `${r.matches} match${r.matches === 1 ? '' : 'es'}`
    }
  })
}

async function runSemanticSearch(query: string) {
  const params = new URLSearchParams({ q: query, limit: '10', type: 'documentation' })
  const response = await get<{
    results: Array<{ id: string; score: number; title: string; section: string; content: string; filename: string }>
    available: boolean
  }>(`/docs/rag/search?${params}`)

  if (typeof response?.available === 'boolean') {
    ragAvailable.value = response.available
  }

  const results = response?.results || []
  semanticResults.value = results.map((r) => {
    const nav = navByFile.get(r.filename)
    const slug = nav?.slug || fileToSlug(r.filename)
    return {
      id: `rag:${r.id}`,
      slug,
      title: r.title,
      subtitle: r.section,
      excerpt: truncate(r.content, 240),
      badge: nav?.badge,
      meta: `Score ${Math.round(r.score * 100)}%`
    }
  })
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch([searchQuery, searchMode], ([query]) => {
  if (searchTimer) clearTimeout(searchTimer)

  const normalized = (query || '').trim()
  if (normalized.length < 2) {
    keywordResults.value = []
    semanticResults.value = []
    searching.value = false
    return
  }

  searchTimer = setTimeout(async () => {
    searching.value = true
    try {
      if (searchMode.value === 'semantic') {
        await runSemanticSearch(normalized)
      } else {
        await runKeywordSearch(normalized)
      }
    } finally {
      searching.value = false
    }
  }, 250)
})

// Format date helper
function formatDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Close sidebar on route change (mobile)
watch(() => route.params.slug, () => {
  sidebarOpen.value = false
  if (route.params.slug) {
    searchQuery.value = ''
  }
})

onMounted(() => {
  fetchDocsList()
  fetchRagAvailability()
})
</script>

<style lang="scss" scoped>
.docs-page {
  min-height: 100vh;
  background: var(--bg-base);
}

.docs-container {
  display: flex;
  max-width: 1400px;
  margin: 0 auto;
  min-height: calc(100vh - 64px);
}

// Sidebar
.docs-sidebar {
  width: 280px;
  flex-shrink: 0;
  background: var(--bg-elevated);
  border-right: 1px solid var(--border-default);
  height: calc(100vh - 64px);
  position: sticky;
  top: 64px;
  overflow-y: auto;
  padding: 24px 0;

  @media (max-width: 960px) {
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    z-index: 1000;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);

    &.sidebar-open {
      transform: translateX(0);
    }
  }
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px 16px;
  border-bottom: 1px solid var(--border-default);
  margin-bottom: 16px;

  h2 {
    font-size: 1.125rem;
    font-weight: 700;
    margin: 0;
  }

  .close-sidebar {
    display: none;

    @media (max-width: 960px) {
      display: flex;
    }
  }
}

.sidebar-search {
  padding: 0 16px 16px;

  .search-input {
    :deep(.q-field__control) {
      background: var(--bg-base);
    }
  }
}

.sidebar-nav {
  padding: 0 12px;
}

.nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-section {
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);

  .q-icon {
    font-size: 1rem;
  }
}

.section-items {
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-item {
  a {
    display: block;
    padding: 8px 12px 8px 32px;
    color: var(--text-primary);
    text-decoration: none;
    font-size: 0.9rem;
    border-radius: 6px;
    transition: all 0.15s ease;

    &:hover {
      background: rgba(99, 102, 241, 0.08);
      color: var(--primary);
    }
  }

  &.active a {
    background: rgba(99, 102, 241, 0.12);
    color: var(--primary);
    font-weight: 600;
  }
}

.nav-link {
  display: flex !important;
  align-items: center;
  gap: 10px;
}

.nav-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-badge {
  font-size: 0.65rem;
  line-height: 1;
}

// Mobile menu button
.mobile-menu-btn {
  display: none;
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 100;
  background: var(--primary);
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);

  @media (max-width: 960px) {
    display: flex;
  }
}

// Main content
.docs-content {
  flex: 1;
  min-width: 0;
  padding: 32px 48px;

  @media (max-width: 768px) {
    padding: 24px 20px;
  }
}

.docs-search {
  max-width: 900px;

  .search-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;

    h1 {
      font-size: 2.25rem;
      font-weight: 800;
      margin: 0 0 8px;
    }
  }

  .search-subtitle {
    margin: 0;
    color: var(--text-secondary);
  }

  .search-toggle {
    flex-shrink: 0;
  }
}

.search-loading {
  padding: 8px 0;
}

.search-empty {
  text-align: center;
  padding: 48px 16px;
  color: var(--text-secondary);

  .q-icon {
    color: var(--text-tertiary);
  }
}

.search-results {
  display: grid;
  gap: 12px;
}

.search-result {
  display: block;
  padding: 16px 18px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 14px;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--primary);
    background: rgba(99, 102, 241, 0.04);
    transform: translateY(-1px);
  }

  .result-top {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
  }

  .result-title {
    font-weight: 800;
    color: var(--text-primary);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result-badge {
    font-size: 0.65rem;
    line-height: 1;
  }

  .result-subtitle {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .result-excerpt {
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--text-secondary);
  }

  .result-meta {
    margin-top: 10px;
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }
}

// Welcome section
.docs-welcome {
  max-width: 900px;

  h1 {
    font-size: 2.5rem;
    font-weight: 800;
    margin: 0 0 16px;
    background: linear-gradient(135deg, var(--primary) 0%, #818CF8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .lead {
    font-size: 1.25rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 48px;
  }
}

.quick-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 48px;
}

.quick-link {
  display: flex;
  gap: 20px;
  padding: 24px;
  background: linear-gradient(135deg,
    rgba(99, 102, 241, 0.03) 0%,
    rgba(139, 92, 246, 0.02) 100%
  );
  border: 1.5px solid transparent;
  background-clip: padding-box;
  border-radius: 16px;
  text-decoration: none;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

  // Gradient border effect
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 16px;
    padding: 1.5px;
    background: linear-gradient(135deg,
      rgba(99, 102, 241, 0.2) 0%,
      rgba(139, 92, 246, 0.1) 100%
    );
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  // Shimmer effect on hover
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.08),
      transparent
    );
    transition: left 0.5s ease;
  }

  &:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow:
      0 12px 32px rgba(99, 102, 241, 0.15),
      0 2px 8px rgba(0, 0, 0, 0.08);
    background: linear-gradient(135deg,
      rgba(99, 102, 241, 0.06) 0%,
      rgba(139, 92, 246, 0.04) 100%
    );

    &::before {
      opacity: 1;
    }

    &::after {
      left: 100%;
    }

    .q-icon {
      transform: scale(1.1) rotate(5deg);
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
    }
  }

  .q-icon {
    font-size: 2.5rem;
    background: linear-gradient(135deg,
      var(--primary) 0%,
      rgba(139, 92, 246, 0.8) 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    flex-shrink: 0;
    transition: all 0.3s ease;
    filter: drop-shadow(0 2px 4px rgba(99, 102, 241, 0.2));
  }

  > div {
    flex: 1;
    position: relative;
  }

  h3 {
    font-size: 1.125rem;
    font-weight: 700;
    margin: 0 0 6px;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 8px;

    // Add arrow that appears on hover
    &::after {
      content: '→';
      margin-left: auto;
      font-size: 1.25rem;
      opacity: 0;
      transform: translateX(-8px);
      transition: all 0.3s ease;
      color: var(--primary);
    }
  }

  &:hover h3::after {
    opacity: 1;
    transform: translateX(0);
  }

  p {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.6;
  }
}

.docs-list-section {
  h2 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 24px;
  }
}

.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.doc-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px;
  background: var(--bg-elevated);
  border: 1.5px solid var(--border-default);
  border-radius: 12px;
  text-decoration: none;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg,
      var(--primary) 0%,
      rgba(139, 92, 246, 0.8) 100%
    );
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.3s ease;
  }

  &:hover {
    border-color: var(--primary);
    background: rgba(99, 102, 241, 0.04);
    transform: translateY(-2px);
    box-shadow:
      0 8px 20px rgba(99, 102, 241, 0.12),
      0 2px 6px rgba(0, 0, 0, 0.08);

    &::before {
      transform: scaleX(1);
    }

    .q-icon {
      transform: scale(1.1);
      color: var(--primary);
    }
  }

  .q-icon {
    font-size: 1.75rem;
    color: var(--text-secondary);
    transition: all 0.3s ease;
  }

  h4 {
    font-size: 0.95rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-primary);
    line-height: 1.4;
  }

  .doc-meta {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    margin-top: auto;
  }
}
</style>
