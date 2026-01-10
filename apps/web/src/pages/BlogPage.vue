<template>
  <q-page class="blog-page">
    <!-- Hero -->
    <section class="page-hero">
      <div class="hero-content">
        <h1>Blog</h1>
        <p>Insights, tutorials, and best practices for modern web development.</p>
      </div>
    </section>

    <!-- Featured Post -->
    <section
      v-if="featuredPost"
      class="featured-section"
    >
      <div class="section-container">
        <article
          class="featured-post"
          @click="goToPost(featuredPost)"
        >
          <div class="featured-image">
            <img
              :src="getPostImage(featuredPost)"
              :alt="featuredPost.title"
            >
          </div>
          <div class="featured-content">
            <q-badge
              color="primary"
              class="featured-badge"
            >
              Featured
            </q-badge>
            <h2>{{ featuredPost.title }}</h2>
            <p>{{ featuredPost.summary }}</p>
            <div class="post-meta">
              <span>{{ formatDate(featuredPost.published_at) }}</span>
              <span>•</span>
              <span>{{ featuredPost.read_time }} min read</span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- Categories -->
    <section class="categories-section">
      <div class="section-container">
        <div class="categories">
          <q-btn
            v-for="cat in categories"
            :key="cat"
            :flat="selectedCategory !== cat"
            :color="selectedCategory === cat ? 'primary' : undefined"
            :label="cat"
            class="category-btn"
            @click="selectedCategory = cat"
          />
        </div>
      </div>
    </section>

    <!-- Posts Grid -->
    <section class="posts-section">
      <div class="section-container">
        <div class="posts-grid">
          <article
            v-for="post in filteredPosts"
            :key="post.id"
            class="post-card"
            @click="goToPost(post)"
          >
            <div class="post-image">
              <img
                :src="getPostImage(post)"
                :alt="post.title"
              >
            </div>
            <div class="post-content">
              <div class="post-category">
                {{ post.category_name }}
              </div>
              <h3>{{ post.title }}</h3>
              <p>{{ post.summary }}</p>
              <div class="post-meta">
                <span>{{ formatDate(post.published_at) }}</span>
                <span>•</span>
                <span>{{ post.read_time }} min read</span>
              </div>
            </div>
          </article>
        </div>

        <!-- Load More -->
        <div
          v-if="hasMorePosts"
          class="load-more"
        >
          <q-btn
            outline
            color="primary"
            label="Load More Posts"
            @click="loadMore"
          />
        </div>
      </div>
    </section>

    <!-- Newsletter -->
    <section class="newsletter-section">
      <div class="section-container">
        <div class="newsletter-content">
          <h2>Stay Updated</h2>
          <p>Get the latest SynthStack news, tutorials, and product updates in your inbox.</p>
          <div class="newsletter-form">
            <q-input
              v-model="email"
              outlined
              dense
              placeholder="Enter your email"
              class="newsletter-input"
            />
            <q-btn
              color="primary"
              label="Subscribe"
            />
          </div>
          <p class="newsletter-note">
            No spam, unsubscribe anytime.
          </p>
        </div>
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBlog, type BlogPost } from '@/composables/useBlog'

const router = useRouter()
const email = ref('')
const selectedCategory = ref('All')
const hasMorePosts = ref(false)

const { posts, categories: apiCategories, loading, error, fetchPosts, fetchCategories, formatDate } = useBlog()

// Fallback data for when API is unavailable
const fallbackPosts: BlogPost[] = [
  {
    id: 'synthstack-complete-architecture-2026',
    title: 'SynthStack: Complete Architecture & Features Deep Dive (2026)',
    summary: 'An exhaustive technical breakdown of every layer: Vue 3 + Quasar frontend, Fastify + Node.js backend, Directus CMS, LangGraph AI agents, Docker orchestration, and 50+ production features.',
    slug: 'synthstack-complete-architecture-2026',
    published_at: '2026-01-15',
    read_time: 18,
    category_name: 'Architecture',
    category_slug: 'architecture',
    featured: true,
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop'
  },
  {
    id: 'what-is-synthstack-2026',
    title: 'What We Built: The Story Behind SynthStack',
    summary: 'From agency pain points to AI-native SaaS boilerplate. How we built a complete "Agency in a Box" with 6 AI co-founders, visual workflows, and everything needed to ship products 10x faster.',
    slug: 'what-is-synthstack-2026',
    published_at: '2026-01-08',
    read_time: 14,
    category_name: 'Product',
    category_slug: 'product',
    featured: false,
    image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=500&fit=crop'
  },
  {
    id: 'agency-in-a-box',
    title: 'Building Your Agency in a Box: The SynthStack Architecture',
    summary: 'A deep dive into how SynthStack combines Vue 3, Fastify, and Directus into a production-ready platform.',
    slug: 'agency-in-a-box',
    published_at: '2024-12-10',
    read_time: 12,
    category_name: 'Architecture',
    category_slug: 'architecture',
    featured: false,
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop'
  },
  {
    id: 'vue3-composition-patterns',
    title: 'Mastering Vue 3 Composition API: Patterns That Scale',
    summary: 'Explore advanced composition patterns, custom composables, and state management strategies.',
    slug: 'vue3-composition-patterns',
    published_at: '2024-12-08',
    read_time: 8,
    category_name: 'Engineering',
    category_slug: 'engineering',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=340&fit=crop'
  },
  {
    id: 'directus-headless-cms',
    title: 'Why We Chose Directus as Our Headless CMS',
    summary: 'The decision framework behind selecting Directus for rapid content modeling.',
    slug: 'directus-headless-cms',
    published_at: '2024-12-05',
    read_time: 6,
    category_name: 'Architecture',
    category_slug: 'architecture',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=340&fit=crop'
  },
  {
    id: 'docker-compose-production',
    title: 'Docker Compose to Production: A Practical Guide',
    summary: 'From local development to production deployment with real-world scaling patterns.',
    slug: 'docker-compose-production',
    published_at: '2024-12-01',
    read_time: 10,
    category_name: 'DevOps',
    category_slug: 'devops',
    image: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=600&h=340&fit=crop'
  },
  {
    id: 'stripe-subscriptions-guide',
    title: 'Implementing Stripe Subscriptions the Right Way',
    summary: 'A complete guide to handling subscriptions, webhooks, and billing edge cases.',
    slug: 'stripe-subscriptions-guide',
    published_at: '2024-11-28',
    read_time: 9,
    category_name: 'Engineering',
    category_slug: 'engineering',
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&h=340&fit=crop'
  },
  {
    id: 'building-for-agencies',
    title: 'Building Products for Digital Agencies: Lessons Learned',
    summary: 'Key insights from building tools that help agencies ship faster.',
    slug: 'building-for-agencies',
    published_at: '2024-11-22',
    read_time: 7,
    category_name: 'Product',
    category_slug: 'product',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=340&fit=crop'
  },
  {
    id: 'introducing-synthstack',
    title: 'Introducing SynthStack: Your Agency in a Box',
    summary: 'A complete platform for building and launching SaaS products in record time.',
    slug: 'introducing-synthstack',
    published_at: '2024-11-15',
    read_time: 4,
    category_name: 'Updates',
    category_slug: 'updates',
    image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=340&fit=crop'
  }
]

const categories = computed(() => {
  const cats = ['All']
  if (apiCategories.value.length > 0) {
    cats.push(...apiCategories.value.map(c => c.name))
  } else {
    cats.push('Engineering', 'Architecture', 'DevOps', 'Product', 'Updates')
  }
  return cats
})

const displayPosts = computed(() => {
  return posts.value.length > 0 ? posts.value : fallbackPosts
})

const featuredPost = computed(() => {
  const allPosts = displayPosts.value
  return allPosts.find(p => p.featured) || allPosts[0]
})

const regularPosts = computed(() => {
  const allPosts = displayPosts.value
  const featured = featuredPost.value
  return allPosts.filter(p => p.id !== featured?.id)
})

const filteredPosts = computed(() => {
  if (selectedCategory.value === 'All') return regularPosts.value
  return regularPosts.value.filter(p => p.category_name === selectedCategory.value)
})

function getPostImage(post: BlogPost): string {
  return post.image || 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=340&fit=crop'
}

function goToPost(post: BlogPost) {
  router.push(`/blog/${post.slug}`)
}

function loadMore() {
  hasMorePosts.value = false
}

onMounted(async () => {
  await Promise.all([fetchPosts(), fetchCategories()])
})
</script>

<style lang="scss" scoped>
.blog-page {
  --section-padding: 80px 24px;
}

.page-hero {
  padding: 120px 24px 60px;
  text-align: center;
  
  h1 {
    font-size: 3rem;
    margin: 0 0 16px;
  }
  
  p {
    font-size: 1.25rem;
    color: var(--color-text-secondary);
    margin: 0;
  }
}

.section-container {
  max-width: 1100px;
  margin: 0 auto;
}

.featured-section {
  padding: 0 24px 60px;
}

.featured-post {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  padding: 32px;
  background: var(--color-bg-secondary);
  border-radius: 24px;
  cursor: pointer;
  transition: transform 0.2s;
  
  &:hover {
    transform: translateY(-4px);
  }
  
  .featured-image {
    aspect-ratio: 16/10;
    background: var(--color-bg-tertiary);
    border-radius: 16px;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
  }

  &:hover .featured-image img {
    transform: scale(1.03);
  }
  
  .featured-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    
    h2 {
      margin: 16px 0;
      font-size: 1.75rem;
    }
    
    p {
      color: var(--color-text-secondary);
      margin: 0 0 16px;
      line-height: 1.7;
    }
    
    .post-meta {
      display: flex;
      gap: 8px;
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }
  }
}

.categories-section {
  padding: 0 24px 40px;
}

.categories {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.posts-section {
  padding: 0 24px 80px;
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.post-card {
  background: var(--color-bg-secondary);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
  
  &:hover {
    transform: translateY(-4px);
  }
  
  .post-image {
    aspect-ratio: 16/9;
    background: var(--color-bg-tertiary);
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
  }

  &:hover .post-image img {
    transform: scale(1.05);
  }
  
  .post-content {
    padding: 20px;
    
    .post-category {
      font-size: 0.75rem;
      color: var(--q-primary);
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    
    h3 {
      margin: 0 0 8px;
      font-size: 1.125rem;
    }
    
    p {
      margin: 0 0 12px;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .post-meta {
      display: flex;
      gap: 8px;
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
  }
}

.load-more {
  text-align: center;
  margin-top: 40px;
}

.newsletter-section {
  padding: var(--section-padding);
  background: var(--color-bg-secondary);
}

.newsletter-content {
  max-width: 500px;
  margin: 0 auto;
  text-align: center;
  
  h2 {
    margin: 0 0 12px;
    font-size: 1.75rem;
  }
  
  p {
    color: var(--color-text-secondary);
    margin: 0 0 24px;
  }
}

.newsletter-form {
  display: flex;
  gap: 12px;
  
  .newsletter-input {
    flex: 1;
  }
}

.newsletter-note {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 12px !important;
}

@media (max-width: 900px) {
  .featured-post {
    grid-template-columns: 1fr;
  }
  
  .posts-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .posts-grid {
    grid-template-columns: 1fr;
  }
  
  .newsletter-form {
    flex-direction: column;
  }
}
</style>
