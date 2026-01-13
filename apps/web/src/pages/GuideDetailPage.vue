<!--
  @component GuideDetailPage
  @description Individual guide page with SEO-optimized educational content.
  Dynamically loads content based on slug parameter.
-->
<template>
  <q-page class="guide-page">
    <article
      v-if="guide"
      class="guide-container"
    >
      <header class="guide-header">
        <div class="container">
          <router-link
            to="/guides"
            class="back-link"
          >
            <q-icon name="sym_o_arrow_back" />
            Back to Guides
          </router-link>
          <div class="guide-meta">
            <span
              class="difficulty"
              :class="guide.difficulty"
            >{{ guide.difficulty }}</span>
            <span class="read-time">{{ guide.readTime }} min read</span>
            <span class="updated">Updated: {{ guide.updated }}</span>
          </div>
          <h1
            :data-directus="directusGuide ? editableAttr({
              collection: 'guides',
              item: directusGuide.id,
              fields: 'title',
              mode: 'popover'
            }) : undefined"
          >
            {{ guide.title }}
          </h1>
          <p
            class="description"
            :data-directus="directusGuide ? editableAttr({
              collection: 'guides',
              item: directusGuide.id,
              fields: 'summary',
              mode: 'popover'
            }) : undefined"
          >
            {{ guide.description }}
          </p>
        </div>
      </header>

      <nav class="table-of-contents">
        <div class="container">
          <h3>Table of Contents</h3>
          <ol>
            <li
              v-for="section in guide.sections"
              :key="section.id"
            >
              <a :href="`#${section.id}`">{{ section.title }}</a>
            </li>
          </ol>
        </div>
      </nav>

      <div
        class="guide-content"
        :data-directus="directusGuide ? editableAttr({
          collection: 'guides',
          item: directusGuide.id,
          fields: 'content',
          mode: 'drawer'
        }) : undefined"
      >
        <div class="container">
          <section
            v-for="section in guide.sections"
            :id="section.id"
            :key="section.id"
          >
            <h2>{{ section.title }}</h2>
            <div v-html="section.content" />
          </section>
        </div>
      </div>

      <footer class="guide-footer">
        <div class="container">
          <div class="related-guides">
            <h3>Related Guides</h3>
            <div class="related-grid">
              <router-link
                v-for="related in guide.related"
                :key="related.slug"
                :to="`/guides/${related.slug}`"
                class="related-card"
              >
                <span class="related-title">{{ related.title }}</span>
                <q-icon name="sym_o_arrow_forward" />
              </router-link>
            </div>
          </div>
          <div class="cta-box">
            <h3>Skip the Manual Configuration</h3>
            <p>Let SynthStack AI generate these settings for your specific model automatically.</p>
            <q-btn
              label="Try Free Generation"
              color="accent"
              to="/app/generate"
            />
          </div>
        </div>
      </footer>
    </article>

    <div
      v-else
      class="loading"
    >
      <q-spinner
        size="lg"
        color="accent"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSeo } from '@/composables/useSeo'
import { useGuides, type Guide as DirectusGuide } from '@/composables/useGuides'
import { useVisualEditing } from '@/composables/useVisualEditing'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const route = useRoute()
const { setPageSeo, setHowToSeo } = useSeo()
const { fetchGuide } = useGuides()
const { editableAttr } = useVisualEditing()

interface GuideSection {
  id: string
  title: string
  content: string
}

interface Guide {
  title: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  readTime: number
  updated: string
  sections: GuideSection[]
  related: Array<{ slug: string; title: string }>
}

const guide = ref<Guide | null>(null)
const directusGuide = ref<DirectusGuide | null>(null)

// Render markdown content
function renderContent(content: string): string {
  try {
    const html = marked.parse(content) as string
    return DOMPurify.sanitize(html)
  } catch {
    return content
  }
}

onMounted(async () => {
  const slug = route.params.slug as string

  // Try to fetch from Directus first
  directusGuide.value = await fetchGuide(slug)

  if (directusGuide.value) {
    // Use Directus content
    const renderedContent = renderContent(directusGuide.value.content)
    const sections: GuideSection[] = [
      {
        id: 'content',
        title: 'Guide Content',
        content: renderedContent
      }
    ]

    guide.value = {
      title: directusGuide.value.title,
      description: directusGuide.value.summary || 'A comprehensive guide',
      difficulty: (directusGuide.value.difficulty || 'intermediate') as 'beginner' | 'intermediate' | 'advanced',
      readTime: Math.ceil((directusGuide.value.content || '').split(' ').length / 200),
      updated: new Date(directusGuide.value.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      sections,
      related: []
    }
  } else {
    // Fall back to mock data
    guide.value = {
      title: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      description: 'A comprehensive guide to help you master this topic.',
      difficulty: 'intermediate',
      readTime: 15,
      updated: 'Dec 1, 2024',
      sections: [
        { id: 'introduction', title: 'Introduction', content: 'This guide will walk you through...' },
        { id: 'prerequisites', title: 'Prerequisites', content: 'Before you begin, make sure you have...' }
      ],
      related: []
    }
  }

  if (guide.value) {
    setPageSeo({
      title: `${guide.value.title} - Guide | SynthStack`,
      description: guide.value.description,
      keywords: ['guide', 'tutorial', ...slug.split('-')],
      canonicalPath: `/guides/${slug}`,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Guides', url: '/guides' },
        { name: guide.value.title, url: `/guides/${slug}` }
      ]
    })
  }
})
</script>

<style lang="scss" scoped>
.guide-page {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 var(--space-md);
}

.guide-header {
  padding: var(--space-3xl) 0;
  background: var(--bg-secondary);
  
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    color: var(--text-secondary);
    text-decoration: none;
    margin-bottom: var(--space-lg);
    
    &:hover {
      color: var(--color-accent);
    }
  }
  
  .guide-meta {
    display: flex;
    gap: var(--space-md);
    font-size: var(--text-sm);
    margin-bottom: var(--space-md);
    
    .difficulty {
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      font-weight: 500;
      
      &.beginner { background: #10b981; color: white; }
      &.intermediate { background: #f59e0b; color: white; }
      &.advanced { background: #ef4444; color: white; }
    }
    
    .read-time, .updated {
      color: var(--text-muted);
    }
  }
  
  h1 {
    font-family: var(--font-display);
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    margin-bottom: var(--space-md);
  }
  
  .description {
    font-size: var(--text-lg);
    color: var(--text-secondary);
    line-height: 1.7;
  }
}

.table-of-contents {
  padding: var(--space-xl) 0;
  background: var(--bg-tertiary);
  
  h3 {
    font-family: var(--font-display);
    font-size: var(--text-base);
    margin-bottom: var(--space-md);
  }
  
  ol {
    margin: 0;
    padding-left: var(--space-lg);
    
    li {
      margin-bottom: var(--space-xs);
      
      a {
        color: var(--text-secondary);
        text-decoration: none;
        
        &:hover {
          color: var(--color-accent);
        }
      }
    }
  }
}

.guide-content {
  padding: var(--space-3xl) 0;
  
  section {
    margin-bottom: var(--space-2xl);
    
    h2 {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      margin-bottom: var(--space-md);
      padding-top: var(--space-md);
    }
    
    p {
      color: var(--text-secondary);
      line-height: 1.8;
    }
  }
}

.guide-footer {
  padding: var(--space-3xl) 0;
  background: var(--bg-secondary);
  
  .related-guides {
    margin-bottom: var(--space-2xl);
    
    h3 {
      font-family: var(--font-display);
      margin-bottom: var(--space-md);
    }
    
    .related-grid {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }
    
    .related-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-md);
      background: var(--bg-primary);
      border-radius: var(--radius-md);
      text-decoration: none;
      color: var(--text-primary);
      
      &:hover {
        background: var(--bg-tertiary);
        
        .q-icon {
          transform: translateX(4px);
        }
      }
      
      .q-icon {
        color: var(--color-accent);
        transition: transform 0.2s;
      }
    }
  }
  
  .cta-box {
    padding: var(--space-xl);
    background: linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-primary) 100%);
    border-radius: var(--radius-xl);
    text-align: center;
    
    h3 {
      font-family: var(--font-display);
      margin-bottom: var(--space-sm);
    }
    
    p {
      color: var(--text-secondary);
      margin-bottom: var(--space-md);
    }
  }
}

.loading {
  display: flex;
  justify-content: center;
  padding: var(--space-4xl);
}
</style>





