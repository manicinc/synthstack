<template>
  <section
    class="features-section"
    aria-labelledby="features-title"
  >
    <div class="section-container">
      <header class="section-header">
        <h2 id="features-title">
          {{ t('landing.featuresGrid.title') }}
        </h2>
        <p>{{ t('landing.featuresGrid.subtitle') }}</p>
      </header>

      <div class="features-grid">
        <InteractiveFeatureCard
          v-for="(feature, index) in features"
          :key="feature.id"
          :feature="feature"
          :index="index"
        />
      </div>

      <!-- Additional Features Banner -->
      <div class="more-features">
        <div class="more-feature">
          <q-icon
            name="smartphone"
            size="20px"
            color="primary"
          />
          <span>{{ t('landing.featuresGrid.moreFeatures.crossPlatform') }}</span>
        </div>
        <div class="more-feature">
          <q-icon
            name="code"
            size="20px"
            color="primary"
          />
          <span>{{ t('landing.featuresGrid.moreFeatures.typescript') }}</span>
        </div>
        <div class="more-feature">
          <q-icon
            name="cloud"
            size="20px"
            color="primary"
          />
          <span>{{ t('landing.featuresGrid.moreFeatures.docker') }}</span>
        </div>
        <div class="more-feature">
          <q-icon
            name="menu_book"
            size="20px"
            color="primary"
          />
          <span>{{ t('landing.featuresGrid.moreFeatures.docs') }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import InteractiveFeatureCard from './InteractiveFeatureCard.vue'

const { t } = useI18n()

interface Feature {
  id: string
  title: string
  description: string
  icon: string
  color: string
  tags: string[]
  featured?: boolean
  preview?: 'dag' | 'code' | 'chart' | null
  link?: string
  badge?: string
}

const features = computed<Feature[]>(() => [
  {
    id: 'workflows',
    title: t('landing.featuresGrid.items.workflows.title'),
    description: t('landing.featuresGrid.items.workflows.description'),
    icon: 'account_tree',
    color: '#6366f1',
    tags: ['LangGraph', 'DAG', 'Node-RED', '15+ Integrations'],
    featured: true,
    preview: 'dag',
    badge: 'NEW'
  },
  {
    id: 'ai-agents',
    title: t('landing.featuresGrid.items.aiAgents.title'),
    description: t('landing.featuresGrid.items.aiAgents.description'),
    icon: 'psychology',
    color: '#8b5cf6',
    tags: ['RAG', 'No-Code', 'LangGraph', 'Instant'],
    featured: true,
    preview: null
  },
  {
    id: 'web-search',
    title: t('landing.featuresGrid.items.webSearch.title'),
    description: t('landing.featuresGrid.items.webSearch.description'),
    icon: 'travel_explore',
    color: '#0ea5e9',
    tags: ['Real-Time', 'SERP', 'AI'],
    badge: 'AI'
  },
  {
    id: 'orchestration',
    title: t('landing.featuresGrid.items.orchestration.title'),
    description: t('landing.featuresGrid.items.orchestration.description'),
    icon: 'hub',
    color: '#8b5cf6',
    tags: ['LangGraph', 'DAG', 'AI'],
    badge: 'AI'
  },
  {
    id: 'auth',
    title: t('landing.featuresGrid.items.auth.title'),
    description: t('landing.featuresGrid.items.auth.description'),
    icon: 'verified_user',
    color: '#3ecf8e',
    tags: ['OAuth', 'JWT', 'RBAC'],
    link: '/docs/authentication'
  },
  {
    id: 'self-hosted',
    title: t('landing.featuresGrid.items.selfHosted.title'),
    description: t('landing.featuresGrid.items.selfHosted.description'),
    icon: 'database',
    color: '#336791',
    tags: ['No Lock-in', 'Data Control'],
    link: '/docs/authentication'
  },
  {
    id: 'stripe',
    title: t('landing.featuresGrid.items.stripe.title'),
    description: t('landing.featuresGrid.items.stripe.description'),
    icon: 'credit_card',
    color: '#635bff',
    tags: ['Subscriptions', 'Lifetime', 'Webhooks']
  },
  {
    id: 'directus',
    title: t('landing.featuresGrid.items.directus.title'),
    description: t('landing.featuresGrid.items.directus.description'),
    icon: 'dashboard_customize',
    color: '#6366f1',
    tags: ['Visual Editor', 'Real-Time', 'Versioning']
  },
  {
    id: 'visual-editing',
    title: t('landing.featuresGrid.items.visualEditing.title'),
    description: t('landing.featuresGrid.items.visualEditing.description'),
    icon: 'edit_note',
    color: '#6366f1',
    tags: ['WYSIWYG', 'In-Context']
  },
  {
    id: 'collaboration',
    title: t('landing.featuresGrid.items.collaboration.title'),
    description: t('landing.featuresGrid.items.collaboration.description'),
    icon: 'group',
    color: '#10b981',
    tags: ['Multi-User', 'Field Lock']
  },
  {
    id: 'versioning',
    title: t('landing.featuresGrid.items.versioning.title'),
    description: t('landing.featuresGrid.items.versioning.description'),
    icon: 'history',
    color: '#f59e0b',
    tags: ['History', 'Restore']
  },
  {
    id: 'analytics',
    title: t('landing.featuresGrid.items.analytics.title'),
    description: t('landing.featuresGrid.items.analytics.description'),
    icon: 'analytics',
    color: '#f59e0b',
    tags: ['Charts', 'Events', 'Export']
  },
  {
    id: 'newsletter',
    title: t('landing.featuresGrid.items.newsletter.title'),
    description: t('landing.featuresGrid.items.newsletter.description'),
    icon: 'mail',
    color: '#ef4444',
    tags: ['Campaigns', 'Templates']
  },
  {
    id: 'blog',
    title: t('landing.featuresGrid.items.blog.title'),
    description: t('landing.featuresGrid.items.blog.description'),
    icon: 'article',
    color: '#10b981',
    tags: ['SEO', 'Markdown', 'RSS']
  },
  {
    id: 'seo-audit',
    title: t('landing.featuresGrid.items.seoAudit.title'),
    description: t('landing.featuresGrid.items.seoAudit.description'),
    icon: 'travel_explore',
    color: '#0ea5e9',
    tags: ['AI Keywords', 'Lighthouse', 'Core Web Vitals'],
    badge: 'NEW'
  },
  {
    id: 'theming',
    title: t('landing.featuresGrid.items.theming.title'),
    description: t('landing.featuresGrid.items.theming.description'),
    icon: 'palette',
    color: '#8b5cf6',
    tags: ['10 Presets', '60+ Variables', 'Real-Time']
  },
  {
    id: 'referral',
    title: t('landing.featuresGrid.items.referral.title'),
    description: t('landing.featuresGrid.items.referral.description'),
    icon: 'group_add',
    color: '#ec4899',
    tags: ['Rewards', 'Discounts']
  },
  {
    id: 'integrations',
    title: t('landing.featuresGrid.items.integrations.title'),
    description: t('landing.featuresGrid.items.integrations.description'),
    icon: 'extension',
    color: '#00d4aa',
    tags: ['Slack', 'GitHub', 'Notion', 'BYOK'],
    badge: 'NEW'
  },
  {
    id: 'knowledge-base',
    title: t('landing.featuresGrid.items.knowledgeBase.title'),
    description: t('landing.featuresGrid.items.knowledgeBase.description'),
    icon: 'auto_stories',
    color: '#3b82f6',
    tags: ['RAG', 'Embeddings', 'AI'],
  }
])
</script>

<style lang="scss" scoped>
.features-section {
  padding: 100px 24px;
  background: linear-gradient(
    180deg,
    var(--bg-base) 0%,
    rgba(99, 102, 241, 0.03) 50%,
    var(--bg-base) 100%
  );
  position: relative;
  overflow: hidden;

  // Subtle grid background
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(to right, rgba(99, 102, 241, 0.02) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(99, 102, 241, 0.02) 1px, transparent 1px);
    background-size: 60px 60px;
    pointer-events: none;
  }
}

.section-container {
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
}

.section-header {
  text-align: center;
  margin-bottom: 60px;

  h2 {
    font-size: clamp(2rem, 5vw, 2.75rem);
    font-weight: 800;
    margin: 0 0 16px;
    background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.8) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  p {
    font-size: 1.125rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.more-features {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 32px;
  margin-top: 60px;
  padding: 28px 40px;
  background: rgba(15, 15, 35, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
    align-items: center;
    padding: 24px;
  }
}

.more-feature {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
  transition: color 0.3s ease;

  &:hover {
    color: #fff;

    .q-icon {
      transform: scale(1.1);
    }
  }

  .q-icon {
    transition: transform 0.3s ease;
  }
}

// Light mode
:global(.body--light) {
  .features-section {
    background: linear-gradient(
      180deg,
      #ffffff 0%,
      rgba(99, 102, 241, 0.04) 50%,
      #ffffff 100%
    );

    &::before {
      background-image:
        linear-gradient(to right, rgba(99, 102, 241, 0.04) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(99, 102, 241, 0.04) 1px, transparent 1px);
    }
  }

  .section-header h2 {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .section-header p {
    color: #475569;
  }

  .more-features {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(0, 0, 0, 0.08);
  }

  .more-feature {
    color: #475569;

    &:hover {
      color: #1e293b;
    }
  }
}
</style>
