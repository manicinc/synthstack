<!--
  @component BlogPostPage
  @description Individual blog post page with SEO-optimized content display.
  Dynamically loads content from Directus CMS based on slug parameter.
-->
<template>
  <q-page class="blog-post-page">
    <!-- Loading State -->
    <div
      v-if="loading"
      class="loading"
    >
      <q-spinner
        size="lg"
        color="primary"
      />
      <p>Loading article...</p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="error-state"
    >
      <q-icon
        name="error_outline"
        size="64px"
        color="negative"
      />
      <h2>Article Not Found</h2>
      <p>{{ error }}</p>
      <q-btn
        color="primary"
        label="Back to Blog"
        to="/blog"
      />
    </div>

    <!-- Post Content -->
    <article
      v-else-if="post"
      class="post-container"
    >
      <!-- Cover Image Hero -->
      <div
        v-if="coverImageUrl"
        class="cover-hero"
      >
        <img
          :src="coverImageUrl"
          :alt="post.title"
          class="cover-image"
          :data-directus="editableAttr({
            collection: 'blog_posts',
            item: post.id,
            fields: 'hero_image',
            mode: 'popover'
          })"
        >
        <div class="cover-overlay" />
      </div>

      <header
        class="post-header"
        :class="{ 'has-cover': coverImageUrl }"
      >
        <div class="container">
          <router-link
            to="/blog"
            class="back-link"
          >
            <q-icon name="arrow_back" />
            Back to Blog
          </router-link>
          <div class="post-meta">
            <span
              v-if="category"
              class="category"
            >{{ category.name }}</span>
            <span class="date">{{ formatDate(post.published_at) }}</span>
            <span
              v-if="post.read_time"
              class="read-time"
            >{{ post.read_time }} min read</span>
          </div>
          <h1
            :data-directus="editableAttr({
              collection: 'blog_posts',
              item: post.id,
              fields: 'title',
              mode: 'popover'
            })"
          >
            {{ post.title }}
          </h1>
          <p
            class="excerpt"
            :data-directus="editableAttr({
              collection: 'blog_posts',
              item: post.id,
              fields: 'summary',
              mode: 'popover'
            })"
          >
            {{ post.summary }}
          </p>
          <div
            v-if="author"
            class="author"
          >
            <div class="author-avatar">
              <img
                v-if="author.avatar"
                :src="author.avatar"
                :alt="author.name"
              >
              <q-icon
                v-else
                name="person"
                size="24px"
              />
            </div>
            <div class="author-info">
              <span class="author-name">{{ author.name }}</span>
              <span class="author-role">{{ author.role || 'SynthStack Team' }}</span>
            </div>
          </div>
        </div>
      </header>

      <div class="post-content">
        <div class="container">
          <div
            ref="contentRef"
            class="prose"
            :data-directus="editableAttr({
              collection: 'posts',
              item: post.id,
              fields: 'body',
              mode: 'drawer'
            })"
            v-html="renderedContent"
          />
        </div>
      </div>

      <footer class="post-footer">
        <div class="container">
          <div class="share-section">
            <span>Share this article:</span>
            <div class="share-buttons">
              <q-btn
                flat
                round
                icon="share"
                @click="share"
              />
              <q-btn
                flat
                round
                icon="content_copy"
                @click="copyLink"
              />
            </div>
          </div>
          <div
            v-if="tags.length"
            class="tags"
          >
            <span
              v-for="tag in tags"
              :key="tag"
              class="tag"
            >{{ tag }}</span>
          </div>
        </div>
      </footer>

      <!-- Related Posts -->
      <section
        v-if="relatedPosts.length"
        class="related-section"
      >
        <div class="container">
          <h2>Related Articles</h2>
          <div class="related-grid">
            <router-link
              v-for="related in relatedPosts"
              :key="related.id"
              :to="`/blog/${related.slug}`"
              class="related-card"
            >
              <span class="related-category">{{ getCategoryName(related) }}</span>
              <h3>{{ related.title }}</h3>
              <p>{{ related.summary }}</p>
            </router-link>
          </div>
        </div>
      </section>
    </article>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'
import { useSeo } from '@/composables/useSeo'
import { useBlog, type BlogPost } from '@/composables/useBlog'
import { useToast } from '@/composables/useToast'
import { useVisualEditing } from '@/composables/useVisualEditing'
import { marked, type MarkedOptions } from 'marked'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'

const route = useRoute()
const { setArticleSeo } = useSeo()
const { fetchPost, fetchPosts, posts, loading, error } = useBlog()
const { success } = useToast()
const { editableAttr } = useVisualEditing()

// State
const post = ref<BlogPost | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const category = ref<{ name: string; slug: string } | null>(null)
const author = ref<{ name: string; avatar?: string; role?: string } | null>(null)
const tags = ref<string[]>([])

// Slug from route
const slug = computed(() => route.params.slug as string)

// Configure marked with syntax highlighting
// Note: 'highlight' option is deprecated in newer marked versions but still functional
// Using type assertion to maintain backward compatibility
marked.setOptions({
  highlight: (code: string, lang: string) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  },
  gfm: true,
  breaks: true,
} as MarkedOptions)

// Render markdown content
const renderedContent = computed(() => {
  if (!post.value?.body) return ''

  // Parse markdown
  const html = marked.parse(post.value.body) as string

  // Sanitize and return
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
  })
})

// Cover image URL - API returns pre-constructed path like "/assets/filename.jpg"
const coverImageUrl = computed(() => {
  if (!post.value?.image) return null
  const imagePath = post.value.image
  // If it's already a full URL, use as-is
  if (imagePath.startsWith('http')) return imagePath
  // If it's a relative /assets path, prepend the Directus URL
  const directusUrl = import.meta.env.VITE_DIRECTUS_URL || 'http://localhost:8099'
  return `${directusUrl}${imagePath}?width=1200&quality=85`
})

// Related posts (same category, excluding current)
const relatedPosts = computed(() => {
  if (!post.value || !posts.value.length) return []
  return posts.value
    .filter(p => p.category_id === post.value?.category_id && p.id !== post.value?.id)
    .slice(0, 3)
})

// Format date
function formatDate(dateString?: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

// Get category name helper - finds category in related posts
function getCategoryName(related: BlogPost): string {
  return related.category_name || 'Article'
}

// Share functionality
async function share() {
  if (navigator.share) {
    try {
      await navigator.share({
        title: post.value?.title,
        text: post.value?.summary,
        url: window.location.href
      })
    } catch (err) {
      // User cancelled or error
    }
  } else {
    copyLink()
  }
}

// Copy link
async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    success('Link copied to clipboard!')
  } catch (err) {
    logError('Failed to copy:', err)
  }
}

// Setup code copy buttons
function setupCodeCopyHandlers() {
  if (!contentRef.value) return

  const codeBlocks = contentRef.value.querySelectorAll('pre code')
  codeBlocks.forEach((block) => {
    const pre = block.parentElement
    if (!pre || pre.querySelector('.code-copy')) return

    const wrapper = document.createElement('div')
    wrapper.className = 'code-block'

    const header = document.createElement('div')
    header.className = 'code-header'

    const lang = block.className.match(/language-(\w+)/)?.[1] || 'code'
    header.innerHTML = `
      <span class="code-lang">${lang}</span>
      <button class="code-copy" title="Copy code">content_copy</button>
    `

    pre.parentNode?.insertBefore(wrapper, pre)
    wrapper.appendChild(header)
    wrapper.appendChild(pre)

    header.querySelector('.code-copy')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(block.textContent || '')
        const btn = header.querySelector('.code-copy')
        if (btn) {
          btn.textContent = 'check'
          setTimeout(() => btn.textContent = 'content_copy', 2000)
        }
      } catch (err) {
        logError('Copy failed:', err)
      }
    })
  })
}

// Load post
async function loadPost() {
  if (!slug.value) return

  const data = await fetchPost(slug.value)
  if (data) {
    post.value = data

    // Extract additional data - API returns flat fields
    if (data.category_name || data.category_slug) {
      category.value = {
        name: data.category_name || 'Blog',
        slug: data.category_slug || 'blog'
      }
    } else if (data.category) {
      category.value = data.category
    }

    if (data.author_name) {
      author.value = {
        name: data.author_name,
        avatar: data.author_avatar,
        role: data.author_role || 'SynthStack Team'
      }
    } else if (data.author) {
      author.value = data.author
    } else {
      author.value = { name: 'SynthStack Team', role: 'SynthStack Team' }
    }

    if (data.tags) {
      tags.value = Array.isArray(data.tags) ? data.tags : [data.tags]
    } else if (data.seo_keywords) {
      tags.value = Array.isArray(data.seo_keywords) ? data.seo_keywords : []
    }

    // Set SEO
    setArticleSeo({
      title: data.seo_title || data.title,
      description: data.seo_description || data.summary,
      publishedTime: data.published_at,
      author: author.value?.name || 'SynthStack Team',
      section: category.value?.name || 'Blog',
      tags: tags.value,
      canonicalPath: `/blog/${slug.value}`
    })

    // Setup code handlers after render
    await nextTick()
    setupCodeCopyHandlers()
  }

  // Fetch related posts
  if (!posts.value.length) {
    await fetchPosts()
  }
}

// Watch for route changes
watch(slug, loadPost, { immediate: true })
</script>

<style lang="scss" scoped>
.blog-post-page {
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 24px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 24px;
  gap: 16px;

  p {
    color: var(--text-secondary);
  }
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 24px;
  text-align: center;

  h2 {
    margin: 24px 0 12px;
    font-size: 1.5rem;
  }

  p {
    color: var(--text-secondary);
    margin-bottom: 24px;
  }
}

/* Cover Hero Styles */
.cover-hero {
  position: relative;
  width: 100%;
  height: 400px;
  overflow: hidden;

  @media (min-width: 768px) {
    height: 500px;
  }

  .cover-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }

  .cover-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      transparent 40%,
      rgba(0, 0, 0, 0.3) 70%,
      rgba(0, 0, 0, 0.6) 100%
    );
  }
}

.post-header {
  padding: 80px 0 60px;
  background: var(--bg-elevated);

  &.has-cover {
    margin-top: -120px;
    position: relative;
    z-index: 1;
    border-radius: 24px 24px 0 0;
    max-width: 900px;
    margin-left: auto;
    margin-right: auto;
    padding-top: 48px;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
    text-decoration: none;
    margin-bottom: 24px;
    font-size: 0.9rem;
    transition: color 0.2s;

    &:hover {
      color: var(--primary);
    }
  }

  .post-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 0.875rem;
    margin-bottom: 16px;

    .category {
      color: var(--primary);
      font-weight: 600;
    }

    .date, .read-time {
      color: var(--text-secondary);
    }
  }

  h1 {
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    font-weight: 800;
    line-height: 1.3;
    margin: 0 0 16px;
  }

  .excerpt {
    font-size: 1.125rem;
    color: var(--text-secondary);
    line-height: 1.7;
    margin: 0 0 32px;
  }

  .author {
    display: flex;
    align-items: center;
    gap: 12px;

    .author-avatar {
      width: 48px;
      height: 48px;
      background: var(--bg-subtle);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .author-info {
      display: flex;
      flex-direction: column;

      .author-name {
        font-weight: 600;
      }

      .author-role {
        font-size: 0.875rem;
        color: var(--text-secondary);
      }
    }
  }
}

.post-content {
  padding: 60px 0;

  :deep(.prose) {
    line-height: 1.8;
    color: var(--text-primary);

    h1, h2, h3, h4, h5, h6 {
      font-weight: 700;
      margin: 32px 0 16px;
      line-height: 1.3;
    }

    h1 { font-size: 2rem; }
    h2 { font-size: 1.5rem; border-bottom: 1px solid var(--border-default); padding-bottom: 8px; }
    h3 { font-size: 1.25rem; }
    h4 { font-size: 1.1rem; }

    p {
      margin: 0 0 16px;
    }

    a {
      color: var(--primary);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    ul, ol {
      margin: 0 0 16px;
      padding-left: 24px;

      li {
        margin: 4px 0;
      }
    }

    blockquote {
      margin: 16px 0;
      padding: 12px 20px;
      border-left: 4px solid var(--primary);
      background: rgba(99, 102, 241, 0.05);
      border-radius: 0 8px 8px 0;

      p {
        margin: 0;
      }
    }

    code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875em;
      background: var(--bg-elevated);
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid var(--border-default);
    }

    pre {
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

    .code-block {
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

    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 16px 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;

      th, td {
        padding: 10px 12px;
        border: 1px solid var(--border-default);
        text-align: left;
      }

      th {
        background: var(--bg-elevated);
        font-weight: 600;
      }
    }

    hr {
      border: none;
      height: 1px;
      background: var(--border-default);
      margin: 32px 0;
    }
  }
}

.post-footer {
  padding: 40px 0;
  border-top: 1px solid var(--border-default);

  .share-section {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
    color: var(--text-secondary);

    .share-buttons {
      display: flex;
      gap: 8px;
    }
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    .tag {
      padding: 6px 12px;
      background: var(--bg-elevated);
      border-radius: 20px;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }
  }
}

.related-section {
  padding: 60px 0;
  background: var(--bg-subtle);

  h2 {
    font-size: 1.5rem;
    margin-bottom: 32px;
  }

  .related-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 24px;
  }

  .related-card {
    padding: 24px;
    background: var(--bg-primary);
    border: 1px solid var(--border-default);
    border-radius: 12px;
    text-decoration: none;
    transition: all 0.2s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    }

    .related-category {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    h3 {
      font-size: 1.1rem;
      margin: 8px 0;
      color: var(--text-primary);
    }

    p {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  }
}
</style>
