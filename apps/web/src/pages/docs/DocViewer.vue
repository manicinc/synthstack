<template>
  <div class="doc-viewer">
    <!-- Loading State -->
    <div
      v-if="loading"
      class="doc-loading"
    >
      <q-skeleton
        type="text"
        width="60%"
        height="40px"
        class="mb-4"
      />
      <q-skeleton
        type="text"
        width="100%"
      />
      <q-skeleton
        type="text"
        width="90%"
      />
      <q-skeleton
        type="text"
        width="95%"
      />
      <q-skeleton
        type="rect"
        height="200px"
        class="my-4"
      />
      <q-skeleton
        type="text"
        width="100%"
      />
      <q-skeleton
        type="text"
        width="85%"
      />
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="doc-error"
    >
      <q-icon
        name="error_outline"
        size="48px"
        color="negative"
      />
      <h2>Document Not Found</h2>
      <p>{{ error }}</p>
      <q-btn
        color="primary"
        label="Back to Docs"
        @click="$router.push('/docs')"
      />
    </div>

    <!-- Doc Content -->
    <article
      v-else-if="doc"
      class="doc-article"
    >
      <!-- Breadcrumb -->
      <nav class="doc-breadcrumb">
        <router-link to="/docs">
          Docs
        </router-link>
        <q-icon
          name="chevron_right"
          size="16px"
        />
        <span>{{ doc.title }}</span>
      </nav>

      <!-- Title -->
      <header class="doc-header">
        <h1
          :data-directus="directusDoc ? editableAttr({
            collection: 'docs',
            item: directusDoc.id,
            fields: 'title',
            mode: 'popover'
          }) : undefined"
        >
          {{ doc.title }}
        </h1>
        <div
          v-if="doc.lastModified"
          class="doc-meta"
        >
          <q-icon
            name="update"
            size="16px"
          />
          <span>Last updated {{ formatDate(doc.lastModified) }}</span>
        </div>
      </header>

      <!-- Table of Contents (if many headings) -->
      <aside
        v-if="doc.headings.length > 3"
        class="doc-toc"
      >
        <h3>On this page</h3>
        <ul>
          <li
            v-for="heading in doc.headings.filter(h => h.level <= 3)"
            :key="heading.id"
            :class="`toc-level-${heading.level}`"
          >
            <a :href="`#${heading.id}`">{{ heading.text }}</a>
          </li>
        </ul>
      </aside>

      <!-- Main Content -->
      <div
        ref="contentRef"
        class="doc-body prose"
        :data-directus="directusDoc ? editableAttr({
          collection: 'docs',
          item: directusDoc.id,
          fields: 'content',
          mode: 'drawer'
        }) : undefined"
        v-html="doc.html"
      />

      <!-- Navigation -->
      <footer class="doc-footer">
        <router-link
          v-if="adjacentDocs.prev"
          :to="`/docs/${adjacentDocs.prev.slug}`"
          class="nav-link prev"
        >
          <q-icon name="arrow_back" />
          <div>
            <span class="nav-label">Previous</span>
            <span class="nav-title">{{ adjacentDocs.prev.title }}</span>
          </div>
        </router-link>

        <router-link
          v-if="adjacentDocs.next"
          :to="`/docs/${adjacentDocs.next.slug}`"
          class="nav-link next"
        >
          <div>
            <span class="nav-label">Next</span>
            <span class="nav-title">{{ adjacentDocs.next.title }}</span>
          </div>
          <q-icon name="arrow_forward" />
        </router-link>
      </footer>
    </article>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useDocs, type DocContent } from '@/composables/useDocs'
import { useVisualEditing } from '@/composables/useVisualEditing'
import { useSeo } from '@/composables/useSeo'
import { findDocBySlug, getAdjacentDocs, type DocNavItem } from '@/config/docs-navigation'
import { api } from '@/services/api'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const route = useRoute()
const { fetchMarkdownDoc, fetchTutorial, setupCodeCopyHandlers, loading, error } = useDocs()
const { editableAttr } = useVisualEditing()

// State
const doc = ref<DocContent | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const directusDoc = ref<any>(null)

// Get slug from route
const slug = computed(() => route.params.slug as string)

// Get navigation config for this doc
const navItem = computed(() => findDocBySlug(slug.value))

// Get adjacent docs for prev/next nav
const adjacentDocs = computed(() => getAdjacentDocs(slug.value))

// Format date helper
function formatDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// Load document
async function loadDoc() {
  if (!slug.value) return

  const nav = navItem.value

  // Try to fetch from Directus docs collection first
  try {
    const response = await api.get(`/directus/items/docs`, {
      params: {
        filter: { slug: { _eq: slug.value } },
        limit: 1
      }
    })

    if (response.data.data?.[0]) {
      directusDoc.value = response.data.data[0]
      const content = directusDoc.value.content || ''
      const html = DOMPurify.sanitize(marked.parse(content) as string)

      doc.value = {
        title: directusDoc.value.title,
        slug: directusDoc.value.slug,
        content,
        html,
        source: 'directus',
        headings: [],
        lastModified: directusDoc.value.updated_at
      }
    }
  } catch (err) {
    devLog('Doc not found in Directus, trying other sources')
  }

  // Fall back to other sources
  if (!doc.value) {
    if (nav?.source === 'markdown' && nav.file) {
      // Fetch from /docs/ folder
      doc.value = await fetchMarkdownDoc(nav.file)
    } else if (nav?.source === 'directus') {
      // Fetch from Directus CMS tutorials
      doc.value = await fetchTutorial(slug.value)
    } else {
      // Try markdown by slug convention
      const filename = slug.value.toUpperCase().replace(/-/g, '_') + '.md'
      doc.value = await fetchMarkdownDoc(filename)
    }
  }

  // Update SEO
  if (doc.value) {
    const { setPageSeo } = useSeo()
    setPageSeo({
      title: doc.value.title + ' - Documentation',
      description: `${doc.value.title} documentation for SynthStack platform.`,
    })

    // Setup code copy buttons after render
    await nextTick()
    if (contentRef.value) {
      setupCodeCopyHandlers(contentRef.value)
    }
  }
}

// Watch for route changes
watch(slug, loadDoc, { immediate: true })

// Setup on mount
onMounted(async () => {
  await loadDoc()
})
</script>

<style lang="scss" scoped>
.doc-viewer {
  max-width: 900px;
}

.doc-loading {
  padding: 20px 0;
}

.doc-error {
  text-align: center;
  padding: 60px 20px;

  .q-icon {
    margin-bottom: 16px;
  }

  h2 {
    font-size: 1.5rem;
    margin: 0 0 8px;
  }

  p {
    color: var(--text-secondary);
    margin-bottom: 24px;
  }
}

.doc-article {
  position: relative;
}

.doc-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  margin-bottom: 24px;

  a {
    color: var(--text-secondary);
    text-decoration: none;

    &:hover {
      color: var(--primary);
    }
  }

  .q-icon {
    color: var(--text-tertiary);
  }

  span {
    color: var(--text-primary);
  }
}

.doc-header {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-default);

  h1 {
    font-size: 2.25rem;
    font-weight: 800;
    margin: 0 0 12px;
    line-height: 1.2;
  }

  .doc-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
}

.doc-toc {
  float: right;
  width: 220px;
  margin: 0 0 24px 32px;
  padding: 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  position: sticky;
  top: 100px;

  @media (max-width: 1100px) {
    display: none;
  }

  h3 {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
    margin: 0 0 12px;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  li {
    margin: 0;

    a {
      display: block;
      padding: 4px 0;
      font-size: 0.8rem;
      color: var(--text-secondary);
      text-decoration: none;
      transition: color 0.15s;

      &:hover {
        color: var(--primary);
      }
    }

    &.toc-level-2 a {
      padding-left: 0;
    }

    &.toc-level-3 a {
      padding-left: 12px;
      font-size: 0.75rem;
    }
  }
}

// Prose styles for markdown content
.doc-body.prose {
  line-height: 1.7;
  color: var(--text-primary);

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6) {
    font-weight: 700;
    margin: 32px 0 16px;
    line-height: 1.3;
    scroll-margin-top: 80px;

    .heading-anchor {
      opacity: 0;
      color: var(--text-tertiary);
      text-decoration: none;
      margin-right: 8px;
      transition: opacity 0.15s;
    }

    &:hover .heading-anchor {
      opacity: 1;
    }
  }

  :deep(h1) { font-size: 2rem; }
  :deep(h2) { font-size: 1.5rem; border-bottom: 1px solid var(--border-default); padding-bottom: 8px; }
  :deep(h3) { font-size: 1.25rem; }
  :deep(h4) { font-size: 1.1rem; }

  :deep(p) {
    margin: 0 0 16px;
  }

  :deep(a) {
    color: var(--primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  :deep(ul),
  :deep(ol) {
    margin: 0 0 16px;
    padding-left: 24px;

    li {
      margin: 4px 0;
    }
  }

  :deep(blockquote) {
    margin: 16px 0;
    padding: 12px 20px;
    border-left: 4px solid var(--primary);
    background: rgba(99, 102, 241, 0.05);
    border-radius: 0 8px 8px 0;

    p {
      margin: 0;
    }
  }

  :deep(code) {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.875em;
    background: var(--bg-elevated);
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid var(--border-default);
  }

  :deep(pre) {
    margin: 0;

    code {
      display: block;
      padding: 0;
      background: none;
      border: none;
      border-radius: 0;
      overflow-x: auto;
    }
  }

  :deep(.code-block) {
    margin: 16px 0;
    background: #1a1a2e;
    border-radius: 8px;
    overflow: hidden;

    .code-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      background: rgba(255, 255, 255, 0.05);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);

      .code-lang {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.5);
      }

      .code-copy {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.5);
        font-family: 'Material Icons';
        transition: all 0.15s;

        &:hover {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);
        }
      }
    }

    pre {
      padding: 16px;
      margin: 0;
      overflow-x: auto;

      code {
        color: #e0e0e0;
        font-size: 0.875rem;
        line-height: 1.6;
      }
    }
  }

  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 0.9rem;

    th,
    td {
      padding: 10px 12px;
      border: 1px solid var(--border-default);
      text-align: left;
    }

    th {
      background: var(--bg-elevated);
      font-weight: 600;
    }

    tr:nth-child(even) td {
      background: rgba(0, 0, 0, 0.02);
    }
  }

  :deep(hr) {
    border: none;
    height: 1px;
    background: var(--border-default);
    margin: 32px 0;
  }

  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 16px 0;
  }
}

.doc-footer {
  display: flex;
  gap: 20px;
  margin-top: 48px;
  padding-top: 32px;
  border-top: 1px solid var(--border-default);

  @media (max-width: 600px) {
    flex-direction: column;
  }
}

.nav-link {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--primary);
    background: rgba(99, 102, 241, 0.04);
  }

  &.next {
    justify-content: flex-end;
    text-align: right;
  }

  .q-icon {
    font-size: 1.25rem;
    color: var(--text-tertiary);
  }

  .nav-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
    margin-bottom: 2px;
  }

  .nav-title {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
  }
}
</style>
