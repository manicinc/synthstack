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
                  <router-link :to="`/docs/${item.slug}`">
                    {{ item.title }}
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
        <!-- Welcome/Overview when no doc selected -->
        <div
          v-if="!currentSlug"
          class="docs-welcome"
        >
          <h1>SynthStack Documentation</h1>
          <p class="lead">
            Welcome to the SynthStack documentation. Here you'll find guides,
            tutorials, and technical documentation to help you get the most
            out of the platform.
          </p>

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
import { docsNavigation } from '@/config/docs-navigation'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'

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

// Format date helper
function formatDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Close sidebar on route change (mobile)
watch(() => route.params.slug, () => {
  sidebarOpen.value = false
})

onMounted(() => {
  fetchDocsList()
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
